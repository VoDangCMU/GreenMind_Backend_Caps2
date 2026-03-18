import { Request, Response } from "express";
import AppDataSource from "../../infrastructure/database";
import { Metrics } from "../../entity/metrics";
import { AvgDailySpend } from "../../entity/daily_spend";
import { User } from "../../entity/user";
import { BigFive } from "../../entity/big_five";
import { BehaviorFeedback } from "../../entity/behavior_feedback";
import axios from "axios";
import { z } from "zod";
import { verifySurveyAndSaveFeedback } from "../../utils/verifySurveyHelper";

const MetricsRepo = AppDataSource.getRepository(Metrics);
const DailySpendRepo = AppDataSource.getRepository(AvgDailySpend);
const UserRepo = AppDataSource.getRepository(User);
const BigFiveRepo = AppDataSource.getRepository(BigFive);
const BehaviorFeedbackRepo = AppDataSource.getRepository(BehaviorFeedback);

const API_URL = "https://ai-greenmind.khoav4.com/avg_daily_spend";

const DEFAULTS = {
    weight: 0.2,
    sigma_r: 1.0,
    alpha: 0.5,
    direction: "down"
};

const AnalyzeRequestSchema = z.object({
    daily_total: z.number(),
    base_avg: z.number(),
    weight: z.number(),
    direction: z.string(),
    sigma_r: z.number(),
    alpha: z.number(),
    ocean_score: z.object({
        O: z.number(),
        C: z.number(),
        E: z.number(),
        A: z.number(),
        N: z.number(),
    })
});

const AnalyzeResponseSchema = z.object({
    metric: z.string(),
    vt: z.number(),
    bt: z.number(),
    r: z.number(),
    n: z.number(),
    contrib: z.number(),
    new_ocean_score: z.object({
        O: z.number(),
        C: z.number(),
        E: z.number(),
        A: z.number(),
        N: z.number(),
    }),
    mechanismFeedback: z.object({
        awareness: z.string(),
        motivation: z.string(),
        capability: z.string(),
        opportunity: z.string(),
    }).optional(),
    reason: z.string().optional()
});

class AverageDailySpendController {
    public getAvgDailySpend = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }


            // Tìm metric avg_daily_spend của user
            const metricRecord = await MetricsRepo.findOne({
                where: {
                    userId: userId,
                    type: "avg_daily_spend"
                }
            });

            if (!metricRecord) {
                return res.status(404).json({
                    error: "No avg_daily_spend metric found for this user"
                });
            }

            // Lấy big_five hiện tại của user
            const user = await UserRepo.findOne({
                where: { id: userId },
                relations: {
                    bigFive: true
                }
            });

            if (!user || !user.bigFive) {
                return res.status(404).json({
                    error: "User or big five data not found"
                });
            }

            const response = {
                metric: "avg_daily_spend",
                vt: metricRecord.vt,
                bt: metricRecord.bt,
                r: metricRecord.r,
                n: metricRecord.n,
                contrib: metricRecord.contrib || 0,
                new_ocean_score: {
                    O: user.bigFive.openness,
                    C: user.bigFive.conscientiousness,
                    E: user.bigFive.extraversion,
                    A: user.bigFive.agreeableness,
                    N: user.bigFive.neuroticism
                },
                mechanismFeedback: metricRecord.metadata?.mechanismFeedback || null,
                reason: metricRecord.metadata?.reason || null
            };


            return res.status(200).json(response);

        } catch (e) {
            return res.status(500).json({
                error: "Failed to get avg_daily_spend metric",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };

    public updateAvgSpend = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }


            // Validate request body
            const parsed = AnalyzeRequestSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    error: "Invalid parameters",
                    details: parsed.error.errors
                });
            }

            const requestData = parsed.data;

            // Get user
            const user = await UserRepo.findOne({
                where: { id: userId },
                relations: {
                    bigFive: true
                }
            });

            if (!user) {
                return res.status(404).json({
                    error: "User not found"
                });
            }

            // Kiểm tra big_five
            if (!user.bigFive) {
                return res.status(404).json({
                    error: "User does not have big five data"
                });
            }

            // Lưu previous OCEAN score trước khi cập nhật
            const previousOceanScore = {
                O: user.bigFive.openness,
                C: user.bigFive.conscientiousness,
                E: user.bigFive.extraversion,
                A: user.bigFive.agreeableness,
                N: user.bigFive.neuroticism
            };

            // Call external API with the exact request format

            const apiResponse = await axios.post(API_URL, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (apiResponse.status !== 200) {
                return res.status(apiResponse.status).json({
                    error: "Avg daily spend calculation failed",
                    details: apiResponse.data
                });
            }

            const apiResult = AnalyzeResponseSchema.safeParse(apiResponse.data);

            if (!apiResult.success) {
                return res.status(500).json({
                    error: "Invalid response from API",
                    details: apiResult.error.errors
                });
            }

            const result = apiResult.data;

            // Update or create BigFive
            let bigFive = user.bigFive;
            if (!bigFive) {
                bigFive = new BigFive();
                bigFive.user = user;
            }

            bigFive.openness = result.new_ocean_score.O;
            bigFive.conscientiousness = result.new_ocean_score.C;
            bigFive.extraversion = result.new_ocean_score.E;
            bigFive.agreeableness = result.new_ocean_score.A;
            bigFive.neuroticism = result.new_ocean_score.N;

            await BigFiveRepo.save(bigFive);


            // Update or create Metrics record
            let metricRecord = await MetricsRepo.findOne({
                where: {
                    userId: userId,
                    type: "avg_daily_spend"
                }
            });

            if (metricRecord) {
                metricRecord.vt = result.vt;
                metricRecord.bt = result.bt;
                metricRecord.r = result.r;
                metricRecord.n = result.n;
                metricRecord.contrib = result.contrib;
                metricRecord.metadata = {
                    daily_total: requestData.daily_total,
                    base_avg: requestData.base_avg,
                    direction: requestData.direction,
                    mechanismFeedback: result.mechanismFeedback,
                    reason: result.reason
                };
            } else {
                metricRecord = MetricsRepo.create({
                    userId: userId,
                    type: "avg_daily_spend",
                    vt: result.vt,
                    bt: result.bt,
                    r: result.r,
                    n: result.n,
                    contrib: result.contrib,
                    metadata: {
                        daily_total: requestData.daily_total,
                        base_avg: requestData.base_avg,
                        direction: requestData.direction,
                        mechanismFeedback: result.mechanismFeedback,
                        reason: result.reason
                    }
                });
            }

            await MetricsRepo.save(metricRecord);


            // Save feedback to behavior_feedbacks table
            if (result.mechanismFeedback) {
                const behaviorFeedback = BehaviorFeedbackRepo.create({
                    userId: userId,
                    metric: "avg_daily_spend",
                    vt: result.vt,
                    bt: result.bt,
                    r: result.r,
                    n: result.n,
                    contrib: result.contrib,
                    mechanismFeedback: result.mechanismFeedback,
                    reason: result.reason,
                    oceanScore: result.new_ocean_score
                });

                await BehaviorFeedbackRepo.save(behaviorFeedback);
            }

            // Gọi verify-survey API với OCEAN score mới và lưu feedback
            const verifySurveyResult = await verifySurveyAndSaveFeedback(
                userId,
                result.new_ocean_score,
                "avg_daily_spend",
                previousOceanScore
            );

            // Return the exact format as received from API
            return res.status(200).json({
                ...result,
                verifySurvey: verifySurveyResult || null
            });

        } catch (e) {
            if (axios.isAxiosError(e)) {
                return res.status(e.response?.status || 500).json({
                    error: "Failed to calculate avg daily spend",
                    details: e.response?.data || e.message
                });
            }

            return res.status(500).json({
                error: "Failed to update avg daily spend",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };

    public updateAvgSpendFromHistory = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }


            // Get user
            const user = await UserRepo.findOne({
                where: { id: userId },
                relations: {
                    bigFive: true
                }
            });

            if (!user) {
                return res.status(404).json({
                    error: "User not found"
                });
            }

            // Get daily spend records
            const dailySpendRecords = await DailySpendRepo.find({
                where: {
                    user: { id: userId }
                },
                order: {
                    day_spend: "DESC"
                }
            });

            if (dailySpendRecords.length === 0) {
                return res.status(404).json({
                    error: "No daily spend records found for this user"
                });
            }

            // Tìm metric hiện tại
            let metricRecord = await MetricsRepo.findOne({
                where: {
                    userId: userId,
                    type: "avg_daily_spend"
                }
            });

            // Lấy ngày mới nhất
            const latestRecord = dailySpendRecords[0];
            const latestDate = new Date(latestRecord.day_spend).toISOString().split('T')[0];
            const latestTotalSpend = latestRecord.total_spend || 0;

            let totalSpend: number;
            let totalDays: number;

            if (metricRecord && metricRecord.metadata) {
                // Có metric rồi, kiểm tra last_day_spend
                const lastDaySpend = metricRecord.metadata.last_day_spend;

                if (lastDaySpend === latestDate) {
                    // Ngày trùng, không cần cập nhật

                    // Return current metric data in proper format
                    if (!user.bigFive) {
                        return res.status(404).json({
                            error: "User big five data not found"
                        });
                    }

                    return res.status(200).json({
                        metric: "avg_daily_spend",
                        vt: metricRecord.vt,
                        bt: metricRecord.bt,
                        r: metricRecord.r,
                        n: metricRecord.n,
                        contrib: metricRecord.contrib || 0,
                        new_ocean_score: {
                            O: user.bigFive.openness,
                            C: user.bigFive.conscientiousness,
                            E: user.bigFive.extraversion,
                            A: user.bigFive.agreeableness,
                            N: user.bigFive.neuroticism
                        },
                        mechanismFeedback: metricRecord.metadata?.mechanismFeedback || null,
                        reason: metricRecord.metadata?.reason || null
                    });
                } else {
                    // Ngày khác, cập nhật
                    totalSpend = (metricRecord.metadata.total_spend || 0) + latestTotalSpend;
                    totalDays = (metricRecord.metadata.day_spend || 0) + 1;
                }
            } else {
                // Chưa có metric, tính từ đầu
                totalSpend = dailySpendRecords.reduce((sum, record) => {
                    return sum + (record.total_spend || 0);
                }, 0);
                totalDays = dailySpendRecords.length;
            }

            // Tính avg spend
            const avgSpend = totalSpend / totalDays;

            // Kiểm tra big_five
            if (!user.bigFive) {
                return res.status(404).json({
                    error: "User does not have big five data"
                });
            }

            // Lưu previous OCEAN score trước khi cập nhật
            const previousOceanScore = {
                O: user.bigFive.openness,
                C: user.bigFive.conscientiousness,
                E: user.bigFive.extraversion,
                A: user.bigFive.agreeableness,
                N: user.bigFive.neuroticism
            };

            const direction = latestTotalSpend > avgSpend ? "up" : "down";

            // Gọi API để tính toán metrics mới
            const apiPayload = {
                daily_total: latestTotalSpend,
                base_avg: avgSpend,
                weight: DEFAULTS.weight,
                direction: direction,
                sigma_r: DEFAULTS.sigma_r,
                alpha: DEFAULTS.alpha,
                ocean_score: {
                    O: user.bigFive.openness,
                    C: user.bigFive.conscientiousness,
                    E: user.bigFive.extraversion,
                    A: user.bigFive.agreeableness,
                    N: user.bigFive.neuroticism
                }
            };


            const response = await axios.post(API_URL, apiPayload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.status !== 200) {
                return res.status(response.status).json({
                    error: "API call failed",
                    details: response.data
                });
            }

            const parsed = AnalyzeResponseSchema.safeParse(response.data);

            if (!parsed.success) {
                return res.status(500).json({
                    error: "Invalid API response",
                    details: parsed.error.errors
                });
            }

            const apiResult = parsed.data;

            // Cập nhật Big Five
            const newBigFive = new BigFive();
            newBigFive.openness = apiResult.new_ocean_score.O;
            newBigFive.conscientiousness = apiResult.new_ocean_score.C;
            newBigFive.extraversion = apiResult.new_ocean_score.E;
            newBigFive.agreeableness = apiResult.new_ocean_score.A;
            newBigFive.neuroticism = apiResult.new_ocean_score.N;
            await BigFiveRepo.save(newBigFive);

            user.bigFive = newBigFive;
            await UserRepo.save(user);


            // Update or create Metrics record
            if (metricRecord) {
                metricRecord.vt = apiResult.vt;
                metricRecord.bt = apiResult.bt;
                metricRecord.r = apiResult.r;
                metricRecord.n = apiResult.n;
                metricRecord.contrib = apiResult.contrib;
                metricRecord.metadata = {
                    base_avg: avgSpend,
                    total_spend: totalSpend,
                    day_spend: totalDays,
                    last_day_spend: latestDate,
                    mechanismFeedback: apiResult.mechanismFeedback,
                    reason: apiResult.reason
                };
                await MetricsRepo.save(metricRecord);

            } else {
                metricRecord = MetricsRepo.create({
                    userId: userId,
                    type: "avg_daily_spend",
                    vt: apiResult.vt,
                    bt: apiResult.bt,
                    r: apiResult.r,
                    n: apiResult.n,
                    contrib: apiResult.contrib,
                    metadata: {
                        base_avg: avgSpend,
                        total_spend: totalSpend,
                        day_spend: totalDays,
                        last_day_spend: latestDate,
                        mechanismFeedback: apiResult.mechanismFeedback,
                        reason: apiResult.reason
                    }
                });
                await MetricsRepo.save(metricRecord);

            }

            // Save feedback to behavior_feedbacks table (không lưu oceanScore nữa)
            if (apiResult.mechanismFeedback) {
                const behaviorFeedback = BehaviorFeedbackRepo.create({
                    userId: userId,
                    metric: "avg_daily_spend",
                    vt: apiResult.vt,
                    bt: apiResult.bt,
                    r: apiResult.r,
                    n: apiResult.n,
                    contrib: apiResult.contrib,
                    mechanismFeedback: apiResult.mechanismFeedback,
                    reason: apiResult.reason
                });

                await BehaviorFeedbackRepo.save(behaviorFeedback);
            }
            // Gọi verify-survey API với OCEAN score mới và lưu feedback
            // (Helper sẽ cập nhật BigFive cho user và segment)
            const verifySurveyResult = await verifySurveyAndSaveFeedback(
                userId,
                apiResult.new_ocean_score,
                "avg_daily_spend",
                previousOceanScore
            );


            // Return the proper format matching other metrics
            return res.status(200).json({
                metric: apiResult.metric,
                vt: apiResult.vt,
                bt: apiResult.bt,
                r: apiResult.r,
                n: apiResult.n,
                contrib: apiResult.contrib,
                new_ocean_score: apiResult.new_ocean_score,
                mechanismFeedback: apiResult.mechanismFeedback || null,
                reason: apiResult.reason || null,
                verifySurvey: verifySurveyResult || null
            });

        } catch (e) {
            if (axios.isAxiosError(e)) {
                return res.status(e.response?.status || 500).json({
                    error: "Failed to process avg daily spend",
                    details: e.response?.data || e.message
                });
            }

            return res.status(500).json({
                error: "Failed to update avg spend",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };
}

export default new AverageDailySpendController();
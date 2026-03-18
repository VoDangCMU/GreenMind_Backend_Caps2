import { Request, Response } from 'express';
import { z } from 'zod';
import AppDataSource from '../../infrastructure/database';
import { BigFive } from '../../entity/big_five';
import { Metrics } from '../../entity/metrics';
import { User } from '../../entity/user';
import { BehaviorFeedback } from '../../entity/behavior_feedback';
import { AvgDailySpend } from '../../entity/daily_spend';
import axios from 'axios';
import { verifySurveyAndSaveFeedback } from '../../utils/verifySurveyHelper';
import { findMatchingModel } from '../../utils/modelMatcher';

const BigFiveRepository = AppDataSource.getRepository(BigFive);
const MetricsRepository = AppDataSource.getRepository(Metrics);
const UserRepository = AppDataSource.getRepository(User);
const BehaviorFeedbackRepository = AppDataSource.getRepository(BehaviorFeedback);
const DailySpendRepository = AppDataSource.getRepository(AvgDailySpend);

const API_URL = "https://ai-greenmind.khoav4.com/spend_variability";

const DEFAULTS = {
    base_likert: 3,
    weight: 0.2,
    sigma_r: 1.0,
    alpha: 0.5
};

const SpendVariabilityRequestSchema = z.object({
    daily_spend: z.array(z.number()),
    base_likert: z.number(),
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

class SpendVariabilityController {
    public getSpendVariability = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }


            // Lấy ngày hiện tại
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayString = today.toISOString().split('T')[0];

            // Tìm metric spend_variability của user
            let metricRecord = await MetricsRepository.findOne({
                where: {
                    userId: userId,
                    type: "spend_variability"
                }
            });

            // Kiểm tra nếu đã có metric và last_day là hôm nay
            if (metricRecord && metricRecord.metadata && metricRecord.metadata.last_day === todayString) {

                // Lấy big_five hiện tại của user
                const user = await UserRepository.findOne({
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
                    metric: "spend_variability",
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
                    }
                };

                return res.status(200).json(response);
            }

            // Nếu chưa có hoặc cần cập nhật

            // Lấy 7 ngày gần nhất của daily_spend
            const dailySpendRecords = await DailySpendRepository.find({
                where: {
                    user: { id: userId }
                },
                order: {
                    day_spend: "DESC"
                },
                take: 7
            });

            if (dailySpendRecords.length === 0) {
                return res.status(404).json({
                    error: "No daily spend records found for this user"
                });
            }

            // Lấy total_spend của 7 ngày (đảo ngược để có thứ tự từ cũ đến mới)
            const dailySpendArray = dailySpendRecords.reverse().map(record => record.total_spend);

            // Xác định direction: so sánh ngày đầu và ngày cuối
            const direction = dailySpendArray[0] < dailySpendArray[dailySpendArray.length - 1] ? "up" : "down";


            // Lấy big_five của user
            const user = await UserRepository.findOne({
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

            // Gọi API external
            const apiPayload = {
                daily_spend: dailySpendArray,
                base_likert: DEFAULTS.base_likert,
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
                return res.status(500).json({
                    error: "Spend variability calculation failed",
                    details: response.data
                });
            }

            const apiResult = AnalyzeResponseSchema.safeParse(response.data);

            if (!apiResult.success) {
                return res.status(500).json({
                    error: "Invalid response from API",
                    details: apiResult.error.errors
                });
            }

            const result = apiResult.data;

            // Cập nhật Big Five
            const newBigFive = new BigFive();
            newBigFive.openness = result.new_ocean_score.O;
            newBigFive.conscientiousness = result.new_ocean_score.C;
            newBigFive.extraversion = result.new_ocean_score.E;
            newBigFive.agreeableness = result.new_ocean_score.A;
            newBigFive.neuroticism = result.new_ocean_score.N;
            await BigFiveRepository.save(newBigFive);

            // Cập nhật user với big five mới
            user.bigFive = newBigFive;
            await UserRepository.save(user);

            // Cập nhật hoặc tạo metric
            if (metricRecord) {
                metricRecord.vt = result.vt;
                metricRecord.bt = result.bt;
                metricRecord.r = result.r;
                metricRecord.n = result.n;
                metricRecord.contrib = result.contrib;
                metricRecord.metadata = {
                    daily_spend: dailySpendArray,
                    last_day: todayString
                };
                await MetricsRepository.save(metricRecord);

            } else {
                metricRecord = MetricsRepository.create({
                    userId: userId,
                    type: "spend_variability",
                    vt: result.vt,
                    bt: result.bt,
                    r: result.r,
                    n: result.n,
                    contrib: result.contrib,
                    metadata: {
                        daily_spend: dailySpendArray,
                        last_day: todayString
                    }
                });
                await MetricsRepository.save(metricRecord);

            }

            // Trả về response
            const finalResponse = {
                metric: "spend_variability",
                vt: result.vt,
                bt: result.bt,
                r: result.r,
                n: result.n,
                contrib: result.contrib,
                new_ocean_score: result.new_ocean_score
            };


            return res.status(200).json(finalResponse);

        } catch (e) {
            return res.status(500).json({
                error: "Failed to get spend variability",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };

    public updateSpendVariability = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }


            // Validate request body
            const parsed = SpendVariabilityRequestSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    error: "Invalid parameters",
                    details: parsed.error.errors
                });
            }

            const requestData = parsed.data;

            // Call external API with the exact request format

            const apiResponse = await axios.post(API_URL, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (apiResponse.status !== 200) {
                return res.status(apiResponse.status).json({
                    error: "Spend variability calculation failed",
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

            // Update BigFive with new ocean scores
            const user = await UserRepository.findOne({
                where: { id: userId },
                relations: { bigFive: true }
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // Lưu previous OCEAN score trước khi cập nhật
            const previousOceanScore = user.bigFive ? {
                O: user.bigFive.openness,
                C: user.bigFive.conscientiousness,
                E: user.bigFive.extraversion,
                A: user.bigFive.agreeableness,
                N: user.bigFive.neuroticism
            } : null;

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

            await BigFiveRepository.save(bigFive);


            // Update or create Metrics record
            let metricRecord = await MetricsRepository.findOne({
                where: {
                    userId: userId,
                    type: "spend_variability"
                }
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayString = today.toISOString().split('T')[0];

            if (metricRecord) {
                metricRecord.vt = result.vt;
                metricRecord.bt = result.bt;
                metricRecord.r = result.r;
                metricRecord.n = result.n;
                metricRecord.contrib = result.contrib;
                metricRecord.metadata = {
                    daily_spend: requestData.daily_spend,
                    base_likert: requestData.base_likert,
                    direction: requestData.direction,
                    last_day: todayString,
                    mechanismFeedback: result.mechanismFeedback,
                    reason: result.reason
                };
            } else {
                metricRecord = MetricsRepository.create({
                    userId: userId,
                    type: "spend_variability",
                    vt: result.vt,
                    bt: result.bt,
                    r: result.r,
                    n: result.n,
                    contrib: result.contrib,
                    metadata: {
                        daily_spend: requestData.daily_spend,
                        base_likert: requestData.base_likert,
                        direction: requestData.direction,
                        last_day: todayString,
                        mechanismFeedback: result.mechanismFeedback,
                        reason: result.reason
                    }
                });
            }

            await MetricsRepository.save(metricRecord);


            // Save feedback to behavior_feedbacks table (không lưu oceanScore nữa)
            if (result.mechanismFeedback) {
                // Tự động tìm model phù hợp với user
                const matchingModel = await findMatchingModel(userId);
                const modelId = matchingModel?.id;

                const behaviorFeedback = BehaviorFeedbackRepository.create({
                    userId: userId,
                    modelId: modelId || undefined,
                    metric: "spend_variability",
                    vt: result.vt,
                    bt: result.bt,
                    r: result.r,
                    n: result.n,
                    contrib: result.contrib,
                    mechanismFeedback: result.mechanismFeedback,
                    reason: result.reason,
                    oceanScore: result.new_ocean_score
                });

                await BehaviorFeedbackRepository.save(behaviorFeedback);
            }

            // Gọi verify-survey API với OCEAN score mới và lưu feedback
            // (Helper sẽ cập nhật BigFive cho user và segment)
            const verifySurveyResult = await verifySurveyAndSaveFeedback(
                userId,
                result.new_ocean_score,
                "spend_variability",
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
                    error: "Failed to calculate spend variability",
                    details: e.response?.data || e.message
                });
            }

            return res.status(500).json({
                error: "Failed to update spend variability",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };
}

export default new SpendVariabilityController();
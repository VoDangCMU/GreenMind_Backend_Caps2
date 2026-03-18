import { Request, Response } from "express";
import { z } from "zod";
import axios from "axios";

import AppDataSource from "../infrastructure/database";
import { AvgDailySpend } from "../entity/daily_spend";
import { BigFive } from "../entity/big_five";
import { Metrics } from "../entity/metrics";
import { User } from "../entity/user";

const DailySpendingRepo = AppDataSource.getRepository(AvgDailySpend);
const UserRepo = AppDataSource.getRepository(User);
const BigFiveRepo = AppDataSource.getRepository(BigFive);
const MetricsRepo = AppDataSource.getRepository(Metrics);

const DEFAULTS = {
    weight: 0.2,
    direction: "down",
    sigma_r: 1.0,
    alpha: 0.5,
};

const AI_API_URL = "https://ai-greenmind.khoav4.com";

const CreateOrUpdateSpendSchema = z.object({
    spend: z.number(),
    date: z.string().date().optional(),
});

const CreateOrUpdateAverageDailySchema = z.object({
    daily_total: z.number(),
    base_avg: z.number(),
});

export class DailySpendingController {
    public CreateOrUpdateSpend = async (req: Request, res: Response) => {
        try {

            const parsed = CreateOrUpdateSpendSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ error: "Invalid parameters", details: parsed.error.errors });
            }

            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const user = await UserRepo.findOne({
                where: { id: userId }
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            const targetDate = parsed.data.date ? new Date(parsed.data.date) : new Date();
            targetDate.setHours(0, 0, 0, 0);

            const spendAmount = parsed.data.spend;

            let dailySpendRecord = await DailySpendingRepo.findOne({
                where: {
                    user: { id: userId },
                    day_spend: targetDate
                }
            });

            if (dailySpendRecord) {
                // Cập nhật: cộng thêm vào total_spend hiện tại
                dailySpendRecord.total_spend += spendAmount;

                const saved = await DailySpendingRepo.save(dailySpendRecord);


                return res.status(200).json({
                    success: true,
                    message: "Spend updated successfully",
                    data: saved
                });
            } else {
                // Tạo mới
                const newRecord = DailySpendingRepo.create({
                    user: user,
                    total_spend: spendAmount,
                    day_spend: targetDate
                });

                const saved = await DailySpendingRepo.save(newRecord);


                return res.status(200).json({
                    success: true,
                    message: "Spend created successfully",
                    data: saved
                });
            }

        } catch (e) {
            return res.status(400).json({
                error: "Failed to create or update spend",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };

    public createOrUpdateAverageDaily = async (req: Request, res: Response) => {
        try {

            const parsed = CreateOrUpdateAverageDailySchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    error: "Invalid parameters",
                    details: parsed.error.errors
                });
            }

            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const { daily_total, base_avg } = parsed.data;

            // Get user's BigFive scores
            const bigFive = await BigFiveRepo.findOne({
                where: { user: { id: userId } }
            });

            if (!bigFive) {
                return res.status(404).json({ error: "BigFive scores not found for user" });
            }

            // Prepare ocean_score
            const ocean_score = {
                O: bigFive.openness,
                C: bigFive.conscientiousness,
                E: bigFive.extraversion,
                A: bigFive.agreeableness,
                N: bigFive.neuroticism
            };

            // Prepare request payload for AI API
            const apiPayload = {
                daily_total,
                base_avg,
                weight: DEFAULTS.weight,
                direction: DEFAULTS.direction,
                sigma_r: DEFAULTS.sigma_r,
                alpha: DEFAULTS.alpha,
                ocean_score
            };


            // Call AI API
            const aiResponse = await axios.post(
                `${AI_API_URL}/avg_daily_spend`,
                apiPayload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const aiData = aiResponse.data;


            // Update or create Metrics record
            let metricRecord = await MetricsRepo.findOne({
                where: {
                    userId: userId,
                    type: "avg_daily_spend"
                }
            });

            if (metricRecord) {
                metricRecord.vt = aiData.vt;
                metricRecord.bt = aiData.bt;
                metricRecord.r = aiData.r;
                metricRecord.n = aiData.n;
                metricRecord.contrib = aiData.contrib;
                metricRecord.metadata = {
                    mechanismFeedback: aiData.mechanismFeedback,
                    reason: aiData.reason
                };
            } else {
                metricRecord = MetricsRepo.create({
                    userId: userId,
                    type: "avg_daily_spend",
                    vt: aiData.vt,
                    bt: aiData.bt,
                    r: aiData.r,
                    n: aiData.n,
                    contrib: aiData.contrib,
                    metadata: {
                        mechanismFeedback: aiData.mechanismFeedback,
                        reason: aiData.reason
                    }
                });
            }

            await MetricsRepo.save(metricRecord);

            // Update BigFive with new ocean scores
            if (aiData.new_ocean_score) {
                bigFive.openness = aiData.new_ocean_score.O;
                bigFive.conscientiousness = aiData.new_ocean_score.C;
                bigFive.extraversion = aiData.new_ocean_score.E;
                bigFive.agreeableness = aiData.new_ocean_score.A;
                bigFive.neuroticism = aiData.new_ocean_score.N;

                await BigFiveRepo.save(bigFive);

            }

            // Return the exact format as received from AI API
            return res.status(200).json(aiData);

        } catch (e) {
            if (axios.isAxiosError(e)) {
                return res.status(e.response?.status || 500).json({
                    error: "Failed to calculate average daily spend",
                    details: e.response?.data || e.message
                });
            }

            return res.status(500).json({
                error: "Failed to create or update average daily spend",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };

    public getAverageDailySpend = async (req: Request, res: Response) => {
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
}

export default new DailySpendingController();
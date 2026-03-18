import { Request, Response } from "express";
import { z } from "zod";
import axios from "axios";
import AppDataSource from "../../infrastructure/database";
import { User } from "../../entity/user";
import { BigFive } from "../../entity/big_five";
import { Metrics } from "../../entity/metrics";
import { BehaviorFeedback } from "../../entity/behavior_feedback";
import NUMBER from "../../config/schemas/Number";
import TEXT from "../../config/schemas/Text";
import { verifySurveyAndSaveFeedback } from "../../utils/verifySurveyHelper";
import { findMatchingModel } from "../../utils/modelMatcher";

const NightOutFreqRequestSchema = z.object({
    night_out_count: NUMBER,
    base_night_out: NUMBER,
    weight: NUMBER.optional().default(0.2),
    direction: TEXT.optional().default("up"),
    sigma_r: NUMBER.optional().default(1.0),
    alpha: NUMBER.optional().default(0.5),
    ocean_score: z.object({
        O: NUMBER,
        C: NUMBER,
        E: NUMBER,
        A: NUMBER,
        N: NUMBER,
    }),
});

const AIResponseSchema = z.object({
    metric: z.string(),
    vt: NUMBER,
    bt: NUMBER,
    r: NUMBER,
    n: NUMBER,
    contrib: NUMBER,
    new_ocean_score: z.object({
        O: NUMBER,
        C: NUMBER,
        E: NUMBER,
        A: NUMBER,
        N: NUMBER,
    }),
    mechanismFeedback: z.object({
        awareness: z.string(),
        motivation: z.string(),
        capability: z.string(),
        opportunity: z.string(),
    }).optional(),
    reason: z.string().optional()
});

const AI_API_URL = "https://ai-greenmind.khoav4.com/night_out_freq";

const BigFiveRepository = AppDataSource.getRepository(BigFive);
const UserRepository = AppDataSource.getRepository(User);
const MetricsRepository = AppDataSource.getRepository(Metrics);
const BehaviorFeedbackRepository = AppDataSource.getRepository(BehaviorFeedback);

class NightOutFreqController {
    public getNightOutFreq = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }


            // Tìm metric night_out_freq của user
            const metricRecord = await MetricsRepository.findOne({
                where: {
                    userId: userId,
                    type: "night_out_freq"
                }
            });

            if (!metricRecord) {
                return res.status(404).json({
                    error: "No night_out_freq metric found for this user"
                });
            }

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
                metric: "night_out_freq",
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
                error: "Failed to get night_out_freq metric",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };

    public countNightOut = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }


            // Validate request body
            const parsed = NightOutFreqRequestSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    error: "Invalid parameters",
                    details: parsed.error.errors
                });
            }

            const requestData = parsed.data;

            // Get user
            const user = await UserRepository.findOne({
                where: { id: userId },
                relations: { bigFive: true }
            });

            if (!user || !user.bigFive) {
                return res.status(404).json({ error: "User or BigFive not found" });
            }

            // Lưu previous OCEAN score trước khi cập nhật
            const previousOceanScore = {
                O: user.bigFive.openness,
                C: user.bigFive.conscientiousness,
                E: user.bigFive.extraversion,
                A: user.bigFive.agreeableness,
                N: user.bigFive.neuroticism
            };

            // Call AI API

            const aiResponse = await axios.post(AI_API_URL, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const aiData = aiResponse.data;

            // Validate AI response
            const aiParsed = AIResponseSchema.safeParse(aiData);
            if (!aiParsed.success) {
                return res.status(500).json({
                    error: "Invalid response from AI service",
                    details: aiParsed.error.errors
                });
            }


            // Update or create Metrics record
            let metricRecord = await MetricsRepository.findOne({
                where: {
                    userId: userId,
                    type: "night_out_freq"
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
                metricRecord = MetricsRepository.create({
                    userId: userId,
                    type: "night_out_freq",
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

            await MetricsRepository.save(metricRecord);

            // Save feedback to behavior_feedbacks table (không lưu oceanScore nữa)
            if (aiData.mechanismFeedback) {
                // Tự động tìm model phù hợp với user
                const matchingModel = await findMatchingModel(userId);
                const modelId = matchingModel?.id;

                const behaviorFeedback = BehaviorFeedbackRepository.create({
                    userId: userId,
                    modelId: modelId || undefined,
                    metric: "night_out_freq",
                    vt: aiData.vt,
                    bt: aiData.bt,
                    r: aiData.r,
                    n: aiData.n,
                    contrib: aiData.contrib,
                    mechanismFeedback: aiData.mechanismFeedback,
                    reason: aiData.reason,
                    oceanScore: aiData.new_ocean_score
                });

                await BehaviorFeedbackRepository.save(behaviorFeedback);
            }

            // Gọi verify-survey API với OCEAN score mới và lưu feedback
            // (Helper sẽ cập nhật BigFive cho user và segment)
            const verifySurveyResult = await verifySurveyAndSaveFeedback(
                userId,
                aiData.new_ocean_score,
                "night_out_freq",
                previousOceanScore
            );

            // Return the exact format as received from AI API
            return res.status(200).json({
                ...aiData,
                verifySurvey: verifySurveyResult || null
            });

        } catch (e) {
            if (axios.isAxiosError(e)) {
                return res.status(e.response?.status || 500).json({
                    error: "Failed to process night out frequency",
                    details: e.response?.data || e.message
                });
            }

            return res.status(500).json({
                error: "Failed to count night out",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };
}

export default new NightOutFreqController();
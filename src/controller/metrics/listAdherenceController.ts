import { Request, Response } from 'express';
import { z } from 'zod';
import AppDataSource from '../../infrastructure/database';
import { BigFive } from '../../entity/big_five';
import { Metrics } from '../../entity/metrics';
import { User } from '../../entity/user';
import { BehaviorFeedback } from '../../entity/behavior_feedback';
import axios from 'axios';
import { verifySurveyAndSaveFeedback } from '../../utils/verifySurveyHelper';
import { findMatchingModel } from '../../utils/modelMatcher';

const BigFiveRepository = AppDataSource.getRepository(BigFive);
const MetricsRepository = AppDataSource.getRepository(Metrics);
const UserRepository = AppDataSource.getRepository(User);
const BehaviorFeedbackRepository = AppDataSource.getRepository(BehaviorFeedback);

const API_URL = "https://ai-greenmind.khoav4.com/list_adherence";

const TodoItemSchema = z.object({
    id: z.string().optional(),
    task: z.string(),
    done: z.boolean(),
    children: z.array(z.any()).optional(),
    parent: z.string().optional()
});

const ListAdherenceRequestSchema = z.object({
    todos: z.array(TodoItemSchema),
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

const ListAdherenceResponseSchema = z.object({
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
    }),
    reason: z.string()
});

class ListAdherenceController {
    public getListAdherence = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }


            // Get metric record for list_adherence
            const metricRecord = await MetricsRepository.findOne({
                where: {
                    userId: userId,
                    type: "list_adherence"
                }
            });

            if (!metricRecord) {
                return res.status(404).json({
                    error: "List adherence metric not found for this user"
                });
            }

            // Get user's current BigFive scores
            const user = await UserRepository.findOne({
                where: { id: userId },
                relations: { bigFive: true }
            });

            if (!user || !user.bigFive) {
                return res.status(404).json({
                    error: "User or big five data not found"
                });
            }

            // Construct response
            const response = {
                metric: "list_adherence",
                vt: metricRecord.vt,
                bt: metricRecord.bt,
                r: metricRecord.r,
                n: metricRecord.n,
                contrib: metricRecord.contrib,
                new_ocean_score: {
                    O: user.bigFive.openness,
                    C: user.bigFive.conscientiousness,
                    E: user.bigFive.extraversion,
                    A: user.bigFive.agreeableness,
                    N: user.bigFive.neuroticism
                },
                mechanismFeedback: metricRecord.metadata?.mechanismFeedback,
                reason: metricRecord.metadata?.reason
            };


            return res.status(200).json(response);

        } catch (e) {
            return res.status(500).json({
                error: "Failed to get list adherence",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };

    public updateListAdherence = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }


            // Validate request body
            const parsed = ListAdherenceRequestSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    error: "Invalid parameters",
                    details: parsed.error.errors
                });
            }

            const requestData = parsed.data;

            // Request already in correct format (task/done)
            const apiPayload = {
                todos: requestData.todos,
                base_likert: requestData.base_likert,
                weight: requestData.weight,
                direction: requestData.direction,
                sigma_r: requestData.sigma_r,
                alpha: requestData.alpha,
                ocean_score: requestData.ocean_score
            };

            // Call external API with the exact request format

            const apiResponse = await axios.post(API_URL, apiPayload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (apiResponse.status !== 200) {
                return res.status(apiResponse.status).json({
                    error: "List adherence calculation failed",
                    details: apiResponse.data
                });
            }

            const apiResult = ListAdherenceResponseSchema.safeParse(apiResponse.data);

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
                    type: "list_adherence"
                }
            });

            if (metricRecord) {
                metricRecord.vt = result.vt;
                metricRecord.bt = result.bt;
                metricRecord.r = result.r;
                metricRecord.n = result.n;
                metricRecord.contrib = result.contrib;
                metricRecord.metadata = {
                    todos: requestData.todos,
                    base_likert: requestData.base_likert,
                    direction: requestData.direction,
                    mechanismFeedback: result.mechanismFeedback,
                    reason: result.reason
                };
            } else {
                metricRecord = MetricsRepository.create({
                    userId: userId,
                    type: "list_adherence",
                    vt: result.vt,
                    bt: result.bt,
                    r: result.r,
                    n: result.n,
                    contrib: result.contrib,
                    metadata: {
                        todos: requestData.todos,
                        base_likert: requestData.base_likert,
                        direction: requestData.direction,
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
                    metric: "list_adherence",
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
                "list_adherence",
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
                    error: "Failed to calculate list adherence",
                    details: e.response?.data || e.message
                });
            }

            return res.status(500).json({
                error: "Failed to update list adherence",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };
}

export default new ListAdherenceController();
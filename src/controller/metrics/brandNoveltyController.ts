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

const API_URL = "https://ai-greenmind.khoav4.com/brand_novelty";

const BrandNoveltyRequestSchema = z.object({
    brands_prev: z.array(z.string()),
    brands_now: z.array(z.string()),
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

const BrandNoveltyResponseSchema = z.object({
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

class BrandNoveltyController {
    public getBrandNovelty = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }


            // Get metric record for brand_novelty
            const metricRecord = await MetricsRepository.findOne({
                where: {
                    userId: userId,
                    type: "brand_novelty"
                }
            });

            if (!metricRecord) {
                return res.status(404).json({
                    error: "Brand novelty metric not found for this user"
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
                metric: "brand_novelty",
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
                error: "Failed to get brand novelty",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };

    public updateBrandNovelty = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }


            // Validate request body
            const parsed = BrandNoveltyRequestSchema.safeParse(req.body);
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
                    error: "Brand novelty calculation failed",
                    details: apiResponse.data
                });
            }

            const apiResult = BrandNoveltyResponseSchema.safeParse(apiResponse.data);

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
                    type: "brand_novelty"
                }
            });

            if (metricRecord) {
                metricRecord.vt = result.vt;
                metricRecord.bt = result.bt;
                metricRecord.r = result.r;
                metricRecord.n = result.n;
                metricRecord.contrib = result.contrib;
                metricRecord.metadata = {
                    brands_prev: requestData.brands_prev,
                    brands_now: requestData.brands_now,
                    base_likert: requestData.base_likert,
                    direction: requestData.direction,
                    mechanismFeedback: result.mechanismFeedback,
                    reason: result.reason
                };
            } else {
                metricRecord = MetricsRepository.create({
                    userId: userId,
                    type: "brand_novelty",
                    vt: result.vt,
                    bt: result.bt,
                    r: result.r,
                    n: result.n,
                    contrib: result.contrib,
                    metadata: {
                        brands_prev: requestData.brands_prev,
                        brands_now: requestData.brands_now,
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
                    metric: "brand_novelty",
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
                "brand_novelty",
                previousOceanScore
            );

            return res.status(200).json({
                ...result,
                verifySurvey: verifySurveyResult || null
            });
        } catch (e) {
            if (axios.isAxiosError(e)) {
                return res.status(e.response?.status || 500).json({
                    error: "Failed to calculate brand novelty",
                    details: e.response?.data || e.message
                });
            }

            return res.status(500).json({
                error: "Failed to update brand novelty",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };
}

export default new BrandNoveltyController();
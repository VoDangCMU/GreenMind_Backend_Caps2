import { Request, Response, RequestHandler } from "express";
import AppDataSource from "../infrastructure/database";
import { BehaviorFeedback } from "../entity/behavior_feedback";
import { Models } from "../entity/models";
import axios from "axios";

interface VerifySurveyRequest {
    model: {
        id: string;
        ocean: string;
        behavior: string;
        age: string;
        location: string;
        gender: string;
        keywords: string;
    };
    user_id: string;
    survey_result: {
        O: number;
        C: number;
        E: number;
        A: number;
        N: number;
    };
}

interface VerifySurveyResponse {
    model_id: string;
    user_id: string;
    trait_checked: string;
    expected: number;
    actual: number;
    deviation: number;
    engagement: number;
    match: boolean;
    level: string;
    feedback: string[];
}

class SurveyVerifyController {
    /**
     * Verify survey results against AI model
     * POST /api/survey/verify
     */
    public verifySurvey: RequestHandler = async (req: Request, res: Response) => {

        try {
            const requestData: VerifySurveyRequest = req.body;

            // Validate request data
            if (!requestData.model || !requestData.user_id || !requestData.survey_result) {
                res.status(400).json({ message: "Missing required fields" });
                return;
            }


            // Call AI verify-survey API
            const response = await axios.post<VerifySurveyResponse>(
                'https://ai-greenmind.khoav4.com/verify-survey',
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const verifyResult = response.data;

            const calculatedDeviation = Math.abs(verifyResult.expected - verifyResult.actual);
            const calculatedEngagement = 1 - calculatedDeviation;


            // Save feedback to unified behavior_feedbacks table
            const feedbackRepository = AppDataSource.getRepository(BehaviorFeedback);
            const feedback = feedbackRepository.create({
                type: 'survey_verify',
                modelId: verifyResult.model_id,
                userId: verifyResult.user_id,
                trait_checked: verifyResult.trait_checked,
                expected: verifyResult.expected,
                actual: verifyResult.actual,
                deviation: calculatedDeviation,
                match: verifyResult.match,
                level: verifyResult.level,
                feedback: verifyResult.feedback
            });

            await feedbackRepository.save(feedback);

            // Return response với deviation và engagement đã tính toán
            res.status(200).json({
                ...verifyResult,
                deviation: calculatedDeviation,
                engagement: calculatedEngagement
            });
        } catch (error) {

            if (axios.isAxiosError(error)) {
                res.status(error.response?.status || 500).json({
                    message: "Survey verification failed",
                    error: error.response?.data || error.message
                });
            } else {
                res.status(500).json({ message: "Internal server error" });
            }
        }
    };

    /**
     * Get all feedbacks
     * GET /api/models/feedbacks
     */
    public getFeedbacks: RequestHandler = async (req: Request, res: Response) => {

        try {
            const repo = AppDataSource.getRepository(BehaviorFeedback);

            // Get survey_verify feedbacks
            const surveyFeedbacks = await repo.find({
                where: { type: 'survey_verify' },
                relations: ['model'],
                order: { createdAt: 'DESC' }
            });


            // Cache behavior mechanism feedbacks by modelId
            const behaviorFeedbackCache = new Map<string, any[]>();

            const formattedFeedbacks = await Promise.all(surveyFeedbacks.map(async (feedback) => {
                const engagement = 1 - Math.abs(Number(feedback.deviation));

                let mechanismFeedbacksByMetric: any[] = [];

                if (feedback.modelId) {
                    if (!behaviorFeedbackCache.has(feedback.modelId)) {
                        const behaviorFeedbacks = await repo.find({
                            where: { modelId: feedback.modelId, type: 'behavior_mechanism' },
                            order: { createdAt: 'DESC' }
                        });

                        const groupedByMetric = new Map<string, any[]>();

                        behaviorFeedbacks.forEach(bf => {
                            if (!bf.mechanismFeedback || !bf.metric) return;

                            if (!groupedByMetric.has(bf.metric)) {
                                groupedByMetric.set(bf.metric, []);
                            }

                            groupedByMetric.get(bf.metric)!.push({
                                id: bf.id,
                                awareness: bf.mechanismFeedback.awareness,
                                motivation: bf.mechanismFeedback.motivation,
                                capability: bf.mechanismFeedback.capability,
                                opportunity: bf.mechanismFeedback.opportunity,
                                createdAt: bf.createdAt
                            });
                        });

                        const result = Array.from(groupedByMetric.entries()).map(([metricType, mechanismFeedbacks]) => ({
                            metricType,
                            mechanismFeedbacks
                        }));

                        behaviorFeedbackCache.set(feedback.modelId, result);
                    }

                    mechanismFeedbacksByMetric = behaviorFeedbackCache.get(feedback.modelId) || [];
                }

                return {
                    id: feedback.id,
                    model_id: feedback.modelId,
                    user_id: feedback.userId,
                    trait_checked: feedback.trait_checked,
                    expected: feedback.expected,
                    actual: feedback.actual,
                    deviation: feedback.deviation,
                    engagement: engagement,
                    match: feedback.match,
                    level: feedback.level,
                    feedback: feedback.feedback,
                    mechanismFeedbacks: mechanismFeedbacksByMetric,
                    createdAt: feedback.createdAt,
                    updatedAt: feedback.updatedAt,
                    model: feedback.model ? {
                        id: feedback.model.id,
                        ocean: feedback.model.ocean,
                        behavior: feedback.model.behavior,
                        age: feedback.model.age,
                        location: feedback.model.location,
                        gender: feedback.model.gender,
                        keywords: feedback.model.keywords
                    } : null
                };
            }));

            res.status(200).json(formattedFeedbacks);
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    };

    /**
     * Get feedbacks by model ID (through segments)
     * GET /api/models/:id/feedbacks
     */
    public getFeedbacksByModelId: RequestHandler = async (req: Request, res: Response) => {
        const { id: modelId } = req.params;

        if (!modelId) {
            res.status(400).json({ message: "Model ID is required" });
            return;
        }

        try {
            const repo = AppDataSource.getRepository(BehaviorFeedback);
            const modelRepository = AppDataSource.getRepository(Models);

            const model = await modelRepository.findOne({
                where: { id: modelId }
            });

            if (!model) {
                res.status(404).json({ message: "Model not found" });
                return;
            }

            // Get survey_verify feedbacks for this model
            const feedbacks = await repo.find({
                where: [
                    { modelId: modelId, type: 'survey_verify' },
                    { segment: { modelId: modelId }, type: 'survey_verify' }
                ],
                relations: ['model', 'segment'],
                order: { createdAt: 'DESC' }
            });


            const behaviorFeedbackCache = new Map<string, any[]>();

            const formattedFeedbacks = await Promise.all(feedbacks.map(async (feedback) => {
                const engagement = 1 - Math.abs(Number(feedback.deviation));

                let mechanismFeedbacksByMetric: any[] = [];

                const feedbackModelId = feedback.modelId || feedback.segment?.modelId;
                if (feedbackModelId) {
                    if (!behaviorFeedbackCache.has(feedbackModelId)) {
                        const behaviorFeedbacks = await repo.find({
                            where: { modelId: feedbackModelId, type: 'behavior_mechanism' },
                            order: { createdAt: 'DESC' }
                        });

                        const groupedByMetric = new Map<string, any[]>();

                        behaviorFeedbacks.forEach(bf => {
                            if (!bf.mechanismFeedback || !bf.metric) return;

                            if (!groupedByMetric.has(bf.metric)) {
                                groupedByMetric.set(bf.metric, []);
                            }

                            groupedByMetric.get(bf.metric)!.push({
                                id: bf.id,
                                awareness: bf.mechanismFeedback.awareness,
                                motivation: bf.mechanismFeedback.motivation,
                                capability: bf.mechanismFeedback.capability,
                                opportunity: bf.mechanismFeedback.opportunity,
                                createdAt: bf.createdAt
                            });
                        });

                        const result = Array.from(groupedByMetric.entries()).map(([metricType, mechanismFeedbacks]) => ({
                            metricType,
                            mechanismFeedbacks
                        }));

                        behaviorFeedbackCache.set(feedbackModelId, result);
                    }

                    mechanismFeedbacksByMetric = behaviorFeedbackCache.get(feedbackModelId) || [];
                }

                return {
                    id: feedback.id,
                    model_id: feedback.modelId || feedback.segment?.modelId,
                    segment_id: feedback.segmentId,
                    user_id: feedback.userId,
                    trait_checked: feedback.trait_checked,
                    expected: feedback.expected,
                    actual: feedback.actual,
                    deviation: feedback.deviation,
                    engagement: engagement,
                    match: feedback.match,
                    level: feedback.level,
                    feedback: feedback.feedback,
                    mechanismFeedbacks: mechanismFeedbacksByMetric,
                    createdAt: feedback.createdAt,
                    updatedAt: feedback.updatedAt,
                    segment: feedback.segment ? {
                        id: feedback.segment.id,
                        name: feedback.segment.name,
                        location: feedback.segment.location,
                        age: feedback.segment.age,
                        gender: feedback.segment.gender
                    } : null
                };
            }));

            // Add model info at the end of response
            res.status(200).json({
                feedbacks: formattedFeedbacks,
                model: {
                    id: model.id,
                    ocean: model.ocean,
                    behavior: model.behavior,
                    age: model.age,
                    location: model.location,
                    gender: model.gender,
                    keywords: model.keywords
                }
            });
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    };
}

export default new SurveyVerifyController();
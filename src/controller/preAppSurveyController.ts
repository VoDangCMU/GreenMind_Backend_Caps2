import { Request, Response } from 'express';
import { z } from 'zod';
import AppDataSource from '../infrastructure/database';
import { PreAppSurvey } from '../entity/pre_app_survey';
import { User } from '../entity/user';

const PreAppSurveyRepository = AppDataSource.getRepository(PreAppSurvey);
const UserRepository = AppDataSource.getRepository(User);

// Schema validation cho việc submit pre-app survey
const PreAppSurveySchema = z.object({
    userId: z.string().uuid(),
    answers: z.object({
        daily_spending: z.string().optional(),
        spending_variation: z.string().optional(),
        brand_trial: z.string().optional(),
        shopping_list: z.string().optional(),
        daily_distance: z.string().optional(),
        new_places: z.string().optional(),
        public_transport: z.string().optional(),
        stable_schedule: z.string().optional(),
        night_outings: z.string().optional(),
        healthy_eating: z.string().optional(),
        social_media: z.string().optional(),
        goal_setting: z.string().optional(),
        mood_swings: z.string().optional(),
    }),
    isCompleted: z.boolean().optional(),
    completedAt: z.string().datetime().optional(),
});

// Schema cho việc update params (sigmoid, weight, direction, alpha)
const UpdateParamsSchema = z.object({
    userId: z.string().uuid(),
    params: z.object({
        daily_spending: z.object({
            sigmoid: z.number().optional(),
            weight: z.number().optional(),
            direction: z.string().optional(),
            alpha: z.number().optional(),
        }).optional(),
        spending_variation: z.object({
            sigmoid: z.number().optional(),
            weight: z.number().optional(),
            direction: z.string().optional(),
            alpha: z.number().optional(),
        }).optional(),
        brand_trial: z.object({
            sigmoid: z.number().optional(),
            weight: z.number().optional(),
            direction: z.string().optional(),
            alpha: z.number().optional(),
        }).optional(),
        shopping_list: z.object({
            sigmoid: z.number().optional(),
            weight: z.number().optional(),
            direction: z.string().optional(),
            alpha: z.number().optional(),
        }).optional(),
        daily_distance: z.object({
            sigmoid: z.number().optional(),
            weight: z.number().optional(),
            direction: z.string().optional(),
            alpha: z.number().optional(),
        }).optional(),
        new_places: z.object({
            sigmoid: z.number().optional(),
            weight: z.number().optional(),
            direction: z.string().optional(),
            alpha: z.number().optional(),
        }).optional(),
        public_transport: z.object({
            sigmoid: z.number().optional(),
            weight: z.number().optional(),
            direction: z.string().optional(),
            alpha: z.number().optional(),
        }).optional(),
        stable_schedule: z.object({
            sigmoid: z.number().optional(),
            weight: z.number().optional(),
            direction: z.string().optional(),
            alpha: z.number().optional(),
        }).optional(),
        night_outings: z.object({
            sigmoid: z.number().optional(),
            weight: z.number().optional(),
            direction: z.string().optional(),
            alpha: z.number().optional(),
        }).optional(),
        healthy_eating: z.object({
            sigmoid: z.number().optional(),
            weight: z.number().optional(),
            direction: z.string().optional(),
            alpha: z.number().optional(),
        }).optional(),
    }),
});

class PreAppSurveyController {
    // Submit hoặc update pre-app survey
    public async submitPreAppSurvey(req: Request, res: Response) {
        const parsed = PreAppSurveySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Invalid input',
                errors: parsed.error.errors,
            });
        }

        const { userId, answers, isCompleted, completedAt } = parsed.data;

        try {
            // Kiểm tra user có tồn tại không
            const user = await UserRepository.findOne({ where: { id: userId } });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Tìm survey hiện có hoặc tạo mới
            let survey = await PreAppSurveyRepository.findOne({ where: { userId } });

            if (survey) {
                // Update existing survey
                if (answers.daily_spending !== undefined) survey.dailySpending = parseFloat(answers.daily_spending);
                if (answers.spending_variation !== undefined) survey.spendingVariation = parseInt(answers.spending_variation);
                if (answers.brand_trial !== undefined) survey.brandTrial = parseInt(answers.brand_trial);
                if (answers.shopping_list !== undefined) survey.shoppingList = parseInt(answers.shopping_list);
                if (answers.daily_distance !== undefined) survey.dailyDistance = parseFloat(answers.daily_distance);
                if (answers.new_places !== undefined) survey.newPlaces = parseInt(answers.new_places);
                if (answers.public_transport !== undefined) survey.publicTransport = parseInt(answers.public_transport);
                if (answers.stable_schedule !== undefined) survey.stableSchedule = parseInt(answers.stable_schedule);
                if (answers.night_outings !== undefined) survey.nightOutings = parseInt(answers.night_outings);
                if (answers.healthy_eating !== undefined) survey.healthyEating = parseInt(answers.healthy_eating);
                if (answers.social_media !== undefined) survey.socialMedia = parseInt(answers.social_media);
                if (answers.goal_setting !== undefined) survey.goalSetting = parseInt(answers.goal_setting);
                if (answers.mood_swings !== undefined) survey.moodSwings = parseInt(answers.mood_swings);

                if (isCompleted !== undefined) survey.isCompleted = isCompleted;
                if (completedAt) survey.completedAt = new Date(completedAt);
            } else {
                // Create new survey
                survey = PreAppSurveyRepository.create({
                    userId,
                    user,
                    dailySpending: answers.daily_spending ? parseFloat(answers.daily_spending) : null,
                    spendingVariation: answers.spending_variation ? parseInt(answers.spending_variation) : null,
                    brandTrial: answers.brand_trial ? parseInt(answers.brand_trial) : null,
                    shoppingList: answers.shopping_list ? parseInt(answers.shopping_list) : null,
                    dailyDistance: answers.daily_distance ? parseFloat(answers.daily_distance) : null,
                    newPlaces: answers.new_places ? parseInt(answers.new_places) : null,
                    publicTransport: answers.public_transport ? parseInt(answers.public_transport) : null,
                    stableSchedule: answers.stable_schedule ? parseInt(answers.stable_schedule) : null,
                    nightOutings: answers.night_outings ? parseInt(answers.night_outings) : null,
                    healthyEating: answers.healthy_eating ? parseInt(answers.healthy_eating) : null,
                    socialMedia: answers.social_media ? parseInt(answers.social_media) : null,
                    goalSetting: answers.goal_setting ? parseInt(answers.goal_setting) : null,
                    moodSwings: answers.mood_swings ? parseInt(answers.mood_swings) : null,
                    isCompleted: isCompleted || false,
                    completedAt: completedAt ? new Date(completedAt) : null,
                });
            }

            const savedSurvey = await PreAppSurveyRepository.save(survey);
            return res.status(200).json({
                message: 'Pre-app survey saved successfully',
                data: savedSurvey,
            });
        } catch (e) {
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Update parameters (sigmoid, weight, direction, alpha)
    public async updateParameters(req: Request, res: Response) {
        const parsed = UpdateParamsSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Invalid input',
                errors: parsed.error.errors,
            });
        }

        const { userId, params } = parsed.data;

        try {
            const survey = await PreAppSurveyRepository.findOne({ where: { userId } });
            if (!survey) {
                return res.status(404).json({ message: 'Pre-app survey not found for this user' });
            }

            // Update parameters cho từng field
            if (params.daily_spending) {
                if (params.daily_spending.sigmoid !== undefined) survey.dailySpendingSigmoid = params.daily_spending.sigmoid;
                if (params.daily_spending.weight !== undefined) survey.dailySpendingWeight = params.daily_spending.weight;
                if (params.daily_spending.direction !== undefined) survey.dailySpendingDirection = params.daily_spending.direction;
                if (params.daily_spending.alpha !== undefined) survey.dailySpendingAlpha = params.daily_spending.alpha;
            }

            if (params.spending_variation) {
                if (params.spending_variation.sigmoid !== undefined) survey.spendingVariationSigmoid = params.spending_variation.sigmoid;
                if (params.spending_variation.weight !== undefined) survey.spendingVariationWeight = params.spending_variation.weight;
                if (params.spending_variation.direction !== undefined) survey.spendingVariationDirection = params.spending_variation.direction;
                if (params.spending_variation.alpha !== undefined) survey.spendingVariationAlpha = params.spending_variation.alpha;
            }

            if (params.brand_trial) {
                if (params.brand_trial.sigmoid !== undefined) survey.brandTrialSigmoid = params.brand_trial.sigmoid;
                if (params.brand_trial.weight !== undefined) survey.brandTrialWeight = params.brand_trial.weight;
                if (params.brand_trial.direction !== undefined) survey.brandTrialDirection = params.brand_trial.direction;
                if (params.brand_trial.alpha !== undefined) survey.brandTrialAlpha = params.brand_trial.alpha;
            }

            if (params.shopping_list) {
                if (params.shopping_list.sigmoid !== undefined) survey.shoppingListSigmoid = params.shopping_list.sigmoid;
                if (params.shopping_list.weight !== undefined) survey.shoppingListWeight = params.shopping_list.weight;
                if (params.shopping_list.direction !== undefined) survey.shoppingListDirection = params.shopping_list.direction;
                if (params.shopping_list.alpha !== undefined) survey.shoppingListAlpha = params.shopping_list.alpha;
            }

            if (params.daily_distance) {
                if (params.daily_distance.sigmoid !== undefined) survey.dailyDistanceSigmoid = params.daily_distance.sigmoid;
                if (params.daily_distance.weight !== undefined) survey.dailyDistanceWeight = params.daily_distance.weight;
                if (params.daily_distance.direction !== undefined) survey.dailyDistanceDirection = params.daily_distance.direction;
                if (params.daily_distance.alpha !== undefined) survey.dailyDistanceAlpha = params.daily_distance.alpha;
            }

            if (params.new_places) {
                if (params.new_places.sigmoid !== undefined) survey.newPlacesSigmoid = params.new_places.sigmoid;
                if (params.new_places.weight !== undefined) survey.newPlacesWeight = params.new_places.weight;
                if (params.new_places.direction !== undefined) survey.newPlacesDirection = params.new_places.direction;
                if (params.new_places.alpha !== undefined) survey.newPlacesAlpha = params.new_places.alpha;
            }

            if (params.public_transport) {
                if (params.public_transport.sigmoid !== undefined) survey.publicTransportSigmoid = params.public_transport.sigmoid;
                if (params.public_transport.weight !== undefined) survey.publicTransportWeight = params.public_transport.weight;
                if (params.public_transport.direction !== undefined) survey.publicTransportDirection = params.public_transport.direction;
                if (params.public_transport.alpha !== undefined) survey.publicTransportAlpha = params.public_transport.alpha;
            }

            if (params.stable_schedule) {
                if (params.stable_schedule.sigmoid !== undefined) survey.stableScheduleSigmoid = params.stable_schedule.sigmoid;
                if (params.stable_schedule.weight !== undefined) survey.stableScheduleWeight = params.stable_schedule.weight;
                if (params.stable_schedule.direction !== undefined) survey.stableScheduleDirection = params.stable_schedule.direction;
                if (params.stable_schedule.alpha !== undefined) survey.stableScheduleAlpha = params.stable_schedule.alpha;
            }

            if (params.night_outings) {
                if (params.night_outings.sigmoid !== undefined) survey.nightOutingsSigmoid = params.night_outings.sigmoid;
                if (params.night_outings.weight !== undefined) survey.nightOutingsWeight = params.night_outings.weight;
                if (params.night_outings.direction !== undefined) survey.nightOutingsDirection = params.night_outings.direction;
                if (params.night_outings.alpha !== undefined) survey.nightOutingsAlpha = params.night_outings.alpha;
            }

            if (params.healthy_eating) {
                if (params.healthy_eating.sigmoid !== undefined) survey.healthyEatingSigmoid = params.healthy_eating.sigmoid;
                if (params.healthy_eating.weight !== undefined) survey.healthyEatingWeight = params.healthy_eating.weight;
                if (params.healthy_eating.direction !== undefined) survey.healthyEatingDirection = params.healthy_eating.direction;
                if (params.healthy_eating.alpha !== undefined) survey.healthyEatingAlpha = params.healthy_eating.alpha;
            }

            const updatedSurvey = await PreAppSurveyRepository.save(survey);
            return res.status(200).json({
                message: 'Parameters updated successfully',
                data: updatedSurvey,
            });
        } catch (e) {
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Get pre-app survey by userId
    public async getPreAppSurvey(req: Request, res: Response) {
        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        try {
            const survey = await PreAppSurveyRepository.findOne({
                where: { userId },
                relations: ['user'],
            });

            if (!survey) {
                return res.status(404).json({ message: 'Pre-app survey not found' });
            }

            return res.status(200).json(survey);
        } catch (e) {
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Get all pre-app surveys (admin only)
    public async getAllPreAppSurveys(req: Request, res: Response) {
        try {
            const surveys = await PreAppSurveyRepository.find({
                relations: ['user'],
                order: { createdAt: 'DESC' },
            });

            return res.status(200).json(surveys);
        } catch (e) {
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Delete pre-app survey
    public async deletePreAppSurvey(req: Request, res: Response) {
        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        try {
            const survey = await PreAppSurveyRepository.findOne({ where: { userId } });

            if (!survey) {
                return res.status(404).json({ message: 'Pre-app survey not found' });
            }

            await PreAppSurveyRepository.remove(survey);
            return res.status(200).json({
                message: 'Pre-app survey deleted successfully',
                deletedData: survey,
            });
        } catch (e) {
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

export default new PreAppSurveyController();

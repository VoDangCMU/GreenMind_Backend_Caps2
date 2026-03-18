import { Request, Response } from 'express';
import { z } from 'zod';
import AppDataSource from '../infrastructure/database';
import { BigFive } from '../entity/big_five';
import { User } from '../entity/user';

// Schema mới cho format scores
const BigFiveScoresSchema = z.object({
    user_id: z.string().uuid(),
    scores: z.object({
        O: z.number().min(0).max(100),
        C: z.number().min(0).max(100),
        E: z.number().min(0).max(100),
        A: z.number().min(0).max(100),
        N: z.number().min(0).max(100)
    })
});

const BigFiveUpdateScoresSchema = z.object({
    scores: z.object({
        O: z.number().min(0).max(100).optional(),
        C: z.number().min(0).max(100).optional(),
        E: z.number().min(0).max(100).optional(),
        A: z.number().min(0).max(100).optional(),
        N: z.number().min(0).max(100).optional()
    }).optional()
});

const UserIdSchema = z.object({
    userId: z.string().uuid(),
});

const BigFiveRepository = AppDataSource.getRepository(BigFive);
const UserRepository = AppDataSource.getRepository(User);

class BigFiveController {
    // Create hoặc Update Big Five với format mới
    public async submitBigFive(req: Request, res: Response) {
        const parsed = BigFiveScoresSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Invalid input',
                errors: parsed.error.errors
            });
        }

        const { user_id, scores } = parsed.data;

        try {
            // Check if user exists
            const user = await UserRepository.findOne({
                where: { id: user_id },
                relations: ['bigFive']
            });

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            let bigFive = user.bigFive;

            if (bigFive) {
                // Update existing Big Five data
                bigFive.openness = scores.O / 100;
                bigFive.conscientiousness = scores.C / 100;
                bigFive.extraversion = scores.E / 100;
                bigFive.agreeableness = scores.A / 100;
                bigFive.neuroticism = scores.N / 100;
            } else {
                // Create new Big Five data
                bigFive = BigFiveRepository.create({
                    openness: scores.O / 100,
                    conscientiousness: scores.C / 100,
                    extraversion: scores.E / 100,
                    agreeableness: scores.A / 100,
                    neuroticism: scores.N / 100,
                    user: user
                });
            }

            const savedBigFive = await BigFiveRepository.save(bigFive);

            // Format response theo format mới
            return res.status(200).json({
                message: "Big Five scores saved successfully",
                data: {
                    user_id: user_id,
                    scores: {
                        O: parseFloat((savedBigFive.openness * 100).toFixed(2)),
                        C: parseFloat((savedBigFive.conscientiousness * 100).toFixed(2)),
                        E: parseFloat((savedBigFive.extraversion * 100).toFixed(2)),
                        A: parseFloat((savedBigFive.agreeableness * 100).toFixed(2)),
                        N: parseFloat((savedBigFive.neuroticism * 100).toFixed(2))
                    }
                }
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    // Get Big Five by User ID với format mới
    public async getBigFiveByUserId(req: Request, res: Response) {
        const parsed = UserIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        const userId = parsed.data.userId;

        try {
            const bigFive = await BigFiveRepository.findOne({
                where: { user: { id: userId } },
                relations: ['user']
            });

            if (!bigFive) {
                return res.status(404).json({ message: 'Big Five data not found for this user' });
            }

            // Format response theo format mới
            return res.status(200).json({
                user_id: userId,
                scores: {
                    O: parseFloat((bigFive.openness * 100).toFixed(2)),
                    C: parseFloat((bigFive.conscientiousness * 100).toFixed(2)),
                    E: parseFloat((bigFive.extraversion * 100).toFixed(2)),
                    A: parseFloat((bigFive.agreeableness * 100).toFixed(2)),
                    N: parseFloat((bigFive.neuroticism * 100).toFixed(2))
                }
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    // Update Big Five scores
    public async updateBigFive(req: Request, res: Response) {
        const parsed = BigFiveUpdateScoresSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Invalid input',
                errors: parsed.error.errors
            });
        }

        const userIdParsed = UserIdSchema.safeParse(req.params);
        if (!userIdParsed.success) {
            return res.status(400).json(userIdParsed.error);
        }

        const userId = userIdParsed.data.userId;
        const { scores } = parsed.data;

        try {
            const bigFive = await BigFiveRepository.findOne({
                where: { user: { id: userId } }
            });

            if (!bigFive) {
                return res.status(404).json({ message: 'Big Five data not found for this user' });
            }

            // Update only provided scores
            if (scores) {
                if (scores.O !== undefined) bigFive.openness = scores.O / 100;
                if (scores.C !== undefined) bigFive.conscientiousness = scores.C / 100;
                if (scores.E !== undefined) bigFive.extraversion = scores.E / 100;
                if (scores.A !== undefined) bigFive.agreeableness = scores.A / 100;
                if (scores.N !== undefined) bigFive.neuroticism = scores.N / 100;
            }

            const updatedBigFive = await BigFiveRepository.save(bigFive);

            return res.status(200).json({
                message: "Big Five scores updated successfully",
                data: {
                    user_id: userId,
                    scores: {
                        O: parseFloat((updatedBigFive.openness * 100).toFixed(2)),
                        C: parseFloat((updatedBigFive.conscientiousness * 100).toFixed(2)),
                        E: parseFloat((updatedBigFive.extraversion * 100).toFixed(2)),
                        A: parseFloat((updatedBigFive.agreeableness * 100).toFixed(2)),
                        N: parseFloat((updatedBigFive.neuroticism * 100).toFixed(2))
                    }
                }
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    // Delete Big Five
    public async deleteBigFive(req: Request, res: Response) {
        const parsed = UserIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        const userId = parsed.data.userId;

        try {
            const bigFive = await BigFiveRepository.findOne({
                where: { user: { id: userId } }
            });

            if (!bigFive) {
                return res.status(404).json({ message: 'Big Five data not found for this user' });
            }

            await BigFiveRepository.remove(bigFive);

            return res.status(200).json({
                message: 'Big Five data deleted successfully',
                data: {
                    user_id: userId,
                    scores: {
                        O: parseFloat((bigFive.openness * 100).toFixed(2)),
                        C: parseFloat((bigFive.conscientiousness * 100).toFixed(2)),
                        E: parseFloat((bigFive.extraversion * 100).toFixed(2)),
                        A: parseFloat((bigFive.agreeableness * 100).toFixed(2)),
                        N: parseFloat((bigFive.neuroticism * 100).toFixed(2))
                    }
                }
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    // Get all Big Five (admin only)
    public async getAllBigFive(req: Request, res: Response) {
        try {
            const bigFiveList = await BigFiveRepository.find({
                relations: ['user'],
                order: { createdAt: 'DESC' }
            });

            const formattedList = bigFiveList.map(bigFive => ({
                user_id: bigFive.user?.id,
                username: bigFive.user?.username,
                type: bigFive.type,
                referenceId: bigFive.referenceId,
                scores: {
                    O: parseFloat((bigFive.openness * 100).toFixed(2)),
                    C: parseFloat((bigFive.conscientiousness * 100).toFixed(2)),
                    E: parseFloat((bigFive.extraversion * 100).toFixed(2)),
                    A: parseFloat((bigFive.agreeableness * 100).toFixed(2)),
                    N: parseFloat((bigFive.neuroticism * 100).toFixed(2))
                },
                createdAt: bigFive.createdAt,
                updatedAt: bigFive.updatedAt
            }));

            return res.status(200).json({
                message: "All Big Five data retrieved successfully",
                count: formattedList.length,
                data: formattedList
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}

export default new BigFiveController();
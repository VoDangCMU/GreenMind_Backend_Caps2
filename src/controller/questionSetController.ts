import {Request, Response} from 'express';
import {z} from 'zod';
import AppDataSource from '../infrastructure/database';
import {QuestionSets} from '../entity/question_sets';
import {Questions} from '../entity/questions';
import {User} from '../entity/user';
import {In} from "typeorm";

const CreateQuestionSetSchema = z.object({
    name: z.string().min(1, "Question set name is required"),
    description: z.string().optional(),
    questionIds: z.array(z.string().uuid("Invalid question ID")).min(1, "At least one question is required")
});

const UpdateQuestionSetSchema = z.object({
    name: z.string().min(1, "Question set name is required").optional(),
    description: z.string().optional(),
    questionIds: z.array(z.string().uuid("Invalid question ID")).optional()
});

const QuestionSetIdSchema = z.object({
    id: z.string().uuid("Invalid question set ID"),
});

const QuestionSetsRepository = AppDataSource.getRepository(QuestionSets);
const QuestionsRepository = AppDataSource.getRepository(Questions);
const UserRepository = AppDataSource.getRepository(User);

export class QuestionSetController {

    public async createQuestionSet(req: Request, res: Response) {
        const parsed = CreateQuestionSetSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation error",
                errors: parsed.error.format()
            });
        }

        const data = parsed.data;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({message: "Unauthorized"});
        }
        try {
            const user = await UserRepository.findOne({ where: { id: userId } });
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const questions = await QuestionsRepository.find({
                where: {id: In(data.questionIds)},
                relations: ['model']
            });
            if (questions.length !== data.questionIds.length) {
                return res.status(404).json({
                    message: "Some questions not found",
                    found: questions.length,
                    requested: data.questionIds.length
                });
            }

            const questTionSetExists = await QuestionSetsRepository.findOne({
                where: {name: data.name, ownerId: userId}
            });
            if (questTionSetExists) {
                return res.status(409).json({message: "Question set with this name already exists for the user"});
            }

            const questionSet = QuestionSetsRepository.create({
                name: data.name,
                description: data.description,
                owner: user,
                ownerId: userId,
                items: questions,
                model: questions[0]?.model || undefined
            });

            const savedQuestionSet = await QuestionSetsRepository.save(questionSet);


            return res.status(201).json({
                message: "Question set created successfully",
                data: savedQuestionSet
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async getQuestionSets(req: Request, res: Response) {
        try {
            const questionSets = await QuestionSetsRepository.find({
                relations: ['owner', 'items', 'items.questionOptions', 'items.template'],
                order: { createdAt: 'DESC' }
            });

            return res.status(200).json({
                message: "Question sets retrieved successfully",
                data: questionSets,
                count: questionSets.length
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async getQuestionSetsByOwner(req: Request, res: Response) {

        if (!req.user?.userId) {
            res.status(401).json({
                message: "Unauthorized"
            })
        }
        try {
            const questionSets = await QuestionSetsRepository.find({
                where: { ownerId: req.user?.userId },
                relations: ['owner', 'items', 'items.questionOptions', 'items.template'],
                order: { createdAt: 'DESC' }
            });

            return res.status(200).json({
                message: "Question sets retrieved successfully",
                data: questionSets,
                count: questionSets.length
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async getQuestionSetById(req: Request, res: Response) {
        const parsed = QuestionSetIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid question set ID format",
                errors: parsed.error.format()
            });
        }

        const questionSetId = parsed.data.id;

        try {
            const questionSet = await QuestionSetsRepository.findOne({
                where: { id: questionSetId },
                relations: ['owner', 'items', 'items.questionOptions', 'items.template']
            });

            if (!questionSet) {
                return res.status(404).json({ message: "Question set not found" });
            }

            return res.status(200).json({
                message: "Question set found",
                data: questionSet
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async updateQuestionSet(req: Request, res: Response) {
        const parsed = QuestionSetIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid question set ID format",
                errors: parsed.error.format()
            });
        }

        const dataParsed = UpdateQuestionSetSchema.safeParse(req.body);
        if (!dataParsed.success) {
            return res.status(400).json({
                message: "Validation error",
                errors: dataParsed.error.format()
            });
        }

        const questionSetId = parsed.data.id;
        const data = dataParsed.data;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({message: "Unauthorized"});
        }


        try {
            const questionSet = await QuestionSetsRepository.findOne({
                where: { id: questionSetId },
                relations: ['owner', 'items']
            });

            if (!questionSet) {
                return res.status(404).json({ message: "Question set not found" });
            }

            if (questionSet.ownerId !== userId) {
                return res.status(403).json({ message: "You don't have permission to update this question set" });
            }

            if (data.name !== undefined) {
                questionSet.name = data.name;
            }
            if (data.description !== undefined) {
                questionSet.description = data.description;
            }

            await QuestionSetsRepository.save(questionSet);

            if (data.questionIds !== undefined) {
                const questions = await QuestionsRepository.find({
                    where: {id: In(data.questionIds)}
                });

                if (questions.length !== data.questionIds.length) {
                    return res.status(404).json({
                        message: "Some questions not found",
                        found: questions.length,
                        requested: data.questionIds.length
                    });
                }

                questionSet.items = questions;
                await QuestionSetsRepository.save(questionSet);
            }

            const result = await QuestionSetsRepository.findOne({
                where: { id: questionSetId },
                relations: ['owner', 'items', 'items.questionOptions', 'items.template']
            });

            return res.status(200).json({
                message: "Question set updated successfully",
                data: result
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async deleteQuestionSet(req: Request, res: Response) {
        const parsed = QuestionSetIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid question set ID format",
                errors: parsed.error.format()
            });
        }

        const questionSetId = parsed.data.id;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({message: "Unauthorized"});
        }

        try {
            const questionSet = await QuestionSetsRepository.findOne({
                where: { id: questionSetId }
            });

            if (!questionSet) {
                return res.status(404).json({ message: "Question set not found" });
            }

            if (questionSet.ownerId !== userId) {
                return res.status(403).json({ message: "You don't have permission to delete this question set" });
            }

            await QuestionSetsRepository.remove(questionSet);

            return res.status(200).json({
                message: "Question set deleted successfully"
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}

export default new QuestionSetController();
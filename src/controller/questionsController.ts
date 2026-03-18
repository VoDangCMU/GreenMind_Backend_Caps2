import {Request, Response} from 'express';
import {z} from 'zod';
import AppDataSource from '../infrastructure/database';
import {Questions} from '../entity/questions';
import {QuestionOptions} from '../entity/question_options';
import {Template} from '../entity/templates';
import {Models} from '../entity/models';

const QuestionSchema = z.object({
    filled_prompt: z.string().min(1, "Question text (filled_prompt) is required"),
    templateId: z.string().uuid("Invalid template ID"),
    trait: z.string().max(1).optional(), // O, C, E, A, N
    modelId: z.string().uuid().optional(),
});

const QuestionUpdateSchema = z.object({
    question: z.string().min(1, "Question text is required").optional(),
    templateId: z.string().uuid("Invalid template ID").optional()
});

const QuestionIdSchema = z.object({
    id: z.string().uuid("Invalid question ID"),
});

const AnswerSchema = z.object({
    type: z.string(),
    scale: z.array(z.number()).optional(),
    labels: z.array(z.string()).optional(),
    options: z.array(z.string()).optional(),
});

const QuestionFromPayloadSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    intent: z.string().optional(),
    question_type: z.string().optional(),
    question: z.string().optional(), // Allow 'question' field as alternative
    filled_prompt: z.string().optional(), // Make filled_prompt optional
    answer: AnswerSchema.optional(),
    modelId: z.string().uuid().optional(),
    templateId: z.string().optional(), // Allow any string for templateId, not just UUID
    trait: z.string().max(1).optional(), // O, C, E, A, N
}).refine(data => data.question || data.filled_prompt, {
    message: "Either 'question' or 'filled_prompt' is required",
    path: ["question"]
});

const CreateQuestionsRequestSchema = z.object({
    questions: z.array(QuestionFromPayloadSchema).min(1, "At least one question is required"),
    defaultTemplateId: z.string().uuid().optional(), // Default template ID for all questions
    defaultModelId: z.string().uuid().optional(), // Default model ID for all questions
});

const QuestionsRepository = AppDataSource.getRepository(Questions);
const QuestionOptionsRepository = AppDataSource.getRepository(QuestionOptions);
const TemplateRepository = AppDataSource.getRepository(Template);
const ModelsRepository = AppDataSource.getRepository(Models);

function validateQuestionParams(req: Request, res: Response) {
    const parsed = QuestionSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: "Validation error",
            errors: parsed.error.format()
        });
        return null;
    }
    return parsed.data;
}

function validateQuestionUpdateParams(req: Request, res: Response) {
    const parsed = QuestionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: "Validation error",
            errors: parsed.error.format()
        });
        return null;
    }
    return parsed.data;
}

function validateCreateQuestionsParams(req: Request, res: Response) {
    const parsed = CreateQuestionsRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: "Validation error",
            errors: parsed.error.format()
        });
        return null;
    }
    return parsed.data;
}


export class QuestionsController {
    // Create single question
    public async CreateQuestion(req: Request, res: Response) {
        const data = validateQuestionParams(req, res);
        if (!data) return;

        try {
            // Check if template exists
            const template = await TemplateRepository.findOne({
                where: { id: data.templateId }
            });

            if (!template) {
                return res.status(404).json({ message: "Template not found" });
            }

            // Xử lý trait: lấy từ request hoặc từ model.ocean
            let trait = data.trait;
            let model = null;

            if (data.modelId) {
                model = await ModelsRepository.findOne({
                    where: { id: data.modelId }
                });
                if (!model) {
                    return res.status(404).json({ message: `Model with ID ${data.modelId} not found` });
                }
                // Nếu không có trait trong request, lấy từ model.ocean (ký tự đầu tiên)
                if (!trait && model.ocean) {
                    const match = model.ocean.match(/^([OCEAN])/i);
                    if (match) {
                        trait = match[1].toUpperCase();
                    }
                }
            }

            // Nếu vẫn không có trait, thử lấy từ template
            if (!trait && template.trait) {
                trait = template.trait.toUpperCase();
            }

            const newQuestion = new Questions();
            newQuestion.question = data.filled_prompt; // Lưu filled_prompt vào question
            newQuestion.template = template;
            newQuestion.trait = trait;
            if (model) {
                newQuestion.model = model;
            }

            const savedQuestion = await QuestionsRepository.save(newQuestion);

            return res.status(201).json({
                message: "Question created successfully",
                data: savedQuestion
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    // Create multiple questions from direct payload
    public async createQuestions(req: Request, res: Response) {
        const data = validateCreateQuestionsParams(req, res);
        if (!data) return;

        // Get user ID from JWT token
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized - User ID not found" });
        }

        try {
            const savedQuestions = [];
            const errors: string[] = [];

            // Tạo một timestamp chung cho tất cả câu hỏi trong batch này
            const batchCreatedAt = new Date();

            // Validate default model and template if provided
            let defaultModel = null;
            if (data.defaultModelId) {
                defaultModel = await ModelsRepository.findOne({
                    where: { id: data.defaultModelId }
                });
                if (!defaultModel) {
                    return res.status(404).json({
                        message: `Default model with ID ${data.defaultModelId} not found`
                    });
                }
            }

            let defaultTemplate = null;
            if (data.defaultTemplateId) {
                defaultTemplate = await TemplateRepository.findOne({
                    where: { id: data.defaultTemplateId }
                });
                if (!defaultTemplate) {
                    return res.status(404).json({
                        message: `Default template with ID ${data.defaultTemplateId} not found`
                    });
                }
            }

            // Process each question from the payload
            for (let i = 0; i < data.questions.length; i++) {
                const questionData = data.questions[i];

                try {
                    // Get question text from either 'question' or 'filled_prompt' field
                    const questionText = questionData.filled_prompt || questionData.question || '';

                    // Determine which templateId to use (question's templateId > defaultTemplateId > questionData.id)
                    const templateIdToUse = questionData.templateId || data.defaultTemplateId || questionData.id;

                    // Validate and get template if templateId is provided
                    let template = null;
                    if (questionData.templateId || data.defaultTemplateId) {
                        template = await TemplateRepository.findOne({
                            where: { id: templateIdToUse }
                        });
                        if (!template) {
                            errors.push(`Question ${i + 1}: Template with ID ${templateIdToUse} not found, using templateId as string reference`);
                        }
                    } else if (defaultTemplate) {
                        template = defaultTemplate;
                    }

                    // Check if the exact same question text already exists (to prevent true duplicates)
                    const existedQuestion = await QuestionsRepository.findOne({
                        where: {
                            question: questionText,
                            templateId: templateIdToUse
                        },
                        relations: ["questionOptions", "model", "owner", "template"]
                    });

                    if (!existedQuestion) {
                        // Determine which modelId to use (question's modelId > defaultModelId)
                        const modelIdToUse = questionData.modelId || data.defaultModelId;

                        // Validate and get model if modelId is provided
                        let model = null;
                        if (modelIdToUse) {
                            model = await ModelsRepository.findOne({
                                where: { id: modelIdToUse }
                            });
                            if (!model) {
                                errors.push(`Question ${i + 1}: Model with ID ${modelIdToUse} not found, proceeding without model`);
                            }
                        } else if (defaultModel) {
                            model = defaultModel;
                        }

                        // Extract trait from intent if not provided (e.g., "O_F_001" -> "O")
                        let trait = questionData.trait;
                        if (!trait && questionData.intent) {
                            const match = questionData.intent.match(/^([OCEAN])/i);
                            if (match) {
                                trait = match[1].toUpperCase();
                            }
                        }

                        // Create new question with all fields including ownerId and createdAt
                        const newQuestion = QuestionsRepository.create({
                            question: questionText,
                            templateId: templateIdToUse,
                            template: template || undefined,
                            behaviorInput: questionData.name,
                            behaviorNormalized: questionData.intent,
                            trait: trait,
                            model: model || undefined,
                            ownerId: userId, // Save the user ID of the creator
                            createdAt: batchCreatedAt, // Gán cùng createdAt cho tất cả câu hỏi
                            updatedAt: batchCreatedAt
                        });

                        const savedQuestion = await QuestionsRepository.save(newQuestion);

                        // Create question options based on answer type
                        const questionOptions = [];

                        if (questionData.answer) {
                            if (questionData.answer.type === 'scale' && questionData.answer.labels) {
                                // For scale type with labels
                                for (let j = 0; j < questionData.answer.labels.length; j++) {
                                    const option = QuestionOptionsRepository.create({
                                        question: savedQuestion,
                                        text: questionData.answer.labels[j],
                                        value: questionData.answer.scale ? questionData.answer.scale[j].toString() : (j + 1).toString(),
                                        order: j
                                    });
                                    questionOptions.push(option);
                                }
                            } else if (questionData.answer.type === 'binary' && questionData.answer.options) {
                                // For binary type with options
                                for (let j = 0; j < questionData.answer.options.length; j++) {
                                    const option = QuestionOptionsRepository.create({
                                        question: savedQuestion,
                                        text: questionData.answer.options[j],
                                        value: j.toString(),
                                        order: j
                                    });
                                    questionOptions.push(option);
                                }
                            }
                        }

                        if (questionOptions.length > 0) {
                            await QuestionOptionsRepository.save(questionOptions);
                        }

                        // Reload question with all relations
                        const questionWithOptions = await QuestionsRepository.findOne({
                            where: { id: savedQuestion.id },
                            relations: ["questionOptions", "model", "owner", "template"]
                        });

                        savedQuestions.push(questionWithOptions);
                    } else {
                        // Exact duplicate question exists, skip
                        savedQuestions.push(existedQuestion);
                        errors.push(`Question with text "${questionData.filled_prompt}" and template ${templateIdToUse} already exists, skipped creation`);
                    }
                } catch (e) {
                    errors.push(`Question ${i + 1} (${questionData.id}): ${(e as Error).message}`);
                }
            }

            if (savedQuestions.length === 0) {
                return res.status(400).json({
                    message: "No questions were created",
                    errors: errors
                });
            }

            const response: any = {
                message: `${savedQuestions.length} questions processed successfully`,
                count: savedQuestions.length,
                data: savedQuestions,
                createdBy: userId,
                batchCreatedAt: batchCreatedAt.toISOString()
            };

            if (errors.length > 0) {
                response.warnings = errors;
                response.message = `${savedQuestions.length} questions processed with ${errors.length} warnings`;
            }

            return res.status(200).json(response);
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    // Get all questions
    public async GetQuestions(req: Request, res: Response) {
        try {
            const questions = await QuestionsRepository.find({
                relations: ['template', 'userAnswers'],
                order: { createdAt: 'DESC' }
            });

            return res.status(200).json({
                message: "Questions retrieved successfully",
                data: questions,
                count: questions.length
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    // Get question by ID
    public async GetQuestionById(req: Request, res: Response) {
        const parsed = QuestionIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid question ID format",
                errors: parsed.error.format()
            });
        }

        const questionId = parsed.data.id;

        try {
            const question = await QuestionsRepository.findOne({
                where: { id: questionId },
                relations: ['template', 'userAnswers']
            });

            if (!question) {
                return res.status(404).json({ message: "Question not found" });
            }

            return res.status(200).json({
                message: "Question found",
                data: question
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    // Update question
    public async UpdateQuestion(req: Request, res: Response) {
        const parsed = QuestionIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid question ID format",
                errors: parsed.error.format()
            });
        }

        const data = validateQuestionUpdateParams(req, res);
        if (!data) return;

        const questionId = parsed.data.id;

        try {
            // First, try to find the question
            const question = await QuestionsRepository.findOne({
                where: { id: questionId }
            });

            if (!question) {
                return res.status(404).json({ message: "Question not found" });
            }

            // Update question text if provided
            if (data.question !== undefined) {
                question.question = data.question;
            }

            // Update template if provided
            if (data.templateId !== undefined) {
                const template = await TemplateRepository.findOne({
                    where: { id: data.templateId }
                });

                if (!template) {
                    return res.status(404).json({ message: "Template not found" });
                }

                question.template = template;
            }

            const updatedQuestion = await QuestionsRepository.save(question);

            return res.status(200).json({
                message: "Question updated successfully",
                data: updatedQuestion
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    // Delete question
    public async DeleteQuestion(req: Request, res: Response) {
        const parsed = QuestionIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid question ID format",
                errors: parsed.error.format()
            });
        }

        const questionId = parsed.data.id;

        try {
            // First, try to find the question
            const question = await QuestionsRepository.findOne({
                where: { id: questionId }
            });

            if (!question) {
                return res.status(404).json({ message: "Question not found" });
            }


            await QuestionsRepository.delete(questionId);

            return res.status(200).json({
                message: "Question deleted successfully",
                data: question
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async GetQuestionsByTemplate(req: Request, res: Response) {
        const { templateId } = req.params;

        if (!templateId) {
            return res.status(400).json({ message: "Template ID is required" });
        }

        try {
            const questions = await QuestionsRepository.find({
                where: { template: { id: templateId } },
                relations: ['template'],
                order: { createdAt: 'DESC' }
            });

            return res.status(200).json({
                message: `Questions for template retrieved successfully`,
                data: questions,
                count: questions.length
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    // Get questions by owner
    public async GetQuestionsByOwner(req: Request, res: Response) {
        const ownerId = req.params.ownerId || req.user?.userId; // Allow getting by ownerId param or current user

        if (!ownerId) {
            return res.status(401).json({ message: "Unauthorized - User ID not found" });
        }

        try {
            // Bước 1: Tìm câu hỏi mới nhất của owner để lấy createdAt
            const latestQuestion = await QuestionsRepository.findOne({
                where: {
                    ownerId: ownerId
                },
                order: { createdAt: 'DESC' }
            });

            if (!latestQuestion) {
                return res.status(404).json({
                    message: "No questions found for this owner",
                    data: [],
                    count: 0
                });
            }

            // Bước 2: Lấy tất cả các câu hỏi có cùng thời gian createdAt chính xác với câu hỏi mới nhất
            const latestCreatedAt = latestQuestion.createdAt;

            // Lấy tất cả câu hỏi có cùng createdAt với câu hỏi mới nhất
            const questions = await QuestionsRepository
                .createQueryBuilder('question')
                .leftJoinAndSelect('question.template', 'template')
                .leftJoinAndSelect('question.owner', 'owner')
                .leftJoinAndSelect('question.questionOptions', 'questionOptions')
                .leftJoinAndSelect('question.model', 'model')
                .where('question.ownerId = :ownerId', { ownerId })
                .andWhere('question.createdAt = :createdAt', {
                    createdAt: latestCreatedAt
                })
                .orderBy('question.createdAt', 'DESC')
                .addOrderBy('questionOptions.order', 'ASC')
                .getMany();

            return res.status(200).json({
                message: `Latest batch of questions for owner retrieved successfully`,
                data: questions,
                count: questions.length,
                batchCreatedAt: latestCreatedAt
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async getSurveyQuestions(req: Request, res: Response) {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const userId = req.user.userId;
            const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

            // Import User entity and get user information
            const { User } = await import('../entity/user');
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({
                where: { id: userId },
                select: ['id', 'location', 'dateOfBirth', 'fullName']
            });

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Calculate user's age
            const currentDate = new Date();
            const birthDate = new Date(user.dateOfBirth);
            let age = currentDate.getFullYear() - birthDate.getFullYear();
            const monthDiff = currentDate.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
                age--;
            }

            const userLocation = user.location || '';
            const userAge = age;

            if (!userLocation.trim() && (!userAge || userAge <= 0)) {
                return res.status(200).json({
                    message: "No filtering criteria available - user has no location or valid age",
                    data: [],
                    count: 0,
                    userInfo: {
                        userId: userId,
                        location: userLocation,
                        age: userAge,
                        filteredCount: 0,
                        randomCount: 0
                    }
                });
            }

            // Query questions with location or age matching - ONLY filtered results
            const queryBuilder = QuestionsRepository.createQueryBuilder('question')
                .leftJoinAndSelect('question.template', 'template')
                .leftJoinAndSelect('template.model', 'model')
                .leftJoinAndSelect('question.model', 'questionModel')
                .leftJoinAndSelect('question.questionOptions', 'options')
                .orderBy('options.order', 'ASC'); // Ensure options are ordered correctly

            const conditions = [];

            // Add location filter - questions containing user's location
            if (userLocation.trim()) {
                conditions.push(
                    `(LOWER(question.question) LIKE LOWER(:location) OR LOWER(template.prompt) LIKE LOWER(:locationPrompt) OR LOWER(template.filled_prompt) LIKE LOWER(:locationFilled))`
                );
            }

            // Add age filter - questions containing user's age
            if (userAge && userAge > 0) {
                const ageConditions = [
                    `question.question LIKE '%${userAge}%'`,
                    `template.prompt LIKE '%${userAge}%'`,
                    `template.filled_prompt LIKE '%${userAge}%'`
                ];

                // Also check for age ranges (e.g., 30-40, 20s, etc.)
                const ageRange = Math.floor(userAge / 10) * 10; // e.g., 30 for ages 30-39
                ageConditions.push(
                    `question.question LIKE '%${ageRange}%'`,
                    `template.prompt LIKE '%${ageRange}%'`,
                    `template.filled_prompt LIKE '%${ageRange}%'`
                );

                // Check for age group terms in Vietnamese
                if (userAge >= 18 && userAge <= 25) {
                    ageConditions.push(
                        `LOWER(question.question) LIKE '%tuổi trẻ%'`,
                        `LOWER(question.question) LIKE '%thanh niên%'`,
                        `LOWER(template.prompt) LIKE '%tuổi trẻ%'`,
                        `LOWER(template.prompt) LIKE '%thanh niên%'`,
                        `LOWER(template.filled_prompt) LIKE '%tuổi trẻ%'`,
                        `LOWER(template.filled_prompt) LIKE '%thanh niên%'`
                    );
                } else if (userAge >= 26 && userAge <= 40) {
                    ageConditions.push(
                        `LOWER(question.question) LIKE '%trung niên%'`,
                        `LOWER(question.question) LIKE '%người lớn%'`,
                        `LOWER(template.prompt) LIKE '%trung niên%'`,
                        `LOWER(template.prompt) LIKE '%người lớn%'`,
                        `LOWER(template.filled_prompt) LIKE '%trung niên%'`,
                        `LOWER(template.filled_prompt) LIKE '%người lớn%'`
                    );
                } else if (userAge > 40) {
                    ageConditions.push(
                        `LOWER(question.question) LIKE '%trung niên%'`,
                        `LOWER(question.question) LIKE '%người già%'`,
                        `LOWER(template.prompt) LIKE '%trung niên%'`,
                        `LOWER(template.prompt) LIKE '%người già%'`,
                        `LOWER(template.filled_prompt) LIKE '%trung niên%'`,
                        `LOWER(template.filled_prompt) LIKE '%người già%'`
                    );
                }

                conditions.push(`(${ageConditions.join(' OR ')})`);
            }

            // If no conditions, return empty result
            if (conditions.length === 0) {
                return res.status(200).json({
                    message: "No filtering criteria available",
                    data: [],
                    count: 0,
                    userInfo: {
                        userId: userId,
                        location: userLocation,
                        age: userAge,
                        filteredCount: 0,
                        randomCount: 0
                    }
                });
            }

            // Apply filters with OR condition (questions matching location OR age)
            queryBuilder.where(`(${conditions.join(' OR ')})`, {
                location: `%${userLocation.toLowerCase()}%`,
                locationPrompt: `%${userLocation.toLowerCase()}%`,
                locationFilled: `%${userLocation.toLowerCase()}%`
            });

            // Get ONLY filtered questions - NO random fallback
            const filteredQuestions = await queryBuilder
                .orderBy('RANDOM()')
                .addOrderBy('options.order', 'ASC')
                .limit(limit)
                .getMany();

            // Helper function to generate default options based on question type
            const generateDefaultOptions = (questionType: string) => {
                switch (questionType?.toLowerCase()) {
                    case 'yesno':
                    case 'binary':
                        return [
                            { text: 'Có', value: 'yes', order: 0 },
                            { text: 'Không', value: 'no', order: 1 }
                        ];
                    case 'frequency':
                        return [
                            { text: 'Không bao giờ', value: '1', order: 0 },
                            { text: 'Thỉnh thoảng', value: '2', order: 1 },
                            { text: 'Thường xuyên', value: '3', order: 2 },
                            { text: 'Rất thường xuyên', value: '4', order: 3 }
                        ];
                    case 'likert5':
                        return [
                            { text: 'Rất không thích', value: '1', order: 0 },
                            { text: 'Không thích', value: '2', order: 1 },
                            { text: 'Bình thường', value: '3', order: 2 },
                            { text: 'Thích', value: '4', order: 3 },
                            { text: 'Rất thích', value: '5', order: 4 }
                        ];
                    case 'rating':
                        return [
                            { text: 'Rất tệ', value: '1', order: 0 },
                            { text: 'Tệ', value: '2', order: 1 },
                            { text: 'Bình thường', value: '3', order: 2 },
                            { text: 'Tốt', value: '4', order: 3 },
                            { text: 'Rất tốt', value: '5', order: 4 }
                        ];
                    default:
                        return [];
                }
            };

            // Helper function to extract trait from various sources
            const extractTrait = (question: Questions): string | null => {
                // Priority 1: question.trait
                if (question.trait) {
                    return question.trait.toUpperCase();
                }

                // Priority 2: template.trait
                if (question.template?.trait) {
                    return question.template.trait.toUpperCase();
                }

                // Priority 3: Extract from template.intent (e.g., "O_F_001" -> "O")
                if (question.template?.intent) {
                    const match = question.template.intent.match(/^([OCEAN])/i);
                    if (match) {
                        return match[1].toUpperCase();
                    }
                }

                // Priority 4: Extract from model.ocean
                const model = question.model || question.template?.model;
                if (model?.ocean) {
                    const match = model.ocean.match(/^([OCEAN])/i);
                    if (match) {
                        return match[1].toUpperCase();
                    }
                }

                return null;
            };

            // Transform questions to response format with fallback options
            const transformedQuestions = filteredQuestions.map(question => {
                let options = question.questionOptions
                    ?.sort((a, b) => a.order - b.order)
                    ?.map(option => ({
                        text: option.text,
                        value: option.value,
                        order: option.order
                    })) || [];

                // If no options found or incomplete options, generate default ones
                const questionType = question.template?.question_type;
                if (!options.length ||
                    (questionType === 'yesno' && options.length < 2) ||
                    (questionType === 'binary' && options.length < 2) ||
                    (questionType === 'frequency' && options.length < 4) ||
                    (questionType === 'likert5' && options.length < 5) ||
                    (questionType === 'rating' && options.length < 5)) {

                    const defaultOptions = questionType ? generateDefaultOptions(questionType) : [];
                    if (defaultOptions.length > 0) {
                        options = defaultOptions;
                    }
                }

                // Get model data (prefer question's model, fallback to template's model)
                const modelData = question.model || question.template?.model;

                return {
                    id: question.id,
                    question: question.question,
                    templateId: question.templateId,
                    behaviorInput: question.behaviorInput,
                    behaviorNormalized: question.behaviorNormalized,
                    trait: extractTrait(question),
                    model: modelData ? {
                        id: modelData.id,
                        ocean: modelData.ocean,
                        behavior: modelData.behavior,
                        age: modelData.age,
                        location: modelData.location,
                        gender: modelData.gender,
                        keywords: modelData.keywords
                    } : null,
                    template: {
                        id: question.template?.id,
                        name: question.template?.name,
                        description: question.template?.description,
                        intent: question.template?.intent,
                        question_type: question.template?.question_type
                    },
                    options: options,
                    createdAt: question.createdAt,
                    updatedAt: question.updatedAt
                };
            });

            // Filter out questions that still have no options after fallback
            const validQuestions = transformedQuestions.filter(q => q.options.length > 0);

            return res.status(200).json({
                message: validQuestions.length > 0
                    ? "Survey questions retrieved successfully"
                    : "No questions found matching user's location or age",
                data: validQuestions,
                count: validQuestions.length,
                userInfo: {
                    userId: userId,
                    location: userLocation,
                    age: userAge,
                    filteredCount: filteredQuestions.length,
                    validCount: validQuestions.length,
                    randomCount: 0  // No random questions added
                }
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}

export default new QuestionsController();
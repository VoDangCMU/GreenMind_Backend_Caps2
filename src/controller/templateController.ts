import { Request, Response } from "express";
import { z } from "zod";
import AppDataSource from "../infrastructure/database";
import { Template } from "../entity/templates";
import { Models } from "../entity/models";

const TemplateAnswerSchema = z.object({
    type: z.string(),
    scale: z.array(z.number()).optional(),
    labels: z.array(z.string()).optional(),
    options: z.array(z.string()).optional(),
});

const TemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    intent: z.string(),
    prompt: z.string(),
    used_placeholders: z.array(z.string()).optional(),
    question_type: z.string().optional(),
    filled_prompt: z.string().optional(),
    answer: TemplateAnswerSchema,
    trait: z.string().max(1).optional(), // O, C, E, A, N
    modelId: z.string().uuid().optional(),
});

const TemplateIdSchema = z.object({
    id: z.string(),
});

// Updated schema for createTemplates - expects direct templates array
const PlaceholdersSchema = z.object({
    required: z.array(z.string()),
    optional: z.array(z.string()),
    used_placeholders: z.array(z.string()),
});

const TemplateFromPayloadSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    intent: z.string(),
    placeholders: PlaceholdersSchema,
    prompt: z.string(),
    question_type: z.string(),
    answer: TemplateAnswerSchema,
    filled_prompt: z.string().optional(),
    trait: z.string().max(1).optional(), // O, C, E, A, N
    modelId: z.string().uuid().optional(),
});

const CreateTemplatesRequestSchema = z.object({
    templates: z.array(TemplateFromPayloadSchema).min(1, "At least one template is required"),
});

const TemplateRepository = AppDataSource.getRepository(Template);
const ModelsRepository = AppDataSource.getRepository(Models);

function validateTemplateParams(req: Request, res: Response) {
    const parsed = TemplateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: "Validation error",
            errors: parsed.error.format(),
        });
        return null;
    }
    return parsed.data;
}

function validateTemplateIdParams(req: Request, res: Response) {
    const parsed = TemplateIdSchema.safeParse(req.params);
    if (!parsed.success) {
        res.status(400).json({
            message: "Validation error",
            errors: parsed.error.format(),
        });
        return null;
    }
    return parsed.data;
}

function validateCreateTemplatesParams(req: Request, res: Response) {
    const parsed = CreateTemplatesRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: "Validation error",
            errors: parsed.error.format(),
        });
        return null;
    }
    return parsed.data;
}

class TemplateController {
    public async createTemplate(req: Request, res: Response) {
        const data = validateTemplateParams(req, res);
        if (!data) return;

        try {
            const existedTemplate = await TemplateRepository.findOne({
                where: {
                    id: data.id
                },
            });

            if (existedTemplate) {
                return res.status(400).json({ message: "Template with this ID already exists" });
            }

            let trait = data.trait;
            let model = null;

            if (data.modelId) {
                model = await ModelsRepository.findOne({
                    where: { id: data.modelId }
                });
                if (!model) {
                    return res.status(404).json({ message: `Model with ID ${data.modelId} not found` });
                }
                if (!trait && model.ocean) {
                    const match = model.ocean.match(/^([OCEAN])/i);
                    if (match) {
                        trait = match[1].toUpperCase();
                    }
                }
            }

            const newTemplate = TemplateRepository.create({
                id: data.id,
                name: data.name,
                description: data.description,
                intent: data.intent,
                prompt: data.prompt,
                used_placeholders: data.used_placeholders,
                question_type: data.question_type,
                filled_prompt: data.filled_prompt,
                answer_type: data.answer.type,
                answer_scale: data.answer.scale,
                answer_labels: data.answer.labels,
                answer_options: data.answer.options,
                trait: trait,
                model: model || undefined,
            });

            const createdTemplate = await TemplateRepository.save(newTemplate);

            return res.status(200).json({ createdTemplate });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async createTemplates(req: Request, res: Response) {
        const data = validateCreateTemplatesParams(req, res);
        if (!data) return;

        try {
            const savedTemplates = [];
            const errors: string[] = [];

            // Process each template from the payload
            for (let i = 0; i < data.templates.length; i++) {
                const templateData = data.templates[i];

                try {
                    // Check if template already exists
                    const existedTemplate = await TemplateRepository.findOne({
                        where: { id: templateData.id },
                        relations: ["model"]
                    });

                    if (!existedTemplate) {
                        // Xử lý trait: lấy từ request hoặc từ model.ocean
                        let trait = templateData.trait;
                        let model = null;

                        if (templateData.modelId) {
                            model = await ModelsRepository.findOne({
                                where: { id: templateData.modelId }
                            });
                            if (!model) {
                                errors.push(`Template ${templateData.id}: Model with ID ${templateData.modelId} not found, proceeding without model`);
                            } else {
                                // Nếu không có trait trong request, lấy từ model.ocean
                                if (!trait && model.ocean) {
                                    const match = model.ocean.match(/^([OCEAN])/i);
                                    if (match) {
                                        trait = match[1].toUpperCase();
                                    }
                                }
                            }
                        }

                        // Nếu vẫn không có trait, thử lấy từ intent (e.g., "O_F_001" -> "O")
                        if (!trait && templateData.intent) {
                            const match = templateData.intent.match(/^([OCEAN])/i);
                            if (match) {
                                trait = match[1].toUpperCase();
                            }
                        }

                        const newTemplate = TemplateRepository.create({
                            id: templateData.id,
                            name: templateData.name,
                            description: templateData.description,
                            intent: templateData.intent,
                            prompt: templateData.prompt,
                            used_placeholders: templateData.placeholders.used_placeholders,
                            question_type: templateData.question_type,
                            filled_prompt: templateData.filled_prompt,
                            answer_type: templateData.answer.type,
                            answer_scale: templateData.answer.scale,
                            answer_labels: templateData.answer.labels,
                            answer_options: templateData.answer.options,
                            trait: trait,
                            model: model || undefined,
                        });

                        const savedTemplate = await TemplateRepository.save(newTemplate);
                        savedTemplates.push(savedTemplate);
                    } else {
                        // Template exists, add to saved list
                        savedTemplates.push(existedTemplate);
                        errors.push(`Template ${templateData.id} already exists, skipped creation`);
                    }
                } catch (e) {
                    errors.push(`Template ${i + 1} (${templateData.id}): ${(e as Error).message}`);
                }
            }

            if (savedTemplates.length === 0) {
                return res.status(400).json({
                    message: "No templates were created",
                    errors: errors
                });
            }

            const response: any = {
                message: `${savedTemplates.length} templates processed successfully`,
                count: savedTemplates.length,
                templates: savedTemplates
            };

            if (errors.length > 0) {
                response.warnings = errors;
                response.message = `${savedTemplates.length} templates processed with ${errors.length} warnings`;
            }

            return res.status(200).json(response);
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async getAllTemplates(req: Request, res: Response) {
        try {
            const templates = await TemplateRepository.find({});

            return res.status(200).json({ templates });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async getTemplateById(req: Request, res: Response) {
        const idData = validateTemplateIdParams(req, res);
        if (!idData) return;

        try {
            const existedTemplate = await TemplateRepository.findOne({
                where: {
                    id: idData.id
                },
            });

            if (!existedTemplate) {
                return res.status(404).json({ message: "Template not found" });
            }

            return res.status(200).json({ existedTemplate });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async updateTemplateById(req: Request, res: Response) {
        const data = validateTemplateParams(req, res);
        if (!data) return;

        try {
            const existedTemplate = await TemplateRepository.findOne({
                where: {
                    id: data.id

                },
                relations: ["model"],
            });

            if (!existedTemplate) {
                return res.status(404).json({ message: "Template not found" });
            }

            existedTemplate.name = data.name ?? existedTemplate.name;
            existedTemplate.intent = data.intent ?? existedTemplate.intent;
            existedTemplate.prompt = data.prompt ?? existedTemplate.prompt;
            existedTemplate.used_placeholders = data.used_placeholders ?? existedTemplate.used_placeholders;
            existedTemplate.question_type = data.question_type ?? existedTemplate.question_type;
            existedTemplate.filled_prompt = data.filled_prompt ?? existedTemplate.filled_prompt;
            existedTemplate.description = data.description ?? existedTemplate.description;

            // Xử lý trait và model
            if (data.modelId) {
                const model = await ModelsRepository.findOne({
                    where: { id: data.modelId }
                });
                if (!model) {
                    return res.status(404).json({ message: `Model with ID ${data.modelId} not found` });
                }
                existedTemplate.model = model;

                // Nếu không có trait trong request, lấy từ model.ocean
                if (!data.trait && model.ocean) {
                    const match = model.ocean.match(/^([OCEAN])/i);
                    if (match) {
                        existedTemplate.trait = match[1].toUpperCase();
                    }
                }
            }

            if (data.trait) {
                existedTemplate.trait = data.trait.toUpperCase();
            }

            // Update answer fields inline
            existedTemplate.answer_type = data.answer.type ?? existedTemplate.answer_type;
            existedTemplate.answer_scale = data.answer.scale ?? existedTemplate.answer_scale;
            existedTemplate.answer_labels = data.answer.labels ?? existedTemplate.answer_labels;
            existedTemplate.answer_options = data.answer.options ?? existedTemplate.answer_options;

            const updatedTemplate = await TemplateRepository.save(existedTemplate);

            return res.status(200).json({ updatedTemplate });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async deleteTemplateById(req: Request, res: Response) {
        const idData = validateTemplateIdParams(req, res);
        if (!idData) return;

        try {
            const existedTemplate = await TemplateRepository.findOne({
                where: {
                    id: idData.id
                },
            });

            if (!existedTemplate) {
                return res.status(404).json({ message: "Template not found" });
            }

            await TemplateRepository.remove(existedTemplate);

            return res.status(200).json({existedTemplate });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}

export default new TemplateController();
import { Request, Response } from "express";
import { z } from "zod";
import AppDataSource from "../infrastructure/database";
import { Models } from "../entity/models";
import { Behavior } from "../entity/behaviors";
import { BigFive, BigFiveType } from "../entity/big_five";

// Population context schema
const PopulationSchema = z.object({
    age_range: z.string(),
    gender: z.array(z.string()),
    locations: z.array(z.string()),
    urban: z.boolean().optional().default(false),
});

// Context schema
const ContextSchema = z.object({
    population: PopulationSchema,
    setting: z.string(),
    event: z.string(),
});

// New Model schema based on requirements
const CreateBehaviorModelSchema = z.object({
    ocean: z.string(),
    behavior: z.string(),
    keyword: z.string(),
    context: ContextSchema,
});

// Legacy Model schema for backward compatibility
const CreateModelSchema = z.object({
    ocean: z.string(),
    behavior: z.string(),
    age: z.string(),
    location: z.string(),
    gender: z.string(),
    keywords: z.string(),
});

// Create Behavior Model - New endpoint following the requirements
const createBehaviorModel = async (req: Request, res: Response): Promise<void> => {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const validatedData = CreateBehaviorModelSchema.parse(req.body);

        const behaviorRepository = queryRunner.manager.getRepository(Behavior);
        const modelRepository = queryRunner.manager.getRepository(Models);
        const bigFiveRepository = queryRunner.manager.getRepository(BigFive);

        // 1. Check if behavior exists, create if not
        let behaviorEntity = await behaviorRepository.findOne({
            where: { name: validatedData.behavior }
        });

        if (!behaviorEntity) {
            behaviorEntity = behaviorRepository.create({
                name: validatedData.behavior,
                type: validatedData.ocean.toUpperCase(), // Lưu OCEAN trait (O, C, E, A, N)
                keywords: [validatedData.keyword],
                description: `Behavior: ${validatedData.behavior}`,
            });
            behaviorEntity = await behaviorRepository.save(behaviorEntity);
        }

        // 2. Create the model record
        const newModel = modelRepository.create({
            ocean: validatedData.ocean,
            behavior: validatedData.behavior,
            keyword: validatedData.keyword,
            setting: validatedData.context.setting,
            event: validatedData.context.event,
            age: validatedData.context.population.age_range,
            location: validatedData.context.population.locations.join(', '),
            gender: validatedData.context.population.gender.join(', '),
            keywords: validatedData.keyword,
            urban: validatedData.context.population.urban || false,
            behaviorEntity: behaviorEntity,
        });

        const savedModel = await modelRepository.save(newModel);

        // 3. Create BigFive record for the model with default values
        const bigFive = bigFiveRepository.create({
            openness: 0.5,
            conscientiousness: 0.5,
            extraversion: 0.5,
            agreeableness: 0.5,
            neuroticism: 0.5,
            type: BigFiveType.MODEL,
            referenceId: savedModel.id,
        });

        // Adjust the OCEAN trait based on input
        switch (validatedData.ocean.toUpperCase()) {
            case 'O':
                bigFive.openness = 0.7;
                break;
            case 'C':
                bigFive.conscientiousness = 0.7;
                break;
            case 'E':
                bigFive.extraversion = 0.7;
                break;
            case 'A':
                bigFive.agreeableness = 0.7;
                break;
            case 'N':
                bigFive.neuroticism = 0.7;
                break;
        }

        const savedBigFive = await bigFiveRepository.save(bigFive);

        await queryRunner.commitTransaction();

        res.status(201).json({
            success: true,
            message: "Behavior model created successfully",
            data: {
                model: savedModel,
                behavior: behaviorEntity,
                bigFive: savedBigFive,
            },
        });
    } catch (error) {
        await queryRunner.rollbackTransaction();

        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
        } else {
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    } finally {
        await queryRunner.release();
    }
};

// Model Controller Functions (legacy)
const createModel = async (req: Request, res: Response): Promise<void> => {
    try {
        const validatedData = CreateModelSchema.parse(req.body);

        const modelRepository = AppDataSource.getRepository(Models);

        const newModel = modelRepository.create({
            ocean: validatedData.ocean,
            behavior: validatedData.behavior,
            age: validatedData.age,
            location: validatedData.location,
            gender: validatedData.gender,
            keywords: validatedData.keywords,
        });

        const savedModel = await modelRepository.save(newModel);

        res.status(201).json({
            success: true,
            message: "Model created successfully",
            data: savedModel,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
        } else {
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
};

const getAllModels = async (req: Request, res: Response): Promise<void> => {
    try {
        const modelRepository = AppDataSource.getRepository(Models);
        const models = await modelRepository.find({
            relations: ['behaviorEntity'],
            order: { createdAt: "DESC" }
        });

        res.status(200).json({
            success: true,
            message: "Models retrieved successfully",
            data: models,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getModelById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const modelRepository = AppDataSource.getRepository(Models);
        const bigFiveRepository = AppDataSource.getRepository(BigFive);

        const model = await modelRepository.findOne({
            where: { id },
            relations: ['behaviorEntity'],
        });

        if (!model) {
            res.status(404).json({
                success: false,
                message: "Model not found",
            });
            return;
        }

        // Get associated BigFive
        const bigFive = await bigFiveRepository.findOne({
            where: {
                referenceId: id,
                type: BigFiveType.MODEL
            },
        });

        res.status(200).json({
            success: true,
            message: "Model retrieved successfully",
            data: {
                model,
                bigFive,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const modelController = {
    createModel,
    createBehaviorModel,
    getAllModels,
    getModelById,
};
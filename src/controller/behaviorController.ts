import { Request, Response } from 'express';
import { z } from 'zod';
import AppDataSource from '../infrastructure/database';
import { Behavior } from '../entity/behaviors';

const BehaviorSchema = z.object({
    name: z.string(),
    type: z.string(),
    keywords: z.array(z.string()),
    description: z.string().optional()
});

const BehaviorUpdateSchema = z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    description: z.string().optional()
});

const BehaviorIdSchema = z.object({
    id: z.string().uuid(),
});

const BehaviorRepository = AppDataSource.getRepository(Behavior);

function validateBehaviorParams(req: Request, res: Response) {
    const parsed = BehaviorSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json(parsed.error);
        return null;
    }
    return parsed.data;
}

function validateBehaviorUpdateParams(req: Request, res: Response) {
    const parsed = BehaviorUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json(parsed.error);
        return null;
    }
    return parsed.data;
}

class BehaviorController {
    public async createBehavior(req: Request, res: Response) {
        const data = validateBehaviorParams(req, res);
        if (!data) return;

        try {
            const behavior = new Behavior();
            behavior.name = data.name;
            behavior.type = data.type;
            behavior.keywords = data.keywords;
            behavior.description = data.description;

            const savedBehavior = await BehaviorRepository.save(behavior);
            return res.status(201).json(savedBehavior);
        } catch (e) {
            res.status(500).json({ message: "Internal server error" });
            return;
        }
    }

    public async getBehaviorById(req: Request, res: Response) {
        const parsed = BehaviorIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        const behaviorId = parsed.data.id;

        try {
            const behavior = await BehaviorRepository.findOne({
                where: { id: behaviorId }
            });

            if (!behavior) {
                return res.status(404).json({ error: 'Behavior not found' });
            }

            return res.status(200).json(behavior);
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async updateBehaviorById(req: Request, res: Response) {
        const parsed = BehaviorIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        const data = validateBehaviorUpdateParams(req, res);
        if (!data) return;

        const behaviorId = parsed.data.id;

        try {
            const behavior = await BehaviorRepository.findOne({
                where: { id: behaviorId }
            });

            if (!behavior) {
                return res.status(404).json({ error: 'Behavior not found' });
            }

            if (data.name !== undefined) behavior.name = data.name;
            if (data.type !== undefined) behavior.type = data.type;
            if (data.keywords !== undefined) behavior.keywords = data.keywords;
            if (data.description !== undefined) behavior.description = data.description;

            const updatedBehavior = await BehaviorRepository.save(behavior);
            return res.status(200).json(updatedBehavior);
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async deleteBehaviorById(req: Request, res: Response) {
        const parsed = BehaviorIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        const behaviorId = parsed.data.id;

        try {
            const behavior = await BehaviorRepository.findOne({
                where: { id: behaviorId }
            });

            if (!behavior) {
                return res.status(404).json({ error: 'Behavior not found' });
            }

            await BehaviorRepository.delete(behaviorId);
            return res.status(200).json({ message: 'Behavior deleted successfully' });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async getAllBehaviors(req: Request, res: Response) {
        try {
            const behaviors = await BehaviorRepository.find({
                order: { createdAt: 'DESC' }
            });

            return res.status(200).json({
                message: "Behaviors retrieved successfully",
                data: behaviors,
                count: behaviors.length
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}

export default new BehaviorController();
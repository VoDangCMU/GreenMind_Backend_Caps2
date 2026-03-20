import { Request, Response, RequestHandler } from 'express';
import AppDataSource from '../infrastructure/database';
import { WasteCollection, WasteCollectionStatus } from '../entity/waste_collection';
import { Household } from '../entity/household';

class WasteCollectionController {
    /**
     * POST /waste-collections
     * Create a new collection record for the authenticated collector.
     */
    public createCollection: RequestHandler = async (req: Request, res: Response) => {
        const collectorId = req.user?.userId;

        if (!collectorId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { householdId, lat, lng } = req.body;

        if (householdId) {
            const householdRepo = AppDataSource.getRepository(Household);
            const household = await householdRepo.findOneBy({ id: householdId });

            if (!household) {
                res.status(404).json({ message: 'Household not found' });
                return;
            }
        }

        const collectionRepo = AppDataSource.getRepository(WasteCollection);
        const collection = collectionRepo.create({
            collectorId,
            householdId: householdId ?? undefined,
            lat: lat ?? undefined,
            lng: lng ?? undefined,
            status: WasteCollectionStatus.PENDING,
        });

        const saved = await collectionRepo.save(collection);
        res.status(201).json(saved);
    };

    /**
     * GET /waste-collections
     * List all collections belonging to the authenticated collector.
     */
    public getMyCollections: RequestHandler = async (req: Request, res: Response) => {
        const collectorId = req.user?.userId;

        if (!collectorId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const collectionRepo = AppDataSource.getRepository(WasteCollection);
        const collections = await collectionRepo.find({
            where: { collectorId },
            order: { createdAt: 'DESC' },
        });

        res.status(200).json(collections);
    };

    /**
     * GET /waste-collections/:id
     * Get a single collection by ID.
     */
    public getById: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const collectionRepo = AppDataSource.getRepository(WasteCollection);
        const collection = await collectionRepo.findOneBy({ id });

        if (!collection) {
            res.status(404).json({ message: 'Waste collection not found' });
            return;
        }

        res.status(200).json(collection);
    };

    /**
     * PATCH /waste-collections/:id
     * Update status and/or collectedAt timestamp.
     */
    public updateCollection: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const { status, collectedAt } = req.body;

        const validStatuses = Object.values(WasteCollectionStatus);
        if (status && !validStatuses.includes(status)) {
            res.status(400).json({ message: `status must be one of: ${validStatuses.join(', ')}` });
            return;
        }

        const collectionRepo = AppDataSource.getRepository(WasteCollection);
        const collection = await collectionRepo.findOneBy({ id });

        if (!collection) {
            res.status(404).json({ message: 'Waste collection not found' });
            return;
        }

        if (status) collection.status = status;
        if (collectedAt) collection.collectedAt = new Date(collectedAt);

        const updated = await collectionRepo.save(collection);
        res.status(200).json(updated);
    };
}

export default new WasteCollectionController();

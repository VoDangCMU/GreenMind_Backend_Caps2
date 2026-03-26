import { Request, Response, RequestHandler } from 'express';
import AppDataSource from '../infrastructure/database';
import { Ward } from '../entity/wards';
import { WasteReport } from '../entity/waste_report';

const wardRepo = AppDataSource.getRepository(Ward);
const reportRepo = AppDataSource.getRepository(WasteReport);

class WardController {
    public createWard: RequestHandler = async (req: Request, res: Response) => {
        const { name, lat, lng, bounds } = req.body;

        if (!name || lat === undefined || lng === undefined || !bounds) {
            res.status(400).json({ message: 'name, lat, lng, and bounds are required' });
            return;
        }

        if (!Array.isArray(bounds) || bounds.length < 3) {
            res.status(400).json({ message: 'bounds must be an array with at least 3 points' });
            return;
        }

        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        if (isNaN(parsedLat) || isNaN(parsedLng)) {
            res.status(400).json({ message: 'lat and lng must be valid numbers' });
            return;
        }

        const existing = await wardRepo.findOneBy({ name });
        if (existing) {
            res.status(400).json({ message: `Ward with name "${name}" already exists` });
            return;
        }

        const ward = wardRepo.create({
            name,
            lat: parsedLat,
            lng: parsedLng,
            bounds,
        });

        const savedWard = await wardRepo.save(ward);
        res.status(200).json({ savedWard });
    };

    public updateWard: RequestHandler = async (req: Request, res: Response) => {
        const { id } = req.params;
        const { name, lat, lng, bounds } = req.body;

        const ward = await wardRepo.findOneBy({ id: parseInt(id) });
        if (!ward) {
            res.status(404).json({ message: 'Ward not found' });
            return;
        }

        if (bounds !== undefined) {
            if (!Array.isArray(bounds) || bounds.length < 3) {
                res.status(400).json({ message: 'bounds must be an array with at least 3 points' });
                return;
            }
            ward.bounds = bounds;
        }

        if (name !== undefined) {
            const duplicate = await wardRepo.findOneBy({ name });
            if (duplicate && duplicate.id !== ward.id) {
                res.status(400).json({ message: `Ward with name "${name}" already exists` });
                return;
            }
            ward.name = name;
        }

        if (lat !== undefined) {
            const parsedLat = parseFloat(lat);
            if (isNaN(parsedLat)) {
                res.status(400).json({ message: 'lat must be a valid number' });
                return;
            }
            ward.lat = parsedLat;
        }

        if (lng !== undefined) {
            const parsedLng = parseFloat(lng);
            if (isNaN(parsedLng)) {
                res.status(400).json({ message: 'lng must be a valid number' });
                return;
            }
            ward.lng = parsedLng;
        }

        const updatedWard = await wardRepo.save(ward);
        res.status(200).json({ updatedWard });
    };

    public deleteWard: RequestHandler = async (req: Request, res: Response) => {
        const { id } = req.params;
        const wardId = parseInt(id);

        const ward = await wardRepo.findOneBy({ id: wardId });
        if (!ward) {
            res.status(404).json({ message: 'Ward not found' });
            return;
        }

        const reportCount = await reportRepo.countBy({ wardId });
        if (reportCount > 0) {
            res.status(400).json({
                message: `Cannot delete ward: ${reportCount} waste report(s) are linked to this ward`,
            });
            return;
        }

        await wardRepo.remove(ward);
        res.status(200).json({ ward });
    };

    public getAllWards: RequestHandler = async (_req: Request, res: Response) => {
        const wards = await wardRepo.find({ order: { id: 'ASC' } });
        res.status(200).json({
            data: wards.map(w => ({
                id: w.id,
                name: w.name,
                lat: w.lat,
                lng: w.lng,
                bounds: w.bounds,
            })),
        });
    };
}

export default new WardController();

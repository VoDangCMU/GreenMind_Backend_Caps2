import { Request, Response, RequestHandler } from 'express';
import AppDataSource from '../infrastructure/database';
import { WasteReport, WasteReportStatus, WasteType } from '../entity/waste_report';
import { Ward } from '../entity/wards';

async function generateReportCode(reportRepo: ReturnType<typeof AppDataSource.getRepository<WasteReport>>): Promise<string> {
    const count = await reportRepo.count();
    const seq = String(count + 1).padStart(3, '0');
    return `RPT${seq}`;
}

async function findWardByLatLng(lat: number, lng: number): Promise<Ward | null> {
    const wardRepo = AppDataSource.getRepository(Ward);
    const wards = await wardRepo.find();
    if (!wards.length) return null;

    let nearest: Ward = wards[0];
    let minDist = Infinity;
    for (const ward of wards) {
        const dist = Math.hypot(ward.lat - lat, ward.lng - lng);
        if (dist < minDist) {
            minDist = dist;
            nearest = ward;
        }
    }
    return nearest;
}

const VALID_WASTE_TYPES = Object.values(WasteType) as string[];
const reportRepo = AppDataSource.getRepository(WasteReport);

class WasteReportController {
    public createReport: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { wasteType, wasteKg, description, lat, lng, imageUrl } = req.body;

        if (!wasteType || !VALID_WASTE_TYPES.includes(wasteType)) {
            res.status(400).json({ message: `wasteType must be one of: ${VALID_WASTE_TYPES.join(', ')}` });
            return;
        }

        if (lat === undefined || lat === null || lng === undefined || lng === null) {
            res.status(400).json({ message: 'lat and lng are required' });
            return;
        }

        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        if (isNaN(parsedLat) || isNaN(parsedLng)) {
            res.status(400).json({ message: 'lat and lng must be valid numbers' });
            return;
        }

        const ward = await findWardByLatLng(parsedLat, parsedLng);
        if (!ward) {
            res.status(400).json({ message: 'No ward found for the given location' });
            return;
        }

        const code = await generateReportCode(reportRepo);

        const newReport = reportRepo.create({
            householdId: userId,
            code,
            wasteType: wasteType as WasteType,
            wasteKg: wasteKg ?? undefined,
            description: description ?? undefined,
            lat: parsedLat,
            lng: parsedLng,
            imageUrl: imageUrl ?? undefined,
            wardId: ward.id,
            status: WasteReportStatus.PENDING,
        });

        const createdReport = await reportRepo.save(newReport);
        res.status(200).json(createdReport);
    };

    public getMyReports: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { status, page = '1', limit = '10' } = req.query as Record<string, string>;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, parseInt(limit) || 10);

        const qb = reportRepo
            .createQueryBuilder('wr')
            .where('wr.householdId = :userId', { userId })
            .orderBy('wr.createdAt', 'DESC')
            .skip((pageNum - 1) * limitNum)
            .take(limitNum);

        if (status) {
            qb.andWhere('wr.status = :status', { status });
        }

        const [reports, total] = await qb.getManyAndCount();

        res.status(200).json({
            data: reports.map(r => ({
                id: r.id,
                code: r.code,
                wasteType: r.wasteType,
                wasteKg: r.wasteKg,
                status: r.status,
                createdAt: r.createdAt,
            })),
            total,
        });
    };

    public getReportById: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;

        const report = await reportRepo.findOneBy({ id });
        if (!report) {
            res.status(404).json({ message: 'Waste report not found' });
            return;
        }

        res.status(200).json(report);
    };

    public updateReport: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const { wasteType, wasteKg, description } = req.body;

        if (wasteType && !VALID_WASTE_TYPES.includes(wasteType)) {
            res.status(400).json({ message: `wasteType must be one of: ${VALID_WASTE_TYPES.join(', ')}` });
            return;
        }

        const report = await reportRepo.findOneBy({ id });
        if (!report) {
            res.status(404).json({ message: 'Waste report not found' });
            return;
        }

        if (report.status !== WasteReportStatus.PENDING) {
            res.status(400).json({ message: 'Cannot update waste report: status is not pending' });
            return;
        }

        if (wasteType) report.wasteType = wasteType as WasteType;
        if (wasteKg !== undefined) report.wasteKg = wasteKg;
        if (description !== undefined) report.description = description;

        const updatedReport = await reportRepo.save(report);
        res.status(200).json(updatedReport);
    };

    public deleteReport: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;

        const report = await reportRepo.findOneBy({ id });
        if (!report) {
            res.status(404).json({ message: 'Waste report not found' });
            return;
        }

        if (report.status !== WasteReportStatus.PENDING) {
            res.status(400).json({ message: 'Cannot delete waste report: status is not pending' });
            return;
        }

        await reportRepo.remove(report);
        res.status(200).json(report);
    };
}

export default new WasteReportController();

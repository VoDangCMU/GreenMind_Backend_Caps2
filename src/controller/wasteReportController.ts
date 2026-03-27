import { Request, Response, RequestHandler } from 'express';
import AppDataSource from '../infrastructure/database';
import { WasteReport, WasteReportStatus, WasteType } from '../entity/waste_report';

const VALID_WASTE_TYPES = Object.values(WasteType) as string[];
const reportRepo = AppDataSource.getRepository(WasteReport);

async function generateReportCode(): Promise<string> {
    const result = await reportRepo
        .createQueryBuilder('wr')
        .select(`MAX(CAST(SUBSTRING(wr.code FROM 4) AS INTEGER))`, 'maxSeq')
        .getRawOne();
    const next = (result?.maxSeq ?? 0) + 1;
    return `RPT${String(next).padStart(3, '0')}`;
}

class WasteReportController {
    public createReport: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

        const { wasteType, wardName, lat, lng, wasteKg, description, imageKey, imageUrl } = req.body;

        if (!wasteType || !VALID_WASTE_TYPES.includes(wasteType)) {
            res.status(400).json({ message: `wasteType must be one of: ${VALID_WASTE_TYPES.join(', ')}` });
            return;
        }
        if (!wardName || typeof wardName !== 'string' || wardName.trim() === '') {
            res.status(400).json({ message: 'wardName is required' }); return;
        }
        if (lat === undefined || lat === null || lng === undefined || lng === null) {
            res.status(400).json({ message: 'lat and lng are required' }); return;
        }

        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        if (isNaN(parsedLat) || isNaN(parsedLng)) {
            res.status(400).json({ message: 'lat and lng must be valid numbers' }); return;
        }

        const code = await generateReportCode();
        const newReport = reportRepo.create({
            code,
            wasteType: wasteType as WasteType,
            wardName: wardName.trim(),
            lat: parsedLat,
            lng: parsedLng,
            wasteKg: wasteKg !== undefined ? parseFloat(wasteKg) : undefined,
            description: description ?? undefined,
            imageKey: imageKey ?? undefined,
            imageUrl: imageUrl ?? undefined,
            reportedByUserId: userId,
            status: WasteReportStatus.PENDING,
        });

        const created = await reportRepo.save(newReport);
        res.status(200).json(created);
    };

    public getMyReports: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

        const { status, wardName, page = '1', limit = '10' } = req.query as Record<string, string>;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, Math.min(parseInt(limit) || 10, 100));

        const qb = reportRepo
            .createQueryBuilder('wr')
            .where('wr.reportedByUserId = :userId', { userId })
            .orderBy('wr.createdAt', 'DESC')
            .skip((pageNum - 1) * limitNum)
            .take(limitNum);

        if (status) qb.andWhere('wr.status = :status', { status });
        if (wardName) qb.andWhere('wr.wardName = :wardName', { wardName });

        const [data, total] = await qb.getManyAndCount();
        res.status(200).json({ data, total, page: pageNum, limit: limitNum });
    };

    public getAllReports: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

        const { status, wardName, page = '1', limit = '10' } = req.query as Record<string, string>;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, Math.min(parseInt(limit) || 10, 100));

        const qb = reportRepo
            .createQueryBuilder('wr')
            .orderBy('wr.createdAt', 'DESC')
            .skip((pageNum - 1) * limitNum)
            .take(limitNum);

        if (status) qb.andWhere('wr.status = :status', { status });
        if (wardName) qb.andWhere('wr.wardName = :wardName', { wardName });

        const [data, total] = await qb.getManyAndCount();
        res.status(200).json({ data, total, page: pageNum, limit: limitNum });
    };

    public getReportById: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

        const report = await reportRepo.findOneBy({ id: req.params.id });
        if (!report) { res.status(404).json({ message: 'Waste report not found' }); return; }

        if (report.reportedByUserId !== userId) {
            res.status(403).json({ message: 'Forbidden: you can only view your own reports' }); return;
        }

        res.status(200).json(report);
    };

    public updateReport: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

        const { wasteType, wasteKg, description, imageKey, imageUrl } = req.body;

        if (wasteType && !VALID_WASTE_TYPES.includes(wasteType)) {
            res.status(400).json({ message: `wasteType must be one of: ${VALID_WASTE_TYPES.join(', ')}` }); return;
        }

        const report = await reportRepo.findOneBy({ id: req.params.id });
        if (!report) { res.status(404).json({ message: 'Waste report not found' }); return; }

        if (report.reportedByUserId !== userId) {
            res.status(403).json({ message: 'Forbidden: you can only update your own reports' }); return;
        }
        if (report.status !== WasteReportStatus.PENDING) {
            res.status(400).json({ message: 'Cannot update: report is not in pending status' }); return;
        }

        if (wasteType) report.wasteType = wasteType as WasteType;
        if (wasteKg !== undefined) report.wasteKg = parseFloat(wasteKg);
        if (description !== undefined) report.description = description;
        if (imageKey !== undefined) report.imageKey = imageKey;
        if (imageUrl !== undefined) report.imageUrl = imageUrl;

        const updated = await reportRepo.save(report);
        res.status(200).json(updated);
    };

    public deleteReport: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

        const report = await reportRepo.findOneBy({ id: req.params.id });
        if (!report) { res.status(404).json({ message: 'Waste report not found' }); return; }

        if (report.reportedByUserId !== userId) {
            res.status(403).json({ message: 'Forbidden: you can only delete your own reports' }); return;
        }
        if (report.status !== WasteReportStatus.PENDING) {
            res.status(400).json({ message: 'Cannot delete: report is not in pending status' }); return;
        }

        await reportRepo.remove(report);
        res.status(200).json(report);
    };
}

export default new WasteReportController();

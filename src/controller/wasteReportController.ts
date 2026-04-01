import { Request, Response, RequestHandler } from 'express';
import AppDataSource from '../infrastructure/database';
import { WasteReport, WasteReportStatus, WasteType } from '../entity/waste_report';
import { User } from '../entity/user';
import { validate as isUUID } from 'uuid';

const VALID_WASTE_TYPES = Object.values(WasteType) as string[];

function getReportRepo() {
    return AppDataSource.getRepository(WasteReport);
}

async function generateReportCode(): Promise<string> {
    const reportRepo = getReportRepo();
    const result = await reportRepo
        .createQueryBuilder('wr')
        .select(`MAX(CAST(SUBSTRING(wr.code FROM 4) AS INTEGER))`, 'maxSeq')
        .where(`wr.code ~ '^RPT[0-9]+$'`)
        .getRawOne();
    const next = (result?.maxSeq ?? 0) + 1;
    return `RPT${String(next).padStart(3, '0')}`;
}

class WasteReportController {
    public createReport: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const { wasteType, wardName, lat, lng, wasteKg, description, imageKey, imageUrl } = req.body;
            if (!wasteType || !VALID_WASTE_TYPES.includes(wasteType)) {
                res.status(400).json({ message: `wasteType must be one of: ${VALID_WASTE_TYPES.join(', ')}` });
                return;
            }
            if (!wardName || typeof wardName !== 'string' || wardName.trim() === '') {
                res.status(400).json({ message: 'wardName is required' });
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

            const reportRepo = getReportRepo();
            const code = await generateReportCode();
            const newReport = reportRepo.create({
                code,
                wasteType: wasteType as WasteType,
                wardName: wardName.trim(),
                lat: parsedLat,
                lng: parsedLng,
                wasteKg: wasteKg !== undefined ? parseFloat(wasteKg) : undefined,
                description: description ?? undefined,
                imageUrl: imageUrl ?? undefined,
                reportedByUserId: userId,
                status: WasteReportStatus.PENDING,
            });

            const created = await reportRepo.save(newReport);

            res.status(200).json(created);
            return;
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public getMyReports: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const { status, wardName, page = '1', limit = '10' } = req.query as Record<string, string>;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, Math.min(parseInt(limit) || 10, 100));

            const reportRepo = getReportRepo();
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
            return;
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public getReportById: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            if (!isUUID(req.params.id)) {
                return res.status(400).json({ message: 'Invalid reportId' });
            }

            const reportRepo = getReportRepo();
            const report = await reportRepo.findOneBy({ id: req.params.id });
            if (!report) {
                res.status(404).json({ message: 'Waste report not found' });
                return;
            }

            if (report.reportedByUserId !== userId) {
                res.status(403).json({ message: 'Forbidden: you can only view your own reports' });
                return;
            }

            res.status(200).json(report);
            return;
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public updateReport: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            if (!isUUID(req.params.id)) {
                return res.status(400).json({ message: 'Invalid reportId' });
            }

            const { wasteType, wasteKg, description, imageUrl } = req.body;

            if (wasteType && !VALID_WASTE_TYPES.includes(wasteType)) {
                res.status(400).json({ message: `wasteType must be one of: ${VALID_WASTE_TYPES.join(', ')}` });
                return;
            }

            const reportRepo = getReportRepo();
            const report = await reportRepo.findOneBy({ id: req.params.id });
            if (!report) {
                res.status(404).json({ message: 'Waste report not found' });
                return;
            }

            if (report.reportedByUserId !== userId) {
                res.status(403).json({ message: 'Forbidden: you can only update your own reports' });
                return;
            }
            if (report.status !== WasteReportStatus.PENDING) {
                res.status(400).json({ message: 'Cannot update: report is not in pending status' });
                return;
            }

            if (wasteType) report.wasteType = wasteType as WasteType;
            if (wasteKg !== undefined) report.wasteKg = parseFloat(wasteKg);
            if (description !== undefined) report.description = description;
            if (imageUrl !== undefined) report.imageUrl = imageUrl;

            const updated = await reportRepo.save(report);
            res.status(200).json(updated);
            return;
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public deleteReport: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            if (!isUUID(req.params.id)) {
                return res.status(400).json({ message: 'Invalid reportId' });
            }

            const reportRepo = getReportRepo();
            const report = await reportRepo.findOneBy({ id: req.params.id });
            if (!report) {
                res.status(404).json({ message: 'Waste report not found' });
                return;
            }

            if (report.reportedByUserId !== userId) {
                res.status(403).json({ message: 'Forbidden: you can only delete your own reports' });
                return;
            }
            if (report.status !== WasteReportStatus.PENDING) {
                res.status(400).json({ message: 'Cannot delete: report is not in pending status' });
                return;
            }

            await reportRepo.remove(report);

            res.status(200).json(report);
            return;
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public getAllReports: RequestHandler = async (req: Request, res: Response) => {
        try {
            const { status, wardName, page = '1', limit = '10' } = req.query as Record<string, string>;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, Math.min(parseInt(limit) || 10, 100));

            const reportRepo = getReportRepo();
            const qb = reportRepo
                .createQueryBuilder('wr')
                .leftJoinAndSelect('wr.reportedBy', 'reporter')
                .leftJoinAndSelect('wr.assignedCollector', 'collector')
                .orderBy('wr.createdAt', 'DESC')
                .skip((pageNum - 1) * limitNum)
                .take(limitNum);

            if (status) qb.andWhere('wr.status = :status', { status });
            if (wardName) qb.andWhere('wr.wardName = :wardName', { wardName });

            const [rawData, total] = await qb.getManyAndCount();

            const data = rawData.map((r) => ({
                id: r.id,
                code: r.code,
                status: r.status,
                wardName: r.wardName,
                imageUrl: r.imageUrl,
                imageEvidenceUrl: r.imageEvidenceUrl,
                lat: r.lat,
                lng: r.lng,
                wasteKg: r.wasteKg,
                wasteType: r.wasteType,
                description: r.description,
                reportedBy: r.reportedBy?.fullName ?? null,
                reportedByUserId: r.reportedByUserId,
                assignedTo: r.assignedCollector?.fullName ?? null,
                collectorId: r.assignedCollectorId ?? null,
                createdAt: r.createdAt,
                resolvedAt: r.resolvedAt ?? null,
            }));

            res.status(200).json({ data, total, page: pageNum, limit: limitNum });
            return;
        } catch (error) {
            console.error('[getAllReports]', error);
            res.status(500).json({ message: 'Internal server error', detail: String(error) });
            return;
        }
    };

    public getCollectors: RequestHandler = async (req: Request, res: Response) => {
        try {
            const { page = '1', limit = '50' } = req.query as Record<string, string>;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 100));

            const userRepo = AppDataSource.getRepository(User);
            const [collectors, total] = await userRepo.findAndCount({
                where: { role: 'collector' },
                select: ['id', 'fullName', 'email', 'phoneNumber'],
                order: { fullName: 'ASC' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            });

            const reportRepo = getReportRepo();
            const data = await Promise.all(
                collectors.map(async (c) => {
                    const activeCount = await reportRepo.count({
                        where: {
                            assignedCollectorId: c.id,
                            status: WasteReportStatus.ASSIGNED,
                        },
                    });
                    return {
                        id: c.id,
                        fullName: c.fullName,
                        email: c.email,
                        phoneNumber: c.phoneNumber ?? null,
                        activeReports: activeCount,
                    };
                })
            );

            res.status(200).json({ data, total, page: pageNum, limit: limitNum });
            return;
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public assignCollector: RequestHandler = async (req: Request, res: Response) => {
        try {
            const { collectorId } = req.body;
            if (!collectorId) {
                res.status(400).json({ message: 'collectorId is required' });
                return;
            }

            const userRepo = AppDataSource.getRepository(User);
            const collector = await userRepo.findOneBy({ id: collectorId });
            if (!collector) {
                res.status(404).json({ message: 'Collector not found' });
                return;
            }
            if (collector.role !== 'collector') {
                res.status(400).json({ message: 'The specified user is not a collector' });
                return;
            }

            const reportRepo = getReportRepo();
            const report = await reportRepo.findOne({
                where: { id: req.params.reportId },
                relations: ['reportedBy'],
            });
            if (!report) {
                res.status(404).json({ message: 'Waste report not found' });
                return;
            }
            if (report.status !== WasteReportStatus.PENDING) {
                res.status(400).json({ message: 'Can only assign collector to a pending report' });
                return;
            }

            report.assignedCollectorId = collectorId;
            report.status = WasteReportStatus.ASSIGNED;

            const updated = await reportRepo.save(report);

            res.status(200).json(updated);
            return;
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public getReportsByCollector: RequestHandler = async (req: Request, res: Response) => {
        try {
            const { collectorId } = req.params;
            const { status, page = '1', limit = '10' } = req.query as Record<string, string>;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, Math.min(parseInt(limit) || 10, 100));

            const userRepo = AppDataSource.getRepository(User);
            const collector = await userRepo.findOneBy({ id: collectorId });
            if (!collector) {
                res.status(404).json({ message: 'Collector not found' });
                return;
            }

            const reportRepo = getReportRepo();
            const qb = reportRepo
                .createQueryBuilder('wr')
                .leftJoinAndSelect('wr.reportedBy', 'reporter')
                .where('wr.assignedCollectorId = :collectorId', { collectorId })
                .orderBy('wr.createdAt', 'DESC')
                .skip((pageNum - 1) * limitNum)
                .take(limitNum);

            if (status) qb.andWhere('wr.status = :status', { status });

            const [rawData, total] = await qb.getManyAndCount();

            const data = rawData.map((r) => ({
                id: r.id,
                code: r.code,
                status: r.status,
                wardName: r.wardName,
                lat: r.lat,
                lng: r.lng,
                wasteKg: r.wasteKg,
                wasteType: r.wasteType,
                description: r.description,
                imageUrl: r.imageUrl,
                imageEvidenceUrl: r.imageEvidenceUrl,
                reportedByUserId: r.reportedByUserId ?? null,
                reportedBy: r.reportedBy?.fullName ?? null,
                createdAt: r.createdAt,
                resolvedAt: r.resolvedAt ?? null,
            }));

            res.status(200).json({
                collector: { id: collector.id, fullName: collector.fullName },
                data,
                total,
                page: pageNum,
                limit: limitNum,
            });
            return;
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public getAssignedReports: RequestHandler = async (req: Request, res: Response) => {
        try {
            const collectorId = req.user?.userId;
            if (!collectorId) { res.status(401).json({ message: 'Unauthorized' }); return; }

            const { status, page = '1', limit = '10' } = req.query as Record<string, string>;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, Math.min(parseInt(limit) || 10, 100));

            const validStatuses = [WasteReportStatus.ASSIGNED, WasteReportStatus.DONE] as string[];
            if (status && !validStatuses.includes(status)) {
                res.status(400).json({ message: `status must be one of: ${validStatuses.join(', ')}` }); return;
            }

            const reportRepo = getReportRepo();
            const qb = reportRepo
                .createQueryBuilder('wr')
                .leftJoinAndSelect('wr.reportedBy', 'reporter')
                .where('wr.assignedCollectorId = :collectorId', { collectorId })
                .orderBy('wr.createdAt', 'DESC')
                .skip((pageNum - 1) * limitNum)
                .take(limitNum);

            if (status) qb.andWhere('wr.status = :status', { status });

            const [rawData, total] = await qb.getManyAndCount();

            const data = rawData.map((r) => ({
                id: r.id,
                code: r.code,
                reportedBy: r.reportedBy?.fullName ?? null,
                lat: r.lat,
                lng: r.lng,
                wasteKg: r.wasteKg,
                wasteType: r.wasteType,
                description: r.description,
                imageUrl: r.imageUrl,
                imageEvidenceUrl: r.imageEvidenceUrl,
                status: r.status,
                createdAt: r.createdAt,
                resolvedAt: r.resolvedAt ?? null,
            }));

            res.status(200).json({ data, total });
            return;
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public getAssignedReportById: RequestHandler = async (req: Request, res: Response) => {
        try {
            const collectorId = req.user?.userId;
            if (!collectorId) { res.status(401).json({ message: 'Unauthorized' }); return; }

            const reportRepo = getReportRepo();
            const report = await reportRepo.findOne({
                where: { id: req.params.id },
                relations: ['reportedBy'],
            });

            if (!report) { res.status(404).json({ message: 'Waste report not found' }); return; }

            if (report.assignedCollectorId !== collectorId) {
                res.status(403).json({ message: 'Forbidden: this report is not assigned to you' }); return;
            }

            res.status(200).json(report);
            return;
        }
        catch (error) {
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public markReportDone: RequestHandler = async (req: Request, res: Response) => {
        const collectorId = req.user?.userId;
        if (!collectorId) { res.status(401).json({ message: 'Unauthorized' }); return; }

        const { status } = req.body;

        if (status !== WasteReportStatus.DONE) {
            res.status(400).json({ message: 'status must be "done"' }); return;
        }

        const reportRepo = getReportRepo();
        const report = await reportRepo.findOneBy({ id: req.params.id });

        if (!report) {
            res.status(404).json({ message: 'Waste report not found' });
            return;
        }

        if (report.assignedCollectorId !== collectorId) {
            res.status(403).json({ message: 'Forbidden: this report is not assigned to you' });
            return;
        }
        if (report.status !== WasteReportStatus.ASSIGNED) {
            res.status(400).json({ message: 'Can only mark an assigned report as done' });
            return;
        }

        report.status = WasteReportStatus.DONE;
        report.resolvedAt = new Date();

        const updated = await reportRepo.save(report);

        res.status(200).json({
            id: updated.id,
            status: updated.status,
            resolvedAt: updated.resolvedAt,
        });
        return;
    };

    public updateReportStatus: RequestHandler = async (req: Request, res: Response) => {
        try {
            const collectorId = req.user?.userId;
            if (!collectorId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const { status, imageEvidenceUrl } = req.body;
            const allowedStatuses = [WasteReportStatus.DONE] as string[];

            if (!status || !allowedStatuses.includes(status)) {
                res.status(400).json({ message: `status must be one of: ${allowedStatuses.join(', ')}` });
                return;
            }

            if (!imageEvidenceUrl || typeof imageEvidenceUrl !== 'string' || imageEvidenceUrl.trim() === '') {
                res.status(400).json({ message: 'imageEvidenceUrl is required when marking report as done' });
                return;
            }

            const reportRepo = getReportRepo();
            const report = await reportRepo.findOne({
                where: { id: req.params.id },
                relations: ['reportedBy'],
            });

            if (!report) {
                res.status(404).json({ message: 'Waste report not found' });
                return;
            }
            if (report.assignedCollectorId !== collectorId) {
                res.status(403).json({ message: 'Forbidden: this report is not assigned to you' });
                return;
            }
            if (report.status !== WasteReportStatus.ASSIGNED) {
                res.status(400).json({ message: 'Can only update status of an assigned report' });
                return;
            }

            report.status = status as WasteReportStatus;
            report.imageEvidenceUrl = imageEvidenceUrl.trim();
            report.resolvedAt = new Date();

            const updated = await reportRepo.save(report);

            res.status(200).json(updated);
            return;
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };
}

export default new WasteReportController();

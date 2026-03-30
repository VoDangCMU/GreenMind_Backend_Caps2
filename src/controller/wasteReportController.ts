import { Request, Response, RequestHandler } from 'express';
import AppDataSource from '../infrastructure/database';
import { WasteReport, WasteReportStatus } from '../entity/waste_report';
import { User } from '../entity/user';
import { validate as isUUID } from 'uuid';
import { z } from 'zod';
import TEXT from '../config/schemas/Text';
import DECIMAL from '../config/schemas/Decimal';


function getReportRepo() {
    return AppDataSource.getRepository(WasteReport);
}

async function generateReportCode(): Promise<string> {
    const reportRepo = getReportRepo();
    const result = await reportRepo
        .createQueryBuilder('wr')
        .select(`MAX(CAST(SUBSTRING(wr.code FROM 4) AS INTEGER))`, 'maxSeq')
        .getRawOne();
    const next = (result?.maxSeq ?? 0) + 1;
    return `RPT${String(next).padStart(3, '0')}`;
}

const WateReportParamsSchema = z.object({
    description: TEXT.optional(),
    imageUrl: z.string().url(),
    lat: DECIMAL,
    lng: DECIMAL,
    wasteKg: DECIMAL,
    wardName: TEXT,
});

const API_URL = "https://ai-greenmind.khoav4.com/predict-pollutant-impact";
const MOCK_DATA = {
    "items": [
        {
            "name": "Plastic film",
            "quantity": 9,
            "area": 147757
        },
        {
            "name": "Single-use carrier bag",
            "quantity": 2,
            "area": 18706
        }
    ],
    "total_objects": 11,
    "image_url": "https://res.cloudinary.com/dc8q7sv1f/image/upload/v1774678190/yolo_detect/detect/d11639b05dd24f4b967b03e2d7f31c8c.jpg",
    "pollution": {
        "CO2": 0.6931471805569416,
        "microplastic": 0.6931471805569416,
        "dioxin": 0.5365526341607301,
        "non_biodegradable": 0.6931471805569416,
        "CH4": 0.0,
        "PM2.5": 0.0,
        "NOx": 0.0,
        "SO2": 0.0,
        "Pb": 0.0,
        "Hg": 0.0,
        "Cd": 0.0,
        "nitrate": 0.0,
        "chemical_residue": 0.0,
        "toxic_chemicals": 0.0,
        "styrene": 0.0
    },
    "impact": {
        "air_pollution": 1.2296998147176716,
        "water_pollution": 0.6931471805569416,
        "soil_pollution": 1.3862943611138832
    }
}
const watesReportRepo = AppDataSource.getRepository(WasteReport);

class WasteReportController {
    public createReport: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const user = await AppDataSource.getRepository(User).findOneBy({ id: userId });
            if (!user) {
                return res.status(401).json({ message: 'Unauthorized: user not found' });

            }
            const parsed = WateReportParamsSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ message: 'Invalid request body', errors: parsed.error.errors });
            }
            const data = parsed.data;
            const code = await generateReportCode();
            const newWasteReport = watesReportRepo.create({
                code: code,
                description: data.description,
                imageUrl: data.imageUrl,
                lat: data.lat,
                lng: data.lng,
                wasteKg: data.wasteKg,
                wardName: data.wardName,
                reportedByUserId: userId,
                reportedBy: user,
            });
            await watesReportRepo.save(newWasteReport);

            try {
                // const response = axios.post(API_URL, {
                //     image_url: data.imageUrl,
                // });
                // const result = (await response).data;
                const result = MOCK_DATA;
                newWasteReport.items = result.items;
                newWasteReport.totalObjects = result.total_objects;
                newWasteReport.pollution = result.pollution;
                newWasteReport.impact = result.impact;
                newWasteReport.aiAnalysis = result.image_url;
                await watesReportRepo.save(newWasteReport);
            } catch (error) {
                console.error('Error calling AI service:', error);
            }

            res.status(200).json(newWasteReport);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    public getMyReports: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const report = await watesReportRepo.find({
                where: { reportedByUserId: userId },
                order: { createdAt: 'DESC' },
                relations: ['reportedBy', 'assignedCollector']
            });
            res.status(200).json(report);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
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

            const report = await watesReportRepo.findOne({
                where: { id: req.params.id },
                relations: ['reportedBy', 'assignedCollector']
            })

            if (!report) {
                res.status(404).json({ message: 'Waste report not found' });
                return;
            }

            if (report.reportedByUserId !== userId) {
                res.status(403).json({ message: 'Forbidden: you can only view your own reports' });
                return;
            }

            res.status(200).json(report);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
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

            const { wasteKg, description, imageUrl } = req.body;

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

            if (wasteKg !== undefined) report.wasteKg = parseFloat(wasteKg);
            if (description !== undefined) report.description = description;
            if (imageUrl !== undefined) report.imageUrl = imageUrl;



            await reportRepo.save(report);

            if (imageUrl !== undefined) {
                try {
                    // const response = await axios.post(API_URL, {
                    //     image_url: report.imageUrl,
                    // });
                    // const result = response.data;
                    const result = MOCK_DATA;
                    report.items = result.items;
                    report.totalObjects = result.total_objects;
                    report.pollution = result.pollution;
                    report.impact = result.impact;
                    report.aiAnalysis = result.image_url;
                    await reportRepo.save(report);
                } catch (error) {
                    console.error('Error calling AI service:', error);
                }
            }

            res.status(200).json(report);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
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
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    public getAllReports: RequestHandler = async (req: Request, res: Response) => {
        try {
            const reports = await getReportRepo().find({
                order: { createdAt: 'DESC' },
                relations: ['reportedBy', 'assignedCollector']
            });
            res.status(200).json(reports);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
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
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
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
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
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

            const data = rawData;

            res.status(200).json({
                collector: { id: collector.id, fullName: collector.fullName },
                data,
                total,
                page: pageNum,
                limit: limitNum,
            });
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
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

            const data = rawData;

            res.status(200).json({ data, total });
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
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
        }
        catch (error) {
            res.status(500).json({ message: 'Internal server error' });
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
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    };
}

export default new WasteReportController();

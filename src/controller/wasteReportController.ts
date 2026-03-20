import { Request, Response, RequestHandler } from 'express';
import AppDataSource from '../infrastructure/database';
import { WasteReport, WasteReportStatus } from '../entity/waste_report';
import { Household } from '../entity/household';
import { getS3Url } from '../utils/s3Helper';

class WasteReportController {
    /**
     * POST /waste-reports
     * Create a new waste report for a household.
     */
    public createReport: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { householdId, description, imageKey, lat, lng } = req.body;

        if (!householdId) {
            res.status(400).json({ message: 'householdId is required' });
            return;
        }

        const householdRepo = AppDataSource.getRepository(Household);
        const household = await householdRepo.findOneBy({ id: householdId });

        if (!household) {
            res.status(404).json({ message: 'Household not found' });
            return;
        }

        const reportRepo = AppDataSource.getRepository(WasteReport);
        const report = reportRepo.create({
            householdId,
            description,
            imageKey: imageKey ?? undefined,
            imageUrl: imageKey ? getS3Url(imageKey) : undefined,
            lat: lat ?? undefined,
            lng: lng ?? undefined,
            status: WasteReportStatus.PENDING,
        });

        const saved = await reportRepo.save(report);
        res.status(201).json(saved);
    };

    /**
     * GET /waste-reports/household/:householdId
     * List all reports belonging to a specific household.
     */
    public getByHousehold: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { householdId } = req.params;
        const reportRepo = AppDataSource.getRepository(WasteReport);

        const reports = await reportRepo.find({
            where: { householdId },
            order: { createdAt: 'DESC' },
        });

        res.status(200).json(reports);
    };

    /**
     * GET /waste-reports/urban-area/:urbanAreaId
     * Aggregate all reports for all households in an urban area.
     */
    public getByUrbanArea: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { urbanAreaId } = req.params;

        const reportRepo = AppDataSource.getRepository(WasteReport);

        const reports = await reportRepo
            .createQueryBuilder('wr')
            .innerJoin('wr.household', 'h')
            .where('h.urbanAreaId = :urbanAreaId', { urbanAreaId })
            .orderBy('wr.createdAt', 'DESC')
            .getMany();

        const byStatus = {
            [WasteReportStatus.PENDING]: 0,
            [WasteReportStatus.ASSIGNED]: 0,
            [WasteReportStatus.RESOLVED]: 0,
            [WasteReportStatus.REJECTED]: 0,
        };

        for (const r of reports) {
            byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
        }

        res.status(200).json({
            urbanAreaId,
            totalReports: reports.length,
            byStatus,
            reports,
        });
    };

    /**
     * PATCH /waste-reports/:id/status
     * Update the status of a report. Also sets assignedCollectorId when ASSIGNED.
     */
    public updateStatus: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const { status, assignedCollectorId } = req.body;

        const validStatuses = Object.values(WasteReportStatus);
        if (!status || !validStatuses.includes(status)) {
            res.status(400).json({ message: `status must be one of: ${validStatuses.join(', ')}` });
            return;
        }

        const reportRepo = AppDataSource.getRepository(WasteReport);
        const report = await reportRepo.findOneBy({ id });

        if (!report) {
            res.status(404).json({ message: 'Waste report not found' });
            return;
        }

        report.status = status;

        if (status === WasteReportStatus.ASSIGNED && assignedCollectorId) {
            report.assignedCollectorId = assignedCollectorId;
        }

        const updated = await reportRepo.save(report);
        res.status(200).json(updated);
    };
}

export default new WasteReportController();

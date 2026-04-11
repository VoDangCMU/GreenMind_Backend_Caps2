import { Request, Response, RequestHandler } from 'express';
import AppDataSource from '../infrastructure/database';
import { WasteReport, WasteReportStatus, WasteType } from '../entity/waste_report';
import { User } from '../entity/user';
import { validate as isUUID } from 'uuid';
import axios from 'axios';
import FormData from 'form-data';

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

            const { wasteType, wardName, lat, lng, description, imageUrl } = req.body;
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

            let segmentedImageUrl: string | undefined;
            let depthImageUrl: string | undefined;
            let heatmapUrl: string | undefined;
            let segmentRatio: number | undefined;
            let pollutionScore: number | undefined;
            let pollutionLevel: string | undefined;

            if (imageUrl) {
                try {
                    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(imageResponse.data, 'binary');

                    const formData = new FormData();
                    formData.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });

                    console.log(`[AI-Detect] Sending image to AI prediction API...`);
                    const aiResponse = await axios.post('https://ai-greenmind.khoav4.com/predict_trash_seg', formData, {
                        headers: formData.getHeaders()
                    });

                    if (aiResponse.data) {
                        segmentedImageUrl = aiResponse.data.segment_image_url;
                        depthImageUrl = aiResponse.data.depth_image_url;
                        heatmapUrl = aiResponse.data.heatmap_url;
                        segmentRatio = aiResponse.data.segment_ratio;
                        pollutionScore = aiResponse.data.pollution_score;
                        pollutionLevel = aiResponse.data.pollution_level;
                        console.log(`[AI-Detect] Success. Segment ratio: ${segmentRatio}`);
                    }
                } catch (aiError) {
                    console.error('[AI-Detect] Error calling prediction API:', aiError);
                }
            }

            const newReport = reportRepo.create({
                code,
                wasteType: wasteType as WasteType,
                wardName: wardName.trim(),
                lat: parsedLat,
                lng: parsedLng,
                description: description ?? undefined,
                imageUrl: imageUrl ?? undefined,
                segmentedImageUrl,
                depthImageUrl,
                heatmapUrl,
                segmentRatio,
                pollutionScore,
                pollutionLevel,
                reportedByUserId: userId,
                status: WasteReportStatus.PENDING,
            });

            const created = await reportRepo.save(newReport);

            let aiMessage = "Report created successfully.";
            if (imageUrl) {
                if (segmentedImageUrl && segmentRatio !== undefined) {
                    aiMessage = "Report created successfully with AI analysis.";
                } else {
                    aiMessage = "Report created successfully. AI analysis failed.";
                }
            }

            res.status(200).json({
                message: aiMessage,
                data: created
            });
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

            const { wasteType, description, imageUrl } = req.body;

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
                segmentedImageUrl: r.segmentedImageUrl,
                depthImageUrl: r.depthImageUrl,
                heatmapUrl: r.heatmapUrl,
                segmentRatio: r.segmentRatio,
                pollutionScore: r.pollutionScore,
                pollutionLevel: r.pollutionLevel,
                imageEvidenceUrl: r.imageEvidenceUrl,
                lat: r.lat,
                lng: r.lng,
                wasteType: r.wasteType,
                description: r.description,
                reportedBy: r.reportedBy?.fullName ?? null,
                reportedByUserId: r.reportedByUserId,
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

    public getLeaderboard: RequestHandler = async (req: Request, res: Response) => {
        try {
            const rows = await getReportRepo()
                .createQueryBuilder('wr')
                .select('wr.reportedByUserId', 'userId')
                .addSelect('u.fullName', 'fullName')
                .addSelect('u.username', 'username')
                .addSelect('COUNT(wr.id)', 'reportCount')
                .innerJoin(User, 'u', 'u.id = wr.reportedByUserId')
                .where('wr.reportedByUserId IS NOT NULL')
                .groupBy('wr.reportedByUserId')
                .addGroupBy('u.fullName')
                .addGroupBy('u.username')
                .orderBy('COUNT(wr.id)', 'DESC')
                .limit(10)
                .getRawMany();

            const data = rows.map((row, index) => ({
                rank: index + 1,
                userId: row.userId,
                fullName: row.fullName,
                username: row.username,
                reportCount: parseInt(row.reportCount, 10),
            }));

            res.status(200).json({ data });
        } catch (error) {
            console.error('[getLeaderboard]', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
}

export default new WasteReportController();

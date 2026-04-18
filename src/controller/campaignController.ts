import { Request, Response, RequestHandler } from 'express';
import AppDataSource from '../infrastructure/database';
import { Campaign, CampaignStatus } from '../entity/campaign';
import { CampaignParticipant, ParticipantStatus } from '../entity/campaign_participants';
import { WasteReport, WasteReportStatus } from '../entity/waste_report';
import { User } from '../entity/user';
import { CampaignMessage } from '../entity/campaign_message';
import { In } from 'typeorm';
import { validate as isUUID } from 'uuid';

function getCampaignRepo() {
    return AppDataSource.getRepository(Campaign);
}

function getParticipantRepo() {
    return AppDataSource.getRepository(CampaignParticipant);
}

function getReportRepo() {
    return AppDataSource.getRepository(WasteReport);
}

function getUserRepo() {
    return AppDataSource.getRepository(User);
}

function getMessageRepo() {
    return AppDataSource.getRepository(CampaignMessage);
}


function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

class CampaignController {
    public createCampaign: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const userExists = await getUserRepo().existsBy({ id: userId });
            if (!userExists) {
                res.status(401).json({ message: 'Authenticated user not found in database. Please log in again.' });
                return;
            }

            const { name, description, startDate, endDate, lat, lng, radius, reportIds } = req.body;

            if (!name || !startDate || !endDate || lat === undefined || lng === undefined) {
                res.status(400).json({ message: 'Missing required fields: name, startDate, endDate, lat, lng' });
                return;
            }

            const campaignRepo = getCampaignRepo();
            const newCampaign = campaignRepo.create({
                name,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                radius: radius !== undefined ? parseFloat(radius) : 500,
                createdByUserId: userId,
                status: CampaignStatus.PENDING,
            });

            const savedCampaign = await campaignRepo.save(newCampaign);

            if (Array.isArray(reportIds) && reportIds.length > 0) {
                const reportRepo = getReportRepo();
                await reportRepo.update(
                    { id: In(reportIds) },
                    { campaignId: savedCampaign.id, status: WasteReportStatus.APPROVED }
                );
            }

            res.status(200).json(savedCampaign);
            return;
        } catch (error) {
            console.error('[createCampaign]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public getAllCampaigns: RequestHandler = async (req: Request, res: Response) => {
        try {
            const { status, lat, lng, radius } = req.query as Record<string, string>;

            const campaignRepo = getCampaignRepo();
            const qb = campaignRepo.createQueryBuilder('c')
                .leftJoinAndSelect('c.reports', 'reports')
                .leftJoinAndSelect('c.createdBy', 'createdBy')
                .leftJoinAndSelect('c.participants', 'participants')
                .leftJoinAndSelect('participants.user', 'participantUser')
                .orderBy('c.createdAt', 'DESC');

            if (status) {
                qb.andWhere('c.status = :status', { status });
            }

            const rawData = await qb.getMany();

            let data = rawData;

            if (lat && lng && radius) {
                const centerLat = parseFloat(lat);
                const centerLng = parseFloat(lng);
                const maxRad = parseFloat(radius);
                if (!isNaN(centerLat) && !isNaN(centerLng) && !isNaN(maxRad)) {
                    data = data.filter(c => getDistanceFromLatLonInM(centerLat, centerLng, c.lat, c.lng) <= maxRad);
                }
            }

            const responseData = data.map(c => ({
                ...c,
                createdBy: c.createdBy ? { id: c.createdBy.id, fullName: c.createdBy.fullName } : null,
                participantsCount: c.participants ? c.participants.length : 0,
                participants: c.participants?.map(p => ({
                    id: p.id,
                    status: p.status,
                    checkInTime: p.checkInTime,
                    checkOutTime: p.checkOutTime,
                    user: p.user ? {
                        id: p.user.id,
                        fullName: p.user.fullName,
                        email: p.user.email,
                        phoneNumber: p.user.phoneNumber
                    } : null
                }))
            }));

            res.status(200).json(responseData);
            return;
        } catch (error) {
            console.error('[getAllCampaigns]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public getCampaignById: RequestHandler = async (req: Request, res: Response) => {
        try {
            if (!isUUID(req.params.id)) {
                res.status(400).json({ message: 'Invalid campaign ID' });
                return;
            }

            const campaignRepo = getCampaignRepo();
            const campaign = await campaignRepo.findOne({
                where: { id: req.params.id },
                relations: ['reports', 'reports.reportedBy', 'createdBy', 'participants', 'participants.user']
            });

            if (!campaign) {
                res.status(404).json({ message: 'Campaign not found' });
                return;
            }

            const formattedCampaign = {
                ...campaign,
                participantsCount: campaign.participants ? campaign.participants.length : 0,
                participants: campaign.participants?.map(p => ({
                    id: p.id,
                    status: p.status,
                    checkInTime: p.checkInTime,
                    checkOutTime: p.checkOutTime,
                    user: p.user ? {
                        id: p.user.id,
                        fullName: p.user.fullName,
                        email: p.user.email,
                        phoneNumber: p.user.phoneNumber
                    } : null
                }))
            };

            res.status(200).json(formattedCampaign);
            return;
        } catch (error) {
            console.error('[getCampaignById]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public getCampaignMessages: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const campaignId = req.params.id;
            if (!isUUID(campaignId)) {
                res.status(400).json({ message: 'Invalid campaign ID' });
                return;
            }

            const campaignRepo = getCampaignRepo();
            const campaign = await campaignRepo.findOneBy({ id: campaignId });

            if (!campaign) {
                res.status(404).json({ message: 'Campaign not found' });
                return;
            }

            const isCreator = campaign.createdByUserId === userId;
            const participantRepo = getParticipantRepo();
            const participant = await participantRepo.findOneBy({ campaignId, userId });

            if (!isCreator && (!participant || participant.status !== ParticipantStatus.REGISTERED && participant.status !== ParticipantStatus.CHECKED_IN && participant.status !== ParticipantStatus.COMPLETED)) {
                res.status(403).json({ message: 'Only registered participants can view messages' });
                return;
            }

            const { skip = 0, take = 50 } = req.query;

            const messageRepo = getMessageRepo();
            const [messages, total] = await messageRepo.findAndCount({
                where: { campaignId },
                relations: ['sender'],
                order: { createdAt: 'DESC' }, // Lastest first
                skip: Number(skip),
                take: Number(take)
            });

            const formattedMessages = messages.map(msg => ({
                id: msg.id,
                campaignId: msg.campaignId,
                sender: {
                    id: msg.sender.id,
                    fullName: msg.sender.fullName,
                    role: msg.sender.role
                },
                content: msg.content,
                createdAt: msg.createdAt
            })).reverse();

            res.status(200).json({
                data: formattedMessages,
                total,
                skip: Number(skip),
                take: Number(take)
            });
            return;
        } catch (error) {
            console.error('[getCampaignMessages]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public updateCampaign: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            if (!isUUID(req.params.id)) {
                res.status(400).json({ message: 'Invalid campaign ID' });
                return;
            }

            const campaignRepo = getCampaignRepo();
            const campaign = await campaignRepo.findOneBy({ id: req.params.id });

            if (!campaign) {
                res.status(404).json({ message: 'Campaign not found' });
                return;
            }


            const { name, description, startDate, endDate, lat, lng } = req.body;

            if (name !== undefined) campaign.name = name;
            if (description !== undefined) campaign.description = description;
            if (startDate !== undefined) campaign.startDate = new Date(startDate);
            if (endDate !== undefined) campaign.endDate = new Date(endDate);
            if (lat !== undefined) campaign.lat = parseFloat(lat);
            if (lng !== undefined) campaign.lng = parseFloat(lng);

            const updated = await campaignRepo.save(campaign);

            res.status(200).json(updated);
            return;
        } catch (error) {
            console.error('[updateCampaign]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public deleteCampaign: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            if (!isUUID(req.params.id)) {
                res.status(400).json({ message: 'Invalid campaign ID' });
                return;
            }

            const campaignRepo = getCampaignRepo();
            const campaign = await campaignRepo.findOneBy({ id: req.params.id });

            if (!campaign) {
                res.status(404).json({ message: 'Campaign not found' });
                return;
            }

            await campaignRepo.remove(campaign);

            res.status(200).json(campaign);
            return;
        } catch (error) {
            console.error('[deleteCampaign]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public registerCampaign: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const campaignId = req.params.id;
            if (!isUUID(campaignId)) {
                res.status(400).json({ message: 'Invalid campaign ID' });
                return;
            }

            const campaignRepo = getCampaignRepo();
            const campaign = await campaignRepo.findOneBy({ id: campaignId });

            if (!campaign) {
                res.status(404).json({ message: 'Campaign not found' });
                return;
            }

            if (campaign.status === CampaignStatus.CANCELLED || campaign.status === CampaignStatus.COMPLETED) {
                res.status(400).json({ message: `Cannot register for a ${campaign.status.toLowerCase()} campaign` });
                return;
            }

            const participantRepo = getParticipantRepo();
            const existingParticipant = await participantRepo.findOneBy({ campaignId, userId });

            if (existingParticipant) {
                res.status(400).json({ message: 'User is already registered for this campaign' });
                return;
            }

            const newParticipant = participantRepo.create({
                campaignId,
                userId,
                status: ParticipantStatus.REGISTERED
            });

            await participantRepo.save(newParticipant);

            res.status(200).json(newParticipant);
            return;
        } catch (error) {
            console.error('[registerCampaign]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public checkInCampaign: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const campaignId = req.params.id;
            if (!isUUID(campaignId)) {
                res.status(400).json({ message: 'Invalid campaign ID' });
                return;
            }

            const { lat, lng } = req.body;
            if (lat === undefined || lng === undefined) {
                res.status(400).json({ message: 'Missing lat, lng for check-in' });
                return;
            }

            const campaignRepo = getCampaignRepo();
            const campaign = await campaignRepo.findOneBy({ id: campaignId });

            if (!campaign) {
                res.status(404).json({ message: 'Campaign not found' });
                return;
            }

            const participantRepo = getParticipantRepo();
            const participant = await participantRepo.findOneBy({ campaignId, userId });

            if (!participant) {
                res.status(400).json({ message: 'User is not registered for this campaign' });
                return;
            }

            if (participant.status !== ParticipantStatus.REGISTERED) {
                res.status(400).json({ message: `Cannot check in. Current status: ${participant.status}` });
                return;
            }

            const distance = getDistanceFromLatLonInM(campaign.lat, campaign.lng, parseFloat(lat), parseFloat(lng));
            if (distance > campaign.radius) {
                res.status(400).json({ message: `Bạn đang ở quá xa khu vực tập trung (cách ${Math.round(distance)}m, tối đa ${campaign.radius}m)` });
                return;
            }

            participant.status = ParticipantStatus.CHECKED_IN;
            participant.checkInTime = new Date();
            participant.checkInLat = parseFloat(lat);
            participant.checkInLng = parseFloat(lng);

            await participantRepo.save(participant);

            res.status(200).json(participant);
            return;
        } catch (error) {
            console.error('[checkInCampaign]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public checkOutCampaign: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const campaignId = req.params.id;
            if (!isUUID(campaignId)) {
                res.status(400).json({ message: 'Invalid campaign ID' });
                return;
            }

            const { lat, lng } = req.body;
            if (lat === undefined || lng === undefined) {
                res.status(400).json({ message: 'Missing lat, lng for check-out' });
                return;
            }

            const participantRepo = getParticipantRepo();
            const participant = await participantRepo.findOneBy({ campaignId, userId });

            if (!participant) {
                res.status(400).json({ message: 'User is not registered for this campaign' });
                return;
            }

            if (participant.status !== ParticipantStatus.CHECKED_IN) {
                res.status(400).json({ message: `Cannot check out. User has not checked in. Current status: ${participant.status}` });
                return;
            }

            participant.status = ParticipantStatus.COMPLETED;
            participant.checkOutTime = new Date();
            participant.checkOutLat = parseFloat(lat);
            participant.checkOutLng = parseFloat(lng);

            await participantRepo.save(participant);

            res.status(200).json(participant);
            return;
        } catch (error) {
            console.error('[checkOutCampaign]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public updateCampaignStatus: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const campaignId = req.params.id;
            const { status } = req.body;

            if (!isUUID(campaignId)) {
                res.status(400).json({ message: 'Invalid campaign ID' });
                return;
            }

            const validStatuses = Object.values(CampaignStatus);
            if (!validStatuses.includes(status)) {
                res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
                return;
            }

            const campaignRepo = getCampaignRepo();
            const campaign = await campaignRepo.findOneBy({ id: campaignId });

            if (!campaign) {
                res.status(404).json({ message: 'Campaign not found' });
                return;
            }

            campaign.status = status;
            await campaignRepo.save(campaign);

            if (status === CampaignStatus.COMPLETED) {
                const reportRepo = getReportRepo();
                await reportRepo.update(
                    { campaignId: campaign.id },
                    { status: WasteReportStatus.DONE, resolvedAt: new Date() }
                );

                console.log(`[Push Notification] Campaign ${campaign.name} completed. Sending notifications to checked-out volunteers to grant points/thank.`);
            }

            res.status(200).json(campaign);
            return;
        } catch (error) {
            console.error('[updateCampaignStatus]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public cancelCampaign: RequestHandler = async (req: Request, res: Response) => {
        try {
            const requestUserId = req.user?.userId;

            if (!requestUserId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const campaignId = req.params.id;
            if (!isUUID(campaignId)) {
                res.status(400).json({ message: 'Invalid campaign ID' });
                return;
            }

            const campaignRepo = getCampaignRepo();
            const campaign = await campaignRepo.findOne({
                where: { id: campaignId },
            });

            if (!campaign) {
                res.status(404).json({ message: 'Campaign not found' });
                return;
            }

            if (campaign.status === CampaignStatus.COMPLETED) {
                res.status(400).json({ message: 'Cannot cancel a completed campaign' });
                return;
            }

            if (campaign.status === CampaignStatus.CANCELLED) {
                res.status(400).json({ message: 'Campaign is already cancelled' });
                return;
            }

            campaign.status = CampaignStatus.CANCELLED;
            const updated = await campaignRepo.save(campaign);

            res.status(200).json(updated);
            return;
        } catch (error) {
            console.error('[cancelCampaign]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };
}

export default new CampaignController();

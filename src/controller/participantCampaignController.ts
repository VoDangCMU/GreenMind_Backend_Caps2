import { Request, Response, RequestHandler } from 'express';
import AppDataSource from '../infrastructure/database';
import { Campaign, CampaignStatus } from '../entity/campaign';
import { CampaignParticipant, ParticipantStatus } from '../entity/campaign_participants';
import { CampaignMessage } from '../entity/campaign_message';
import { validate as isUUID } from 'uuid';

function getCampaignRepo() {
    return AppDataSource.getRepository(Campaign);
}

function getParticipantRepo() {
    return AppDataSource.getRepository(CampaignParticipant);
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

class ParticipantCampaignController {
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

            if (existingParticipant && ['PENDING', 'APPROVED', 'CHECKED_IN', 'COMPLETED'].includes(existingParticipant.status)) {
                res.status(400).json({ message: 'You have already registered for this campaign' });
                return;
            }

            const newParticipant = participantRepo.create({
                campaignId,
                userId,
                status: ParticipantStatus.PENDING
            });

            await participantRepo.save(newParticipant);

            res.status(200).json({
                message: 'Registration request submitted and waiting for approval.',
                participant: newParticipant
            });
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

            if (participant.status !== ParticipantStatus.APPROVED) {
                res.status(400).json({ message: 'Cannot check in. You must be approved to participate in this campaign.' });
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

    public getMyCampaigns: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const participantRepo = getParticipantRepo();
            const participants = await participantRepo.find({
                where: { userId },
                relations: ['campaign', 'campaign.createdBy']
            });

            const campaigns = participants
                .filter(p => p.campaign)
                .map(p => ({
                    id: p.campaign.id,
                    name: p.campaign.name,
                    description: p.campaign.description,
                    startDate: p.campaign.startDate,
                    endDate: p.campaign.endDate,
                    status: p.campaign.status,
                    lat: p.campaign.lat,
                    lng: p.campaign.lng,
                    radius: p.campaign.radius,
                    participantStatus: p.status,
                    checkInTime: p.checkInTime,
                    checkOutTime: p.checkOutTime,
                    createdBy: p.campaign.createdBy ? {
                        id: p.campaign.createdBy.id,
                        fullName: p.campaign.createdBy.fullName
                    } : null
                }));

            res.status(200).json(campaigns);
            return;
        } catch (error) {
            console.error('[getMyCampaigns]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public getCampaignParticipants: RequestHandler = async (req: Request, res: Response) => {
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

            if (campaign.createdByUserId !== userId) {
                res.status(403).json({ message: 'Only campaign creator can view participants' });
                return;
            }

            const participantRepo = getParticipantRepo();
            const participants = await participantRepo.find({
                where: { campaignId },
                relations: ['user'],
                order: { createdAt: 'DESC' }
            });

            const formatted = participants.map(p => ({
                id: p.id,
                userId: p.userId,
                status: p.status,
                checkInTime: p.checkInTime,
                checkOutTime: p.checkOutTime,
                user: p.user ? {
                    id: p.user.id,
                    fullName: p.user.fullName,
                    email: p.user.email,
                    phoneNumber: p.user.phoneNumber
                } : null,
                createdAt: p.createdAt
            }));

            res.status(200).json(formatted);
            return;
        } catch (error) {
            console.error('[getCampaignParticipants]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public getPendingParticipants: RequestHandler = async (req: Request, res: Response) => {
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

            if (campaign.createdByUserId !== userId) {
                res.status(403).json({ message: 'Only campaign creator can view pending requests' });
                return;
            }

            const participantRepo = getParticipantRepo();
            const participants = await participantRepo.find({
                where: { campaignId, status: ParticipantStatus.PENDING },
                relations: ['user'],
                order: { createdAt: 'DESC' }
            });

            const formatted = participants.map(p => ({
                id: p.id,
                userId: p.userId,
                status: p.status,
                user: p.user ? {
                    id: p.user.id,
                    fullName: p.user.fullName,
                    email: p.user.email,
                    phoneNumber: p.user.phoneNumber
                } : null,
                createdAt: p.createdAt
            }));

            res.status(200).json(formatted);
            return;
        } catch (error) {
            console.error('[getPendingParticipants]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public approveParticipant: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const campaignId = req.params.id;
            const participantId = req.params.participantId;

            if (!isUUID(campaignId) || !isUUID(participantId)) {
                res.status(400).json({ message: 'Invalid campaign ID or participant ID' });
                return;
            }

            const campaignRepo = getCampaignRepo();
            const campaign = await campaignRepo.findOneBy({ id: campaignId });

            if (!campaign) {
                res.status(404).json({ message: 'Campaign not found' });
                return;
            }

            if (campaign.createdByUserId !== userId) {
                res.status(403).json({ message: 'Only campaign creator can approve participants' });
                return;
            }

            const participantRepo = getParticipantRepo();
            const participant = await participantRepo.findOne({
                where: { id: participantId, campaignId },
                relations: ['user']
            });

            if (!participant) {
                res.status(404).json({ message: 'Participant not found' });
                return;
            }

            if (participant.status !== ParticipantStatus.PENDING) {
                res.status(400).json({ message: `Cannot approve. Current status is ${participant.status}, not PENDING.` });
                return;
            }

            participant.status = ParticipantStatus.APPROVED;
            const updated = await participantRepo.save(participant);

            res.status(200).json({
                message: 'Participant approved successfully.',
                participant: {
                    id: updated.id,
                    userId: updated.userId,
                    status: updated.status,
                    checkInTime: updated.checkInTime,
                    checkOutTime: updated.checkOutTime,
                    user: updated.user ? {
                        id: updated.user.id,
                        fullName: updated.user.fullName,
                        email: updated.user.email,
                        phoneNumber: updated.user.phoneNumber
                    } : null,
                    createdAt: updated.createdAt
                }
            });
            return;
        } catch (error) {
            console.error('[approveParticipant]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };

    public rejectParticipant: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const campaignId = req.params.id;
            const participantId = req.params.participantId;

            if (!isUUID(campaignId) || !isUUID(participantId)) {
                res.status(400).json({ message: 'Invalid campaign ID or participant ID' });
                return;
            }

            const campaignRepo = getCampaignRepo();
            const campaign = await campaignRepo.findOneBy({ id: campaignId });

            if (!campaign) {
                res.status(404).json({ message: 'Campaign not found' });
                return;
            }

            if (campaign.createdByUserId !== userId) {
                res.status(403).json({ message: 'Only campaign creator can reject participants' });
                return;
            }

            const participantRepo = getParticipantRepo();
            const participant = await participantRepo.findOne({
                where: { id: participantId, campaignId },
                relations: ['user']
            });

            if (!participant) {
                res.status(404).json({ message: 'Participant not found' });
                return;
            }

            if (participant.status !== ParticipantStatus.PENDING) {
                res.status(400).json({ message: `Cannot reject. Current status is ${participant.status}, not PENDING.` });
                return;
            }

            participant.status = ParticipantStatus.REJECTED;
            const updated = await participantRepo.save(participant);

            res.status(200).json({
                message: 'Participant rejected.',
                participant: {
                    id: updated.id,
                    userId: updated.userId,
                    status: updated.status,
                    checkInTime: updated.checkInTime,
                    checkOutTime: updated.checkOutTime,
                    user: updated.user ? {
                        id: updated.user.id,
                        fullName: updated.user.fullName,
                        email: updated.user.email,
                        phoneNumber: updated.user.phoneNumber
                    } : null,
                    createdAt: updated.createdAt
                }
            });
            return;
        } catch (error) {
            console.error('[rejectParticipant]', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
    };
}

export default new ParticipantCampaignController();
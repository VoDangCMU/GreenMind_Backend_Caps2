import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { JWTHelper } from '../utils/jwtHelper';
import { BitmapHelper } from '../utils/bitmapHelper';
import AppDataSource from './database';
import { CampaignMessage } from '../entity/campaign_message';
import { CampaignParticipant, ParticipantStatus } from '../entity/campaign_participants';
import { Campaign } from '../entity/campaign';
import { User } from '../entity/user';

let io: SocketIOServer;

export const initSocketServer = (httpServer: HttpServer) => {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Authentication Middleware
    io.use(async (socket, next) => {
        let token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
        
        if (token && token.startsWith('Bearer ')) {
            token = token.split(' ')[1];
        }

        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const payload = JWTHelper.verifyAccessToken(token);
            if (!payload) {
                return next(new Error('Invalid token'));
            }

            const isBlacklisted = await BitmapHelper.isTokenBlacklisted(token);
            if (isBlacklisted) {
                return next(new Error('Token revoked'));
            }

            // Gắn thông tin user vào socket data
            socket.data.user = payload;
            next();
        } catch (error) {
            console.error('Socket auth error:', error);
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const userId = socket.data.user.userId;

        // JOIN CAMPAIGN ROOM
        socket.on('join_campaign', async (data: { campaignId: string }) => {
            try {
                const { campaignId } = data;
                if (!campaignId) {
                    socket.emit('error', { message: 'Missing campaignId' });
                    return;
                }

                const campaignRepo = AppDataSource.getRepository(Campaign);
                const campaign = await campaignRepo.findOneBy({ id: campaignId });

                if (!campaign) {
                    socket.emit('error', { message: 'Campaign not found' });
                    return;
                }

                // Check permission
                const isCreator = campaign.createdByUserId === userId;
                const participantRepo = AppDataSource.getRepository(CampaignParticipant);
                const participant = await participantRepo.findOneBy({ campaignId, userId });

                if (!isCreator && (!participant || (participant.status !== ParticipantStatus.REGISTERED && participant.status !== ParticipantStatus.CHECKED_IN && participant.status !== ParticipantStatus.COMPLETED))) {
                    socket.emit('error', { message: 'Only registered participants can join chat' });
                    return;
                }

                const roomName = `campaign_${campaignId}`;
                socket.join(roomName);
                // console.log(`User ${userId} joined room ${roomName}`);
            } catch (error) {
                console.error('[join_campaign error]', error);
                socket.emit('error', { message: 'Internal server error while joining room' });
            }
        });

        // SEND MESSAGE
        socket.on('send_message', async (data: { campaignId: string, content: string }) => {
            try {
                const { campaignId, content } = data;
                if (!campaignId || !content || typeof content !== 'string' || !content.trim()) {
                    return; // Ignore invalid format
                }

                const roomName = `campaign_${campaignId}`;
                
                // 1. Verify user is in the room (Socket level check)
                if (!socket.rooms.has(roomName)) {
                    socket.emit('error', { message: 'You must join the campaign room first' });
                    return;
                }

                // 2. Re-verify permission in Database (Security reinforcement)
                const campaignRepo = AppDataSource.getRepository(Campaign);
                const campaign = await campaignRepo.findOneBy({ id: campaignId });

                if (!campaign) {
                    socket.emit('error', { message: 'Campaign not found' });
                    return;
                }

                const isCreator = campaign.createdByUserId === userId;
                const participantRepo = AppDataSource.getRepository(CampaignParticipant);
                const participant = await participantRepo.findOneBy({ campaignId, userId });

                const isValidParticipant = participant && (
                    participant.status === ParticipantStatus.REGISTERED ||
                    participant.status === ParticipantStatus.CHECKED_IN ||
                    participant.status === ParticipantStatus.COMPLETED
                );

                if (!isCreator && !isValidParticipant) {
                    socket.leave(roomName); // Kick user out of room if they no longer have permission
                    socket.emit('error', { message: 'You no longer have permission to chat in this campaign' });
                    return;
                }

                const userRepo = AppDataSource.getRepository(User);
                const sender = await userRepo.findOneBy({ id: userId });
                if (!sender) return;

                const messageRepo = AppDataSource.getRepository(CampaignMessage);
                const newMessage = messageRepo.create({
                    campaignId,
                    senderId: userId,
                    content: content.trim()
                });

                const savedMessage = await messageRepo.save(newMessage);

                const emitData = {
                    id: savedMessage.id,
                    campaignId: savedMessage.campaignId,
                    sender: {
                        id: sender.id,
                        fullName: sender.fullName,
                        role: sender.role
                    },
                    content: savedMessage.content,
                    createdAt: savedMessage.createdAt
                };

                // Emit to all users in the room (including sender)
                io.to(roomName).emit('new_message', emitData);

            } catch (error) {
                console.error('[send_message error]', error);
                socket.emit('error', { message: 'Internal server error while sending message' });
            }
        });

        // LEAVE CAMPAIGN ROOM
        socket.on('leave_campaign', (data: { campaignId: string }) => {
            if (data?.campaignId) {
                socket.leave(`campaign_${data.campaignId}`);
            }
        });

        socket.on('disconnect', () => {
            // Socket IO tu dong remove connections khoi rooms
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

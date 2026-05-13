import { Router } from 'express';
import campaignController from '../controller/campaignController';
import participantCampaignController from '../controller/participantCampaignController';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';

const router = Router();

router.post('/', jwtAuthMiddleware, campaignController.createCampaign);
router.get('/', jwtAuthMiddleware, campaignController.getAllCampaigns);
router.get('/chat-list', jwtAuthMiddleware, campaignController.getUserChatList);

router.get('/:id/messages', jwtAuthMiddleware, campaignController.getCampaignMessages);
router.post('/:id/status', jwtAuthMiddleware, campaignController.updateCampaignStatus);
router.post('/:id/cancel', jwtAuthMiddleware, campaignController.cancelCampaign);

router.get('/:id/participants', jwtAuthMiddleware, participantCampaignController.getCampaignParticipants);
router.get('/:id/participants/pending', jwtAuthMiddleware, participantCampaignController.getPendingParticipants);
router.post('/:id/participants/:participantId/approve', jwtAuthMiddleware, participantCampaignController.approveParticipant);
router.post('/:id/participants/:participantId/reject', jwtAuthMiddleware, participantCampaignController.rejectParticipant);

router.get('/:id', jwtAuthMiddleware, campaignController.getCampaignById);
router.put('/:id', jwtAuthMiddleware, campaignController.updateCampaign);
router.delete('/:id', jwtAuthMiddleware, campaignController.deleteCampaign);

export default router;
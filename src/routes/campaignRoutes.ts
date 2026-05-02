import { Router } from 'express';
import campaignController from '../controller/campaignController';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware'; // Assuming standard project structure based on tree

const router = Router();

router.post('/', jwtAuthMiddleware, campaignController.createCampaign);
router.get('/', jwtAuthMiddleware, campaignController.getAllCampaigns);
router.get('/chat-list', jwtAuthMiddleware, campaignController.getUserChatList);
router.get('/:id', jwtAuthMiddleware, campaignController.getCampaignById);
router.put('/:id', jwtAuthMiddleware, campaignController.updateCampaign);
router.delete('/:id', jwtAuthMiddleware, campaignController.deleteCampaign);

router.get('/:id/messages', jwtAuthMiddleware, campaignController.getCampaignMessages);

router.post('/:id/status', jwtAuthMiddleware, campaignController.updateCampaignStatus);
router.post('/:id/cancel', jwtAuthMiddleware, campaignController.cancelCampaign);

export default router;


import { Router } from 'express';
import campaignController from '../controller/campaignController';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware'; // Assuming standard project structure based on tree

const router = Router();

router.post('/', jwtAuthMiddleware, campaignController.createCampaign);
router.get('/', jwtAuthMiddleware, campaignController.getAllCampaigns);
router.get('/:id', jwtAuthMiddleware, campaignController.getCampaignById);
router.put('/:id', jwtAuthMiddleware, campaignController.updateCampaign);
router.delete('/:id', jwtAuthMiddleware, campaignController.deleteCampaign);

router.post('/:id/status', jwtAuthMiddleware, campaignController.updateCampaignStatus);

export default router;

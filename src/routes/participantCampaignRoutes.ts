import { Router } from 'express';
import participantCampaignController from '../controller/participantCampaignController';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';

const router = Router();

router.get("/", jwtAuthMiddleware, participantCampaignController.getMyCampaigns);
router.post('/:id/register', jwtAuthMiddleware, participantCampaignController.registerCampaign);
router.post('/:id/checkin', jwtAuthMiddleware, participantCampaignController.checkInCampaign);
router.post('/:id/checkout', jwtAuthMiddleware, participantCampaignController.checkOutCampaign);

export default router;

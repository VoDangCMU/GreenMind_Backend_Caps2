import { Router } from 'express';
import campaignController from '../controller/campaignController';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';

const router = Router();

router.post('/:id/register', jwtAuthMiddleware, campaignController.registerCampaign);
router.post('/:id/checkin', jwtAuthMiddleware, campaignController.checkInCampaign);
router.post('/:id/checkout', jwtAuthMiddleware, campaignController.checkOutCampaign);

export default router;

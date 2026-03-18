import { Router } from 'express';
import controller from '../controller';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

// Submit BigFive scores (Create hoặc Update)
router.post('/', jwtAuthMiddleware, controller.bigFive.submitBigFive);

// Get BigFive scores by User ID
router.get('/user/:userId', jwtAuthMiddleware, controller.bigFive.getBigFiveByUserId);

// Update BigFive scores by User ID
router.put('/user/:userId', jwtAuthMiddleware, controller.bigFive.updateBigFive);

// Delete BigFive scores by User ID
router.delete('/user/:userId', jwtAuthMiddleware, controller.bigFive.deleteBigFive);

// Get all BigFive data (admin only)
router.get('/', jwtAuthMiddleware, adminMiddleware, controller.bigFive.getAllBigFive);

export default router;
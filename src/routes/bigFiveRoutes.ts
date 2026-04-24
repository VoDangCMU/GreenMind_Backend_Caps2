import { Router } from 'express';
import controller from '../controller';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

router.post('/', jwtAuthMiddleware, controller.bigFive.submitBigFive);
router.get('/calculate', jwtAuthMiddleware, controller.bigFive.calculateBigFive);

router.get('/user/:userId', jwtAuthMiddleware, controller.bigFive.getBigFiveByUserId);

router.put('/user/:userId', jwtAuthMiddleware, controller.bigFive.updateBigFive);

router.delete('/user/:userId', jwtAuthMiddleware, controller.bigFive.deleteBigFive);

router.get('/', jwtAuthMiddleware, adminMiddleware, controller.bigFive.getAllBigFive);

export default router;
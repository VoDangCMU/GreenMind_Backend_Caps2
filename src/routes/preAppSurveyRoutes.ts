import { Router } from 'express';
import controller from '../controller';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

// Submit hoặc update pre-app survey (yêu cầu authentication)
router.post('/submit', jwtAuthMiddleware, controller.preAppSurvey.submitPreAppSurvey);

// Update parameters (sigmoid, weight, direction, alpha) - yêu cầu authentication
router.put('/parameters', jwtAuthMiddleware, controller.preAppSurvey.updateParameters);

// Get pre-app survey by userId (yêu cầu authentication)
router.get('/:userId', jwtAuthMiddleware, controller.preAppSurvey.getPreAppSurvey);

// Get all pre-app surveys (admin only)
router.get('/', jwtAuthMiddleware, adminMiddleware, controller.preAppSurvey.getAllPreAppSurveys);

// Delete pre-app survey (yêu cầu authentication)
router.delete('/:userId', jwtAuthMiddleware, controller.preAppSurvey.deletePreAppSurvey);

export default router;
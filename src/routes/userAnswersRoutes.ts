import { Router } from 'express';
import controller from '../controller';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import { adminMiddleware, staffOrAdminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

router.post('/submit', jwtAuthMiddleware, controller.userAnswers.submitUserAnswers);
// Create User Answer (requires authentication)
router.post('/', jwtAuthMiddleware, controller.userAnswers.createUserAnswer);

// Get User Answer by User ID and Question ID (requires authentication)
router.get('/get-user-answer-by-id/:questionId', jwtAuthMiddleware, controller.userAnswers.getUserAnswerById);

// Get all User Answers by User ID (requires authentication)
router.get('/user/:userId', jwtAuthMiddleware, controller.userAnswers.getUserAnswersByUserId);

// Get all User Answers by Question ID (staff/admin only)
router.get('/question/:questionId', jwtAuthMiddleware, staffOrAdminMiddleware, controller.userAnswers.getUserAnswersByQuestionId);

// Update User Answer (requires authentication)
router.put('/:userId/:questionId', jwtAuthMiddleware, controller.userAnswers.updateUserAnswer);

// Delete User Answer (requires authentication)
router.delete('/:userId/:questionId', jwtAuthMiddleware, controller.userAnswers.deleteUserAnswer);

// Get all User Answers (admin only)
router.get('/', jwtAuthMiddleware, adminMiddleware, controller.userAnswers.getAllUserAnswers);

export default router;
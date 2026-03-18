import {Router} from 'express';
import controller from '../controller';
import surveyVerifyController from '../controller/surveyVerifyController';
import {jwtAuthMiddleware} from '../middlewares/jwtMiddleware';
import {adminMiddleware, staffOrAdminMiddleware} from '../middlewares/adminMiddleware';

const router = Router();

// Question Management Routes

router.post('/', jwtAuthMiddleware, staffOrAdminMiddleware, controller.questions.CreateQuestion);

router.post('/createQuestions', jwtAuthMiddleware, staffOrAdminMiddleware, controller.questions.createQuestions);

router.post('/survey-verify', surveyVerifyController.verifySurvey);


// Question Query Routes

// Get all questions (requires authentication)
router.get('/', jwtAuthMiddleware, controller.questions.GetQuestions);

// Get survey questions based on user's location and age - requires authentication
router.get('/survey', jwtAuthMiddleware, controller.questions.getSurveyQuestions);

// Get current user's questions (requires authentication)
router.get('/my-questions', jwtAuthMiddleware, controller.questions.GetQuestionsByOwner);

// Get questions by template ID (requires authentication)
router.get('/template/:templateId', jwtAuthMiddleware, controller.questions.GetQuestionsByTemplate);

// Get questions by owner ID (requires authentication)
router.get('/owner/:ownerId', jwtAuthMiddleware, controller.questions.GetQuestionsByOwner);

// Get question by ID (requires authentication) - MUST be after specific routes
router.get('/:id', jwtAuthMiddleware, controller.questions.GetQuestionById);

// Update question by ID (staff/admin only)
router.put('/:id', jwtAuthMiddleware, staffOrAdminMiddleware, controller.questions.UpdateQuestion);

// Delete question by ID (admin only)
router.delete('/:id', jwtAuthMiddleware, adminMiddleware, controller.questions.DeleteQuestion);

export default router;
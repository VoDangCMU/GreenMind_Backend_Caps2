import {Router} from 'express';
import controller from '../controller';
import {jwtAuthMiddleware} from '../middlewares/jwtMiddleware';
import {staffOrAdminMiddleware} from '../middlewares/adminMiddleware';

const router = Router();

router.post('/', jwtAuthMiddleware, staffOrAdminMiddleware, controller.questionSet.createQuestionSet);

router.get('/', jwtAuthMiddleware, staffOrAdminMiddleware, controller.questionSet.getQuestionSets);

router.get('/my-sets', jwtAuthMiddleware, controller.questionSet.getQuestionSetsByOwner);

router.get('/owner/:ownerId', jwtAuthMiddleware, controller.questionSet.getQuestionSetsByOwner);

router.get('/:id', jwtAuthMiddleware, controller.questionSet.getQuestionSetById);

router.put('/:id', jwtAuthMiddleware, controller.questionSet.updateQuestionSet);

router.delete('/:id', jwtAuthMiddleware, controller.questionSet.deleteQuestionSet);

export default router;

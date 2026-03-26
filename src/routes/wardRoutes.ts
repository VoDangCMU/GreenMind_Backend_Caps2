import { Router } from 'express';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import wardController from '../controller/wardController';

const router = Router();

router.get('/', wardController.getAllWards);
router.post('/', jwtAuthMiddleware, adminMiddleware, wardController.createWard);
router.patch('/:id', jwtAuthMiddleware, adminMiddleware, wardController.updateWard);
router.delete('/:id', jwtAuthMiddleware, adminMiddleware, wardController.deleteWard);

export default router;

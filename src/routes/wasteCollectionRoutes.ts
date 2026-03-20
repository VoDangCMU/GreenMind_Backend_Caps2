import { Router } from 'express';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import wasteCollectionController from '../controller/wasteCollectionController';

const router = Router();

router.post('/', jwtAuthMiddleware, wasteCollectionController.createCollection);
router.get('/', jwtAuthMiddleware, wasteCollectionController.getMyCollections);
router.get('/:id', jwtAuthMiddleware, wasteCollectionController.getById);
router.patch('/:id', jwtAuthMiddleware, wasteCollectionController.updateCollection);

export default router;

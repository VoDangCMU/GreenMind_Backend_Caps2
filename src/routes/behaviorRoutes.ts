import { Router } from 'express';
import controller from '../controller';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import { adminMiddleware, staffOrAdminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

// Create Behavior (admin/staff only)
router.post('/', jwtAuthMiddleware, staffOrAdminMiddleware, controller.behavior.createBehavior);

// Get all Behaviors (requires authentication)
router.get('/', jwtAuthMiddleware, controller.behavior.getAllBehaviors);

// Get Behavior by ID (requires authentication)
router.get('/:id', jwtAuthMiddleware, controller.behavior.getBehaviorById);

// Update Behavior by ID (admin/staff only)
router.put('/:id', jwtAuthMiddleware, staffOrAdminMiddleware, controller.behavior.updateBehaviorById);

// Delete Behavior by ID (admin only)
router.delete('/:id', jwtAuthMiddleware, adminMiddleware, controller.behavior.deleteBehaviorById);

export default router;
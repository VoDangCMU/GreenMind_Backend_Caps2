import { Router } from 'express';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import wasteReportController from '../controller/wasteReportController';

const router = Router();

router.post('/', jwtAuthMiddleware, wasteReportController.createReport);
router.get('/household/:householdId', jwtAuthMiddleware, wasteReportController.getByHousehold);
router.get('/urban-area/:urbanAreaId', jwtAuthMiddleware, wasteReportController.getByUrbanArea);
router.patch('/:id/status', jwtAuthMiddleware, wasteReportController.updateStatus);

export default router;

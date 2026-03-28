import { Router } from 'express';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import wasteReportController from '../controller/wasteReportController';

const router = Router();

router.get('/', jwtAuthMiddleware, wasteReportController.getAssignedReports);
router.get('/:id', jwtAuthMiddleware, wasteReportController.getAssignedReportById);
router.patch('/:id/status', jwtAuthMiddleware, wasteReportController.updateReportStatus);

export default router;

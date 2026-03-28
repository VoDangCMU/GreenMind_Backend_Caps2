import { Router } from 'express';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import wasteReportController from '../controller/wasteReportController';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();


router.get('/', jwtAuthMiddleware, wasteReportController.getAllReports);
router.get('/collectors', jwtAuthMiddleware, wasteReportController.getCollectors);
router.get('/collector/:collectorId', jwtAuthMiddleware, wasteReportController.getReportsByCollector);
router.post('/:reportId/assign', jwtAuthMiddleware, adminMiddleware, wasteReportController.assignCollector);

export default router;

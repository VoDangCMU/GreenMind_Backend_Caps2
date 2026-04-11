import { Router } from 'express';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import wasteReportController from '../controller/wasteReportController';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();


router.get('/', jwtAuthMiddleware, wasteReportController.getAllReports);

export default router;

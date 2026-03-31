import { Router } from 'express';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import wasteReportController from '../controller/wasteReportController';

const router = Router();


router.post('/predict-pollutant', jwtAuthMiddleware, wasteReportController.PredictPollutant);
router.post('/detect-trash', jwtAuthMiddleware, wasteReportController.DetectTrashOnly);
router.get('/my', jwtAuthMiddleware, wasteReportController.getMyReports);
//router.get('/', jwtAuthMiddleware, wasteReportController.getAllReports);
router.get('/:id', jwtAuthMiddleware, wasteReportController.getReportById);
router.patch('/:id', jwtAuthMiddleware, wasteReportController.updateReport);
router.delete('/:id', jwtAuthMiddleware, wasteReportController.deleteReport);
export default router;

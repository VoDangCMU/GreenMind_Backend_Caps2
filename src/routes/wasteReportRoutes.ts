import { Router } from 'express';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import wasteReportController from '../controller/wasteReportController';

const router = Router();

router.get('/leaderboard', wasteReportController.getLeaderboard);

router.post('/', jwtAuthMiddleware, wasteReportController.createReport);
router.get('/my', jwtAuthMiddleware, wasteReportController.getMyReports);
router.get('/:id', jwtAuthMiddleware, wasteReportController.getReportById);
router.patch('/:id', jwtAuthMiddleware, wasteReportController.updateReport);
router.delete('/:id', jwtAuthMiddleware, wasteReportController.deleteReport);

export default router;
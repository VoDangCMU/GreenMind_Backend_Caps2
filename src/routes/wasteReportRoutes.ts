import { Router } from 'express';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import wasteReportController from '../controller/wasteReportController';

const router = Router();

// POST /waste-reports — create a report (household only)
router.post('/', jwtAuthMiddleware, wasteReportController.createReport);

// GET /waste-reports/me — list own reports (with optional status/page/limit)
router.get('/me', jwtAuthMiddleware, wasteReportController.getMyReports);

// GET /waste-reports/:id — get detail of a single report
router.get('/:id', jwtAuthMiddleware, wasteReportController.getReportById);

// PATCH /waste-reports/:id — update report (pending only)
router.patch('/:id', jwtAuthMiddleware, wasteReportController.updateReport);

// DELETE /waste-reports/:id — delete report (pending only)
router.delete('/:id', jwtAuthMiddleware, wasteReportController.deleteReport);

export default router;

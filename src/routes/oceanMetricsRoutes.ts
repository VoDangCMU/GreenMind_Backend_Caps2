import { Router } from "express";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import oceanMetricController from "../controller/oceanMetricController";

const router = Router();

router.post("/avg_daily_spend", jwtAuthMiddleware, oceanMetricController.calculateMetric);
router.post("/spend_variability", jwtAuthMiddleware, oceanMetricController.calculateSpendVariability);
router.post("/daily_distance", jwtAuthMiddleware, oceanMetricController.calculateDailyDistance);
router.post("/list_adherence", jwtAuthMiddleware, oceanMetricController.calculateListAdherence);
router.get("/", jwtAuthMiddleware, oceanMetricController.getAllByType);

export default router;

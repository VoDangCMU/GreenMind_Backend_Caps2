import {Router} from "express";
import {jwtAuthMiddleware} from "../middlewares/jwtMiddleware";
import controller from "../controller";

const router = Router();

// Avg Daily Spend endpoints
router.get("/avg-daily-spend", jwtAuthMiddleware, controller.avgDailySpendMetric.getAvgDailySpend);
router.post("/avg-daily-spend", jwtAuthMiddleware, controller.avgDailySpendMetric.updateAvgSpend);

// Spend Variability endpoints
router.get("/spend-variability", jwtAuthMiddleware, controller.spendVariabilityMetric.getSpendVariability);
router.post("/spend-variability", jwtAuthMiddleware, controller.spendVariabilityMetric.updateSpendVariability);

// Brand Novelty endpoints
router.get("/brand-novelty", jwtAuthMiddleware, controller.brandNoveltyMetric.getBrandNovelty);
router.post("/brand-novelty", jwtAuthMiddleware, controller.brandNoveltyMetric.updateBrandNovelty);

// List Adherence endpoints
router.get("/list-adherence", jwtAuthMiddleware, controller.listAdherenceMetric.getListAdherence);
router.post("/list-adherence", jwtAuthMiddleware, controller.listAdherenceMetric.updateListAdherence);

// Daily Distance Km endpoints
router.get("/daily-distance-km", jwtAuthMiddleware, controller.dailyDistanceKmMetric.getDailyDistanceKm);
router.post("/daily-distance-km", jwtAuthMiddleware, controller.dailyDistanceKmMetric.updateDailyDistanceKm);

// Novel Location Ratio endpoints
router.get("/novel-location-ratio", jwtAuthMiddleware, controller.novelLocationRatioMetric.getNovelLocationRatio);
router.post("/novel-location-ratio", jwtAuthMiddleware, controller.novelLocationRatioMetric.updateNovelLocationRatio);

// Public Transit Ratio endpoints
router.get("/public-transit-ratio", jwtAuthMiddleware, controller.publicTransitRatioMetric.getPublicTransitRatio);
router.post("/public-transit-ratio", jwtAuthMiddleware, controller.publicTransitRatioMetric.updatePublicTransitRatio);

// Night Out Freq endpoints
router.get("/night-out-freq", jwtAuthMiddleware, controller.nightOutFreqMetric.getNightOutFreq);
router.post("/night-out-freq", jwtAuthMiddleware, controller.nightOutFreqMetric.countNightOut);

export default router;
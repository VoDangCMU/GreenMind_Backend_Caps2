import { Router } from "express";
import HouseholdController from "../controller/householdController";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import { adminMiddleware } from "../middlewares/adminMiddleware";
import DetectTrashController from "../controller/detectController";
import greenScoreController from "../controller/greenScoreController";

const router = Router();

router.use(jwtAuthMiddleware);
router.post("/", HouseholdController.createHousehold);
router.post("/admin", adminMiddleware, HouseholdController.createHouseholdByAdmin);
router.post("/save-detection", DetectTrashController.SaveDetection);
router.get("/", HouseholdController.getHousehold);
router.put("/", HouseholdController.updateHousehold);
router.get("/get-all-households", HouseholdController.getAllHouseholds);
router.post("/detect-trash", DetectTrashController.DetectTrashOnly);
router.post("/predict-pollutant", DetectTrashController.PredictPollutantImpact);
router.post("/total-mass", DetectTrashController.TotalMass);
router.post("/analyze-image", DetectTrashController.AnalyzeImage);
router.get("/detect-trash/historyByUser", DetectTrashController.getDetectionHistoryByUser);
router.get("/detect-trash/historyByHousehold", DetectTrashController.getDetectionHistoryByHousehold);
router.get("/detects/monthly", DetectTrashController.getMonthlyDetections);
router.get("/admin/detects/monthly", DetectTrashController.getMonthlyDetectionsAdmin);
router.get("/detect-trash/historyByHousehold/:type", DetectTrashController.getDetectionByTypeHousehold);
router.post("/green-score/:detectId", greenScoreController.submitGreenScore);
router.get("/green-score/history", greenScoreController.getGreenScoreHistory);
router.delete("/green-score/reset", greenScoreController.deleteGreenScores);
router.get("/green-score/:householdId", greenScoreController.getGreenScoreByHousehold);
router.post("/detect-trash/:id/bring-out", DetectTrashController.markBringOut);
router.get("/get-detect-by-household/:id", DetectTrashController.getHouseholdById);
router.get("/detect-trash/:type", DetectTrashController.getDetectionByType);
router.delete("/:id", HouseholdController.deleteHouseholdMembers);
router.get("/detects", DetectTrashController.getAllDetections);
router.get("/detects/:type", DetectTrashController.getAllDetectionByType);

export default router;
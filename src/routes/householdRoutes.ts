import { Router } from "express";
import HouseholdController from "../controller/householdController";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import DetectTrashController from "../controller/detectController";
import greenScoreController from "../controller/greenScoreController";

const router = Router();

router.use(jwtAuthMiddleware);
router.post("/", HouseholdController.createHousehold);
router.get("/", HouseholdController.getHousehold);
router.put("/", HouseholdController.updateHousehold);
router.get("/get-all-households", HouseholdController.getAllHouseholds);
router.delete("/:id", HouseholdController.deleteHouseholdMembers);
router.post("/detect-trash", DetectTrashController.DetectTrashOnly);
router.post("/predict-pollutant", DetectTrashController.PredictPollutantImpact);
router.post("/total-mass", DetectTrashController.TotalMass);
router.get("/detect-trash/historyByUser", DetectTrashController.getDetectionHistoryByUser);
router.get("/detect-trash/historyByHousehold", DetectTrashController.getDetectionHistoryByHousehold);
router.get("/get-detect-by-household/:id", DetectTrashController.getHouseholdById);
router.get("/detect-trash/:type", DetectTrashController.getDetectionByType);
router.get("/detect-trash/historyByHousehold/:type", DetectTrashController.getDetectionByTypeHousehold);
router.post("/green-score/:detectId", greenScoreController.submitGreenScore);
router.get("/green-score/history", greenScoreController.getGreenScoreHistory);
router.delete("/green-score/reset", greenScoreController.deleteGreenScores);
router.get("/green-score/:householdId", greenScoreController.getGreenScoreByHousehold);
router.post("/detect-trash/:id/bring-out", DetectTrashController.markBringOut);
export default router;
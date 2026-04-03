import { Router } from "express";
import HouseholdController from "../controller/householdController";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import DetectTrashController from "../controller/detectController";

const router = Router();

router.use(jwtAuthMiddleware);
router.post("/", HouseholdController.createHousehold);
router.get("/", HouseholdController.getHousehold);
router.put("/", HouseholdController.updateHousehold);
router.get("/get-all-households", HouseholdController.getAllHouseholds);
router.delete("/:id", HouseholdController.deleteHouseholdMembers);
router.post("/detect-trash", DetectTrashController.DetectTrashOnly);
router.post("/predict-pollutant", DetectTrashController.PredictPollutantImpact);
router.get("/detect-trash/historyByUser", DetectTrashController.getDetectionHistoryByUser);
router.get("/detect-trash/historyByHousehold", DetectTrashController.getDetectionHistoryByHousehold);
export default router;
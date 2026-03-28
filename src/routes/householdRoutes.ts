import { Router } from "express";
import HouseholdController from "../controller/householdController";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";

const router = Router();

router.use(jwtAuthMiddleware);
router.post("/", HouseholdController.createHousehold);
router.get("/", HouseholdController.getHousehold);
router.put("/", HouseholdController.updateHousehold);
router.delete("/:id", HouseholdController.deleteHouseholdMembers);
export default router;
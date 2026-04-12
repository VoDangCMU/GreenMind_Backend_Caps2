import { Router } from "express";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import DetectTrashController from "../controller/detectController";

const router = Router();
router.use(jwtAuthMiddleware);

router.get("/get-brought-out", DetectTrashController.getPendingPickups);
router.post("/pickups/:id/checkin", DetectTrashController.pickupWaste);

export default router;

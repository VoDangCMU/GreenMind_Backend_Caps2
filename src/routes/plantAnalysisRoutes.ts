import { Router } from "express";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import plantAnalysisController from "../controller/plantAnalysisController";

const router = Router();

router.post("/analyze", jwtAuthMiddleware, plantAnalysisController.analyzeImage);
router.get("/history", jwtAuthMiddleware, plantAnalysisController.getAnalysisHistory);

export default router;
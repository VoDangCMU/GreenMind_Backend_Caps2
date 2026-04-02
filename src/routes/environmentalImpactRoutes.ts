import { Router } from "express";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import environmentalImpactController from "../controller/environmentalImpactController";

const router = Router();

router.use(jwtAuthMiddleware);

// GET /environmental-impact?range=day|week|month
router.get("/", environmentalImpactController.getSummary);

// GET /environmental-impact/history?page=1&limit=30
router.get("/history", environmentalImpactController.getHistory);

// POST /environmental-impact/compute  — auto-calculate from today's locations
router.post("/compute", environmentalImpactController.computeFromLocations);

// POST /environmental-impact  — manual log
router.post("/", environmentalImpactController.logImpact);

// DELETE /environmental-impact/:id
router.delete("/:id", environmentalImpactController.deleteRecord);

export default router;

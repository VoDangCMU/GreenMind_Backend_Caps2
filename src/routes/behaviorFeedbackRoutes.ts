import { Router } from "express";
import controller from "../controller";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";

const router = Router();

router.get("/", jwtAuthMiddleware, controller.behaviorFeedback.getAllBehaviorFeedback);
router.get("/users", jwtAuthMiddleware, controller.behaviorFeedback.getMechanismFeedbacksAllUsers);
router.get("/user/:userId", jwtAuthMiddleware, controller.behaviorFeedback.getMechanismFeedbacksByUser);
router.get("/model/:modelId", jwtAuthMiddleware, controller.behaviorFeedback.getMechanismFeedbacksByModel);

export default router;
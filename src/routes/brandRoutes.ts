import { Router } from "express";
import brandController from "../controller/brandController";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";

const router = Router();

router.post("/", jwtAuthMiddleware, brandController.postBrand);

export default router;
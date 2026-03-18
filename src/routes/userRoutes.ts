import { Router } from "express";
import userController from "../controller/userController";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import {adminMiddleware} from "../middlewares/adminMiddleware";
const router = Router();

// Authentication routes (no additional prefix needed since base is /auth)
router.post("/login/email", userController.LoginWithEmail);
router.post("/register/email", userController.RegisterWithEmail);
router.post("/login/google", userController.LoginWithGoogle);

// User profile routes (requires authentication)
router.get("/profile", jwtAuthMiddleware, userController.GetProfile);

// Logout (requires authentication)
router.post('/logout', jwtAuthMiddleware, userController.Logout);

router.get('/get-alls', jwtAuthMiddleware, adminMiddleware, userController.GetAllUsers);
export default router;
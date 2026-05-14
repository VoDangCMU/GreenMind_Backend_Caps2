import { Router } from "express";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import paymentController from "../controller/paymentController";
import express from "express";

const router = Router();

// Stripe webhook needs raw body — must be BEFORE json middleware
router.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    paymentController.handleWebhook
);

// All other routes require JWT
router.use(jwtAuthMiddleware);

// GET /payments/analytics?days=30
router.get("/analytics", paymentController.getAnalytics);

// POST /payments/create-checkout
router.post("/create-checkout", paymentController.createCheckout);

export default router;

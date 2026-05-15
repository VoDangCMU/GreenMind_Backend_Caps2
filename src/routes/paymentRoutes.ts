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


// GET /payments/stripe-invoices  — Stripe invoices (subscription/checkout)
router.get("/stripe-invoices", paymentController.getStripeInvoices);

// POST /payments/setup-intent  — add card (returns clientSecret for Stripe SDK)
router.post("/setup-intent", paymentController.createSetupIntent);

// GET /payments/waste-bills?paid=false&page=1&limit=20
router.get("/waste-bills", paymentController.getWasteBills);

// POST /payments/waste-checkout  — pay a specific waste bill via Stripe
router.post("/waste-checkout", paymentController.createWasteCheckout);

export default router;

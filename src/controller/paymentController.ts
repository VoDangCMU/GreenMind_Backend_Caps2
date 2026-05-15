import { Request, Response } from "express";
import Stripe from "stripe";
import AppDataSource from "../infrastructure/database";
import { Invoice } from "../entity/invoice";
import { User } from "../entity/user";
import { WasteDetection, STATUS } from "../entity/WasteDetection";

const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    return new Stripe(key);
};

// ─────────────────────────────────────────────────────────────────────────
//  Helper
// ─────────────────────────────────────────────────────────────────────────

type LogLevel = "info" | "warn" | "error";
function log(level: LogLevel, event: string, msg: string) {
    const prefix = { info: "✅", warn: "⚠️", error: "❌" }[level];
    console.log(`[Stripe ${prefix}] ${event}: ${msg}`);
}

// Use a plain object type to avoid Stripe namespace issues across SDK versions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StripeObj = Record<string, any>;

// ─────────────────────────────────────────────────────────────────────────
//  Controller
// ─────────────────────────────────────────────────────────────────────────

class PaymentController {
    /**
     * GET /payments/analytics?days=30
     */
    public async getAnalytics(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const days = Math.min(365, Math.max(1, parseInt(String(req.query.days ?? "30"), 10)));

        try {
            const stripe = getStripe();
            const since = Math.floor(Date.now() / 1000) - days * 86400;

            const chargesResp = await stripe.charges.list({
                limit: 100,
                created: { gte: since },
            });

            const charges = chargesResp.data;
            const succeeded = charges.filter(c => c.status === "succeeded");
            const failed = charges.filter(c => c.status === "failed");
            const refunded = charges.filter(c => c.refunded);

            const totalRevenue = succeeded.reduce((a, c) => a + (c.amount_captured ?? c.amount), 0);
            const refundedAmount = refunded.reduce((a, c) => a + c.amount_refunded, 0);

            const metrics = {
                totalRevenue,
                totalTransactions: charges.length,
                successRate: charges.length > 0
                    ? Math.round((succeeded.length / charges.length) * 100)
                    : 0,
                avgTransactionValue: succeeded.length > 0
                    ? Math.round(totalRevenue / succeeded.length)
                    : 0,
                refundedAmount,
                pendingAmount: charges
                    .filter(c => c.status === "pending")
                    .reduce((a, c) => a + c.amount, 0),
            };

            // Build daily revenue series
            const seriesMap = new Map<string, { revenue: number; count: number }>();
            for (const charge of succeeded) {
                const d = new Date(charge.created * 1000);
                const label = `${d.getDate()}/${d.getMonth() + 1}`;
                const slot = seriesMap.get(label) ?? { revenue: 0, count: 0 };
                slot.revenue += charge.amount_captured ?? charge.amount;
                slot.count += 1;
                seriesMap.set(label, slot);
            }

            const revenueSeries = [];
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const label = `${d.getDate()}/${d.getMonth() + 1}`;
                const slot = seriesMap.get(label) ?? { revenue: 0, count: 0 };
                revenueSeries.push({ date: label, revenue: slot.revenue, count: slot.count });
            }

            const statusBreakdown = [
                { status: "succeeded", count: succeeded.length, amount: totalRevenue },
                {
                    status: "pending",
                    count: charges.filter(c => c.status === "pending").length,
                    amount: charges.filter(c => c.status === "pending").reduce((a, c) => a + c.amount, 0),
                },
                { status: "failed", count: failed.length, amount: failed.reduce((a, c) => a + c.amount, 0) },
                { status: "refunded", count: refunded.length, amount: refundedAmount },
            ];

            const recentTransactions = charges.slice(0, 20).map(c => ({
                id: c.id,
                amount: c.amount,
                currency: c.currency,
                status: c.refunded ? "refunded" : c.status,
                customer: c.billing_details?.name ?? (c.metadata as Record<string, string>)?.customer ?? "—",
                email: c.billing_details?.email ?? c.receipt_email ?? "—",
                description: c.description ?? c.statement_descriptor ?? "Payment",
                createdAt: new Date(c.created * 1000).toISOString(),
                stripeId: c.id,
            }));

            return res.status(200).json({
                message: "Payment analytics retrieved",
                data: { metrics, revenueSeries, statusBreakdown, recentTransactions },
            });
        } catch (err) {
            const message = (err as Error).message;
            if (message.includes("STRIPE_SECRET_KEY")) {
                return res.status(503).json({ message: "Stripe not configured on server" });
            }
            return res.status(500).json({ message: "Failed to fetch payment analytics", error: message });
        }
    }

    /**
     * POST /payments/create-checkout
     */
    public async createCheckout(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { amount, currency = "usd", description, successUrl, cancelUrl } = req.body as StripeObj;

        if (!amount || !successUrl || !cancelUrl) {
            return res.status(400).json({ message: "amount, successUrl and cancelUrl are required" });
        }

        try {
            const stripe = getStripe();
            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                payment_method_types: ["card"],
                line_items: [{
                    price_data: {
                        currency: (currency as string).toLowerCase(),
                        product_data: { name: (description as string) ?? "GreenMind Payment" },
                        unit_amount: amount as number,
                    },
                    quantity: 1,
                }],
                success_url: successUrl as string,
                cancel_url: cancelUrl as string,
                metadata: { userId: req.user.userId },
            });

            return res.status(200).json({
                message: "Checkout session created",
                data: { url: session.url, sessionId: session.id },
            });
        } catch (err) {
            return res.status(500).json({ message: "Failed to create checkout session", error: (err as Error).message });
        }
    }

    /**
     * POST /payments/webhook
     *
     * Events to enable in Stripe Dashboard → Webhooks:
     *   payment_intent.succeeded | payment_intent.payment_failed | payment_intent.canceled
     *   charge.succeeded | charge.failed | charge.refunded | charge.dispute.created
     *   checkout.session.completed | checkout.session.expired
     *   customer.subscription.created | .updated | .deleted
     *   invoice.payment_succeeded | invoice.payment_failed
     */
    public async handleWebhook(req: Request, res: Response) {
        const sig = req.headers["stripe-signature"];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!sig || !webhookSecret) {
            return res.status(400).json({ message: "Missing Stripe signature or webhook secret" });
        }

        const stripe = getStripe();

        let event: ReturnType<typeof stripe.webhooks.constructEvent>;
        try {
            event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
        } catch (err) {
            return res.status(400).json({ message: `Webhook signature failed: ${(err as Error).message}` });
        }

        // Access event data as a plain object to avoid SDK version type conflicts
        const obj = event.data.object as StripeObj;

        try {
            switch (event.type) {

                // ── Payment Intent ─────────────────────────────────────
                case "payment_intent.succeeded":
                    log("info", event.type, `id=${obj.id} amount=${obj.amount_received / 100} ${String(obj.currency).toUpperCase()} user=${obj.metadata?.userId ?? "?"}`);
                    // TODO: mark order paid, send receipt, update greenScore
                    break;

                case "payment_intent.payment_failed":
                    log("warn", event.type, `id=${obj.id} reason="${obj.last_payment_error?.message ?? "unknown"}"`);
                    // TODO: notify user of failure
                    break;

                case "payment_intent.canceled":
                    log("warn", event.type, `id=${obj.id} cancellation_reason=${obj.cancellation_reason}`);
                    break;

                // ── Charge ─────────────────────────────────────────────
                case "charge.succeeded":
                    log("info", event.type, `id=${obj.id} amount=${obj.amount / 100} ${String(obj.currency).toUpperCase()}`);
                    break;

                case "charge.failed":
                    log("warn", event.type, `id=${obj.id} failure="${obj.failure_message}"`);
                    break;

                case "charge.refunded":
                    log("info", event.type, `id=${obj.id} refunded=${obj.amount_refunded / 100} ${String(obj.currency).toUpperCase()}`);
                    // TODO: update DB refund status, notify user
                    break;

                case "charge.dispute.created":
                    log("error", event.type, `id=${obj.id} charge=${obj.charge} amount=${obj.amount / 100} reason=${obj.reason}`);
                    // TODO: alert admin, consider freezing account
                    break;

                // ── Checkout Session ───────────────────────────────────
                case "checkout.session.completed":
                    log("info", event.type, `id=${obj.id} customer=${obj.customer} total=${(obj.amount_total ?? 0) / 100}`);
                    // Mark waste bill as paid if this checkout was for a waste bill
                    if (obj.metadata?.wasteDetectionId) {
                        try {
                            const repo = AppDataSource.getRepository(WasteDetection);
                            const record = await repo.findOne({ where: { id: obj.metadata.wasteDetectionId } });
                            if (record && !record.isPaid) {
                                record.isPaid = true;
                                record.paidAt = new Date();
                                await repo.save(record);
                                log("info", event.type, `waste bill ${record.id} marked as paid`);
                            }
                        } catch (e) {
                            log("error", event.type, `failed to mark waste bill paid: ${(e as Error).message}`);
                        }
                    }
                    break;

                case "checkout.session.expired":
                    log("warn", event.type, `id=${obj.id} expired without payment`);
                    break;

                // ── Subscription ───────────────────────────────────────
                case "customer.subscription.created":
                    log("info", event.type, `id=${obj.id} customer=${obj.customer} status=${obj.status}`);
                    // TODO: activate premium plan
                    break;

                case "customer.subscription.updated":
                    log("info", event.type, `id=${obj.id} status=${obj.status}`);
                    // TODO: update user plan in DB
                    break;

                case "customer.subscription.deleted":
                    log("warn", event.type, `id=${obj.id} customer=${obj.customer} — cancelled`);
                    // TODO: downgrade to free tier
                    break;

                // ── Invoice ────────────────────────────────────────────
                case "invoice.payment_succeeded":
                    log("info", event.type, `id=${obj.id} sub=${obj.subscription} amount=${(obj.amount_paid ?? 0) / 100}`);
                    // TODO: extend subscription, send receipt
                    break;

                case "invoice.payment_failed":
                    log("warn", event.type, `id=${obj.id} sub=${obj.subscription} attempt=${obj.attempt_count}`);
                    // TODO: notify user, suspend after N failures
                    break;

                default:
                    log("info", event.type, "unhandled — ignored");
            }

            return res.status(200).json({ received: true, type: event.type });
        } catch (err) {
            log("error", event.type, `handler threw: ${(err as Error).message}`);
            return res.status(500).json({ message: "Webhook handler error" });
        }
    }
    /**
     * GET /payments/invoices?page=1&limit=20
     * List the authenticated user's invoices from the local DB (OCR-scanned bills).
     */
    public async getInvoices(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
        const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));

        try {
            const repo = AppDataSource.getRepository(Invoice);
            const [invoices, total] = await repo.findAndCount({
                where: { userId: req.user.userId },
                order: { createdAt: "DESC" },
                skip: (page - 1) * limit,
                take: limit,
            });

            return res.status(200).json({
                message: "Invoices retrieved",
                data: invoices,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        } catch (err) {
            return res.status(500).json({ message: "Failed to fetch invoices", error: (err as Error).message });
        }
    }

    /**
     * POST /payments/setup-intent
     * Create a Stripe SetupIntent so mobile can save a card for future payments.
     * Finds or creates a Stripe Customer linked to the user's email.
     */
    public async createSetupIntent(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        try {
            const stripe = getStripe();
            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOne({ where: { id: req.user.userId } });

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Find or create Stripe Customer
            let customerId: string;
            if (user.email) {
                const existing = await stripe.customers.list({ email: user.email, limit: 1 });
                if (existing.data.length > 0) {
                    customerId = existing.data[0].id;
                } else {
                    const customer = await stripe.customers.create({
                        email: user.email,
                        name: user.fullName ?? undefined,
                        metadata: { userId: user.id },
                    });
                    customerId = customer.id;
                }
            } else {
                const customer = await stripe.customers.create({
                    metadata: { userId: user.id },
                });
                customerId = customer.id;
            }

            const setupIntent = await stripe.setupIntents.create({
                customer: customerId,
                payment_method_types: ["card"],
            });

            return res.status(200).json({
                message: "Setup intent created",
                data: {
                    clientSecret: setupIntent.client_secret,
                    customerId,
                },
            });
        } catch (err) {
            return res.status(500).json({ message: "Failed to create setup intent", error: (err as Error).message });
        }
    }

    /**
     * GET /payments/stripe-invoices
     * List the user's Stripe invoices (subscription/checkout invoices from Stripe Dashboard).
     * Looks up the Stripe Customer by user email.
     */
    public async getStripeInvoices(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        try {
            const stripe = getStripe();
            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOne({ where: { id: req.user.userId } });

            if (!user?.email) {
                return res.status(200).json({ message: "No invoices found", data: [] });
            }

            const customers = await stripe.customers.list({ email: user.email, limit: 1 });
            if (customers.data.length === 0) {
                return res.status(200).json({ message: "No Stripe customer found", data: [] });
            }

            const invoices = await stripe.invoices.list({
                customer: customers.data[0].id,
                limit: 20,
            });

            const data = invoices.data.map((inv) => ({
                id: inv.id,
                number: inv.number,
                status: inv.status,          // draft | open | paid | void | uncollectible
                amountDue: inv.amount_due,      // cents
                amountPaid: inv.amount_paid,     // cents
                currency: inv.currency,
                description: inv.description,
                pdfUrl: inv.invoice_pdf,
                hostedUrl: inv.hosted_invoice_url,
                createdAt: new Date(inv.created * 1000).toISOString(),
                dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
            }));

            return res.status(200).json({ message: "Stripe invoices retrieved", data });
        } catch (err) {
            return res.status(500).json({ message: "Failed to fetch Stripe invoices", error: (err as Error).message });
        }
    }
    /**
     * GET /payments/waste-bills?paid=false&page=1&limit=20
     * List waste detection records that are picked_up, with bill amount (kg × 500 VND).
     * paid=false → chưa thanh toán | paid=true → đã thanh toán | omit → tất cả
     */
    public async getWasteBills(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const RATE_VND_PER_KG = 500;
        const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
        const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
        const paidFilter = req.query.paid;

        try {
            const repo = AppDataSource.getRepository(WasteDetection);
            const qb = repo.createQueryBuilder("wd")
                .where("wd.householdId IS NOT NULL")
                .andWhere("wd.status = :status", { status: STATUS.PICKED_UP })
                .andWhere("wd.totalMassKg IS NOT NULL")
                .orderBy("wd.pickedUpAt", "DESC")
                .skip((page - 1) * limit)
                .take(limit);

            if (paidFilter === "true") qb.andWhere("wd.isPaid = true");
            if (paidFilter === "false") qb.andWhere("wd.isPaid = false");

            const [records, total] = await qb.getManyAndCount();

            const data = records.map((r) => ({
                id: r.id,
                householdId: r.householdId,
                totalMassKg: r.totalMassKg,
                billAmount: r.billAmount ?? (r.totalMassKg! * RATE_VND_PER_KG),
                ratePerKg: RATE_VND_PER_KG,
                isPaid: r.isPaid,
                paidAt: r.paidAt ?? null,
                pickedUpAt: r.pickedUpAt ?? null,
                collectorId: r.collectorId ?? null,
                imageUrl: r.imageUrl ?? null,
                annotatedImageUrl: r.annotatedImageUrl ?? null,
                status: r.status,
                createdAt: r.createdAt,
            }));

            return res.status(200).json({
                message: "Waste bills retrieved",
                data,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        } catch (err) {
            return res.status(500).json({ message: "Failed to fetch waste bills", error: (err as Error).message });
        }
    }

    /**
     * POST /payments/waste-checkout
     * Create a Stripe Checkout Session to pay a specific waste bill.
     * Body: { wasteDetectionId, successUrl, cancelUrl }
     */
    public async createWasteCheckout(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const RATE_VND_PER_KG = 500;
        const { wasteDetectionId, successUrl, cancelUrl } = req.body as Record<string, string>;

        if (!wasteDetectionId || !successUrl || !cancelUrl) {
            return res.status(400).json({ message: "wasteDetectionId, successUrl and cancelUrl are required" });
        }

        try {
            const repo = AppDataSource.getRepository(WasteDetection);
            const record = await repo.findOne({ where: { id: wasteDetectionId } });

            if (!record) {
                return res.status(404).json({ message: "Waste detection record not found" });
            }
            if (record.status !== STATUS.PICKED_UP) {
                return res.status(400).json({ message: "Can only pay for picked_up waste records" });
            }
            if (record.isPaid) {
                return res.status(400).json({ message: "This bill has already been paid" });
            }
            if (!record.totalMassKg) {
                return res.status(400).json({ message: "Waste record has no weight recorded" });
            }

            const billAmount = record.billAmount ?? record.totalMassKg * RATE_VND_PER_KG;
            // VND is zero-decimal in Stripe — amount = VND directly (no ×100)
            const stripeAmount = Math.round(billAmount);

            const stripe = getStripe();
            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                payment_method_types: ["card"],
                line_items: [{
                    price_data: {
                        currency: "vnd",
                        product_data: {
                            name: `Phí thu gom rác — ${record.totalMassKg.toFixed(2)} kg`,
                            description: `${record.totalMassKg.toFixed(2)} kg × ${RATE_VND_PER_KG} VND/kg`,
                        },
                        unit_amount: stripeAmount,
                    },
                    quantity: 1,
                }],
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    userId: req.user.userId,
                    wasteDetectionId: record.id,
                    householdId: record.householdId ?? "",
                    totalMassKg: String(record.totalMassKg),
                    billAmount: String(billAmount),
                },
            });

            // Pre-save billAmount on the record for reference
            record.billAmount = billAmount;
            await repo.save(record);

            return res.status(200).json({
                message: "Waste checkout session created",
                data: {
                    url: session.url,
                    sessionId: session.id,
                    billAmount,
                    totalMassKg: record.totalMassKg,
                    ratePerKg: RATE_VND_PER_KG,
                },
            });
        } catch (err) {
            return res.status(500).json({ message: "Failed to create waste checkout", error: (err as Error).message });
        }
    }
}

export default new PaymentController();

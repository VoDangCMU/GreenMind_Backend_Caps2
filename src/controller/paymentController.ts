import { Request, Response } from "express";
import Stripe from "stripe";

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
            const failed    = charges.filter(c => c.status === "failed");
            const refunded  = charges.filter(c => c.refunded);

            const totalRevenue   = succeeded.reduce((a, c) => a + (c.amount_captured ?? c.amount), 0);
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
                slot.count   += 1;
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
                    count:  charges.filter(c => c.status === "pending").length,
                    amount: charges.filter(c => c.status === "pending").reduce((a, c) => a + c.amount, 0),
                },
                { status: "failed",   count: failed.length,   amount: failed.reduce((a, c) => a + c.amount, 0) },
                { status: "refunded", count: refunded.length, amount: refundedAmount },
            ];

            const recentTransactions = charges.slice(0, 20).map(c => ({
                id:          c.id,
                amount:      c.amount,
                currency:    c.currency,
                status:      c.refunded ? "refunded" : c.status,
                customer:    c.billing_details?.name ?? (c.metadata as Record<string, string>)?.customer ?? "—",
                email:       c.billing_details?.email ?? c.receipt_email ?? "—",
                description: c.description ?? c.statement_descriptor ?? "Payment",
                createdAt:   new Date(c.created * 1000).toISOString(),
                stripeId:    c.id,
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
                cancel_url:  cancelUrl as string,
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
                    // TODO: fulfill order, grant premium access
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
}

export default new PaymentController();

import { Request, Response } from "express";
import Stripe from "stripe";

const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    return new Stripe(key);
};

// ─────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────

function log(level: "info" | "warn" | "error", event: string, msg: string) {
    const prefix = { info: "✅", warn: "⚠️", error: "❌" }[level];
    console.log(`[Stripe ${prefix}] ${event}: ${msg}`);
}

// ─────────────────────────────────────────────────────────────────────────
//  Controller
// ─────────────────────────────────────────────────────────────────────────

class PaymentController {
    /**
     * GET /payments/analytics?days=30
     * Fetches charges from Stripe and builds analytics summary.
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
                    count: charges.filter(c => c.status === "pending").length,
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
     * Creates a Stripe Checkout Session.
     */
    public async createCheckout(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { amount, currency = "usd", description, successUrl, cancelUrl } = req.body;

        if (!amount || !successUrl || !cancelUrl) {
            return res.status(400).json({ message: "amount, successUrl and cancelUrl are required" });
        }

        try {
            const stripe = getStripe();
            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                payment_method_types: ["card"],
                line_items: [
                    {
                        price_data: {
                            currency: (currency as string).toLowerCase(),
                            product_data: { name: (description as string | undefined) ?? "GreenMind Payment" },
                            unit_amount: amount as number,
                        },
                        quantity: 1,
                    },
                ],
                success_url: successUrl as string,
                cancel_url:  cancelUrl as string,
                metadata: { userId: req.user.userId },
            });

            return res.status(200).json({
                message: "Checkout session created",
                data: { url: session.url, sessionId: session.id },
            });
        } catch (err) {
            return res.status(500).json({
                message: "Failed to create checkout session",
                error: (err as Error).message,
            });
        }
    }

    /**
     * POST /payments/webhook
     * Stripe webhook — handles all configured events.
     *
     * Events to enable in Stripe Dashboard:
     *   PAYMENT:
     *     - payment_intent.succeeded
     *     - payment_intent.payment_failed
     *     - payment_intent.canceled
     *   CHARGE:
     *     - charge.succeeded
     *     - charge.failed
     *     - charge.refunded
     *     - charge.dispute.created
     *   CHECKOUT:
     *     - checkout.session.completed
     *     - checkout.session.expired
     *   SUBSCRIPTION (optional):
     *     - customer.subscription.created
     *     - customer.subscription.updated
     *     - customer.subscription.deleted
     *     - invoice.payment_succeeded
     *     - invoice.payment_failed
     */
    public async handleWebhook(req: Request, res: Response) {
        const sig = req.headers["stripe-signature"];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!sig || !webhookSecret) {
            return res.status(400).json({ message: "Missing Stripe signature or webhook secret" });
        }

        let event: Stripe.Event;
        try {
            const stripe = getStripe();
            event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
        } catch (err) {
            return res.status(400).json({ message: `Webhook signature verification failed: ${(err as Error).message}` });
        }

        try {
            switch (event.type) {

                // ── Payment Intent ────────────────────────────────────
                case "payment_intent.succeeded": {
                    const pi = event.data.object as Stripe.PaymentIntent;
                    log("info", event.type, `id=${pi.id} amount=${pi.amount_received / 100} ${pi.currency.toUpperCase()} user=${pi.metadata?.userId ?? "?"}`);
                    // TODO: mark order as paid in DB, send confirmation email, update greenScore, etc.
                    break;
                }

                case "payment_intent.payment_failed": {
                    const pi = event.data.object as Stripe.PaymentIntent;
                    const reason = pi.last_payment_error?.message ?? "unknown";
                    log("warn", event.type, `id=${pi.id} reason="${reason}"`);
                    // TODO: notify user of failure
                    break;
                }

                case "payment_intent.canceled": {
                    const pi = event.data.object as Stripe.PaymentIntent;
                    log("warn", event.type, `id=${pi.id} cancellation_reason=${pi.cancellation_reason}`);
                    break;
                }

                // ── Charge ────────────────────────────────────────────
                case "charge.succeeded": {
                    const charge = event.data.object as Stripe.Charge;
                    log("info", event.type, `id=${charge.id} amount=${charge.amount / 100} ${charge.currency.toUpperCase()}`);
                    break;
                }

                case "charge.failed": {
                    const charge = event.data.object as Stripe.Charge;
                    log("warn", event.type, `id=${charge.id} failure="${charge.failure_message}"`);
                    break;
                }

                case "charge.refunded": {
                    const charge = event.data.object as Stripe.Charge;
                    log("info", event.type, `id=${charge.id} refunded=${charge.amount_refunded / 100} ${charge.currency.toUpperCase()}`);
                    // TODO: update DB refund status, notify user
                    break;
                }

                case "charge.dispute.created": {
                    const dispute = event.data.object as Stripe.Dispute;
                    log("error", event.type, `id=${dispute.id} charge=${dispute.charge} amount=${dispute.amount / 100} reason=${dispute.reason}`);
                    // TODO: alert admin, freeze account if needed
                    break;
                }

                // ── Checkout Session ──────────────────────────────────
                case "checkout.session.completed": {
                    const session = event.data.object as Stripe.Checkout.Session;
                    log("info", event.type, `id=${session.id} customer=${session.customer} total=${(session.amount_total ?? 0) / 100}`);
                    // TODO: fulfill order, grant premium access, etc.
                    break;
                }

                case "checkout.session.expired": {
                    const session = event.data.object as Stripe.Checkout.Session;
                    log("warn", event.type, `id=${session.id} expired without payment`);
                    // TODO: release reserved inventory if any
                    break;
                }

                // ── Subscription ──────────────────────────────────────
                case "customer.subscription.created": {
                    const sub = event.data.object as Stripe.Subscription;
                    log("info", event.type, `id=${sub.id} customer=${sub.customer} status=${sub.status}`);
                    // TODO: activate premium plan for user
                    break;
                }

                case "customer.subscription.updated": {
                    const sub = event.data.object as Stripe.Subscription;
                    log("info", event.type, `id=${sub.id} status=${sub.status}`);
                    // TODO: update user plan in DB
                    break;
                }

                case "customer.subscription.deleted": {
                    const sub = event.data.object as Stripe.Subscription;
                    log("warn", event.type, `id=${sub.id} customer=${sub.customer} — subscription cancelled`);
                    // TODO: downgrade user to free tier
                    break;
                }

                case "invoice.payment_succeeded": {
                    const invoice = event.data.object as Stripe.Invoice;
                    log("info", event.type, `id=${invoice.id} sub=${invoice.subscription} amount=${(invoice.amount_paid ?? 0) / 100}`);
                    // TODO: extend subscription period, send receipt
                    break;
                }

                case "invoice.payment_failed": {
                    const invoice = event.data.object as Stripe.Invoice;
                    log("warn", event.type, `id=${invoice.id} sub=${invoice.subscription} attempt=${invoice.attempt_count}`);
                    // TODO: notify user, retry logic, suspend access after N failures
                    break;
                }

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

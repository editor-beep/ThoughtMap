import { Router, type IRouter, type Request, type Response } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import { invalidateSubscriptionCache } from "../middlewares/subscription.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

// Raw body parser — must be used before express.json() in the app
router.post(
  "/stripe-webhook",
  (req, res, next) => {
    let rawBody = Buffer.alloc(0);
    req.on("data", (chunk: Buffer) => { rawBody = Buffer.concat([rawBody, chunk]); });
    req.on("end", () => { (req as Request & { rawBody: Buffer }).rawBody = rawBody; next(); });
  },
  async (req: Request, res: Response) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!secret || !stripeKey) {
      res.status(500).json({ error: "Server misconfiguration" });
      return;
    }

    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });
    const sig = req.headers["stripe-signature"] as string | undefined;
    const rawBody = (req as Request & { rawBody: Buffer }).rawBody;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig ?? "", secret);
    } catch (err) {
      logger.warn({ err }, "Stripe webhook signature verification failed");
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }

    try {
      await handleEvent(event, stripeKey);
    } catch (err) {
      logger.error({ err, eventType: event.type }, "Stripe webhook handler error");
      res.status(500).json({ error: "Webhook processing failed" });
      return;
    }

    res.json({ received: true });
  },
);

async function handleEvent(event: Stripe.Event, stripeKey: string): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId || !session.subscription || !session.customer) break;

      const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const periodEnd = subscription.items.data[0]?.current_period_end;

      await db
        .update(subscriptionsTable)
        .set({
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        })
        .where(eq(subscriptionsTable.userId, userId));
      invalidateSubscriptionCache(userId);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await updateSubscriptionByStripeId(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await db
        .update(subscriptionsTable)
        .set({ status: "canceled" })
        .where(eq(subscriptionsTable.stripeSubscriptionId, subscription.id));
      await invalidateCacheByStripeId(subscription.id);
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoice.parent?.subscription_details?.subscription;
      if (!subId) break;
      const stripeSubId = typeof subId === "string" ? subId : subId.id;
      // Reset usage counters for the new billing period
      await db
        .update(subscriptionsTable)
        .set({
          requestsThisPeriod: 0,
          tokensThisPeriod: 0,
          periodResetAt: new Date(),
        })
        .where(eq(subscriptionsTable.stripeSubscriptionId, stripeSubId));
      await invalidateCacheByStripeId(stripeSubId);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoice.parent?.subscription_details?.subscription;
      if (!subId) break;
      const stripeSubId = typeof subId === "string" ? subId : subId.id;
      await db
        .update(subscriptionsTable)
        .set({ status: "past_due" })
        .where(eq(subscriptionsTable.stripeSubscriptionId, stripeSubId));
      await invalidateCacheByStripeId(stripeSubId);
      break;
    }

    default:
      logger.info({ eventType: event.type }, "Unhandled Stripe webhook event");
  }
}

async function updateSubscriptionByStripeId(subscription: Stripe.Subscription): Promise<void> {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  await db
    .update(subscriptionsTable)
    .set({
      status: subscription.status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    })
    .where(eq(subscriptionsTable.stripeSubscriptionId, subscription.id));
  await invalidateCacheByStripeId(subscription.id);
}

async function invalidateCacheByStripeId(stripeSubscriptionId: string): Promise<void> {
  const rows = await db
    .select({ userId: subscriptionsTable.userId })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);
  if (rows[0]) invalidateSubscriptionCache(rows[0].userId);
}

export default router;

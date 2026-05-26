import { Router, type IRouter, type Request, type Response } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

router.post("/billing/checkout", requireAuth, async (req: Request, res: Response) => {
  const priceId = process.env.STRIPE_PRICE_ID;
  const successUrl = process.env.STRIPE_SUCCESS_URL;
  const cancelUrl = process.env.STRIPE_CANCEL_URL;
  if (!priceId || !successUrl || !cancelUrl) {
    res.status(500).json({ error: "Server misconfiguration: missing Stripe env vars" });
    return;
  }

  const userId = req.user!.id;
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    res.status(500).json({ error: "Server misconfiguration: missing STRIPE_SECRET_KEY" });
    return;
  }

  // Get or create Stripe customer
  const sub = (await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId)).limit(1))[0];
  let customerId = sub?.stripeCustomerId ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user!.email,
      metadata: { userId },
    });
    customerId = customer.id;
    await db
      .update(subscriptionsTable)
      .set({ stripeCustomerId: customerId })
      .where(eq(subscriptionsTable.userId, userId));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
  });

  res.json({ url: session.url });
});

router.post("/billing/portal", requireAuth, async (req: Request, res: Response) => {
  const returnUrl = process.env.STRIPE_CANCEL_URL ?? process.env.STRIPE_SUCCESS_URL;
  if (!returnUrl) {
    res.status(500).json({ error: "Server misconfiguration: missing Stripe return URL" });
    return;
  }

  const userId = req.user!.id;
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    res.status(500).json({ error: "Server misconfiguration: missing STRIPE_SECRET_KEY" });
    return;
  }

  const sub = (await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId)).limit(1))[0];
  if (!sub?.stripeCustomerId) {
    res.status(400).json({ error: "No billing account found" });
    return;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: returnUrl,
  });

  res.json({ url: session.url });
});

export default router;

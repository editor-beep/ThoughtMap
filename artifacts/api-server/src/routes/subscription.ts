import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { storage } from "../storage";
import { getUncachableStripeClient } from "../stripeClient";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/subscription/status", requireAuth, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.userId);
    if (!user?.stripeCustomerId) {
      return res.json({ subscribed: false, subscription: null });
    }
    const isActive = await storage.hasActiveSubscription(user.stripeCustomerId);
    res.json({ subscribed: isActive, subscription: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/subscription/checkout", requireAuth, async (req: any, res) => {
  try {
    let user = await storage.getUser(req.userId);

    if (!user) {
      const clerkUser = await clerkClient.users.getUser(req.userId);
      const email =
        clerkUser.emailAddresses[0]?.emailAddress ?? "";
      user = await storage.upsertUser(req.userId, email);
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const stripe = await getUncachableStripeClient();
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      user = await storage.updateUserStripeInfo(user.id, {
        stripeCustomerId: customer.id,
      });
      customerId = customer.id;
    }

    let priceId = req.body.priceId;
    if (!priceId) {
      try {
        const products = await storage.listProductsWithPrices();
        priceId = products[0]?.prices?.[0]?.id;
      } catch { /* DB sync not ready */ }
    }
    if (!priceId) {
      try {
        const stripe = await getUncachableStripeClient();
        const prices = await stripe.prices.list({ active: true, type: "recurring", limit: 10 });
        const sorted = prices.data.sort((a, b) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0));
        priceId = sorted[0]?.id;
      } catch { /* Stripe API fallback failed */ }
    }
    if (!priceId) {
      priceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    }

    if (!priceId) {
      return res.status(400).json({ error: "No price available. Please set up a product in Stripe first." });
    }

    const stripe = await getUncachableStripeClient();
    const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
    const proto = req.headers["x-forwarded-proto"] ?? req.protocol ?? "https";
    const baseUrl = `${proto}://${host}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId!,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/`,
      cancel_url: `${baseUrl}/`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/subscription/portal", requireAuth, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.userId);
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: "No subscription found" });
    }

    const stripe = await getUncachableStripeClient();
    const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
    const proto = req.headers["x-forwarded-proto"] ?? req.protocol ?? "https";
    const baseUrl = `${proto}://${host}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/`,
    });

    res.json({ url: portalSession.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/user/sync", requireAuth, async (req: any, res) => {
  try {
    const clerkUser = await clerkClient.users.getUser(req.userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const user = await storage.upsertUser(req.userId, email);
    const subscribed = user.stripeCustomerId
      ? await storage.hasActiveSubscription(user.stripeCustomerId)
      : false;
    res.json({ user: { id: user.id, email: user.email }, subscribed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

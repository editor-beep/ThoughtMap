import { getAuth } from "@clerk/express";
import { storage } from "../storage";
import { getUncachableStripeClient } from "../stripeClient";

export function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = userId;
  next();
}

async function checkSubscriptionActive(stripeCustomerId: string): Promise<boolean> {
  try {
    const stripe = await getUncachableStripeClient();
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
      limit: 5,
    });
    return subscriptions.data.some(
      (sub) => sub.status === "active" && !sub.cancel_at_period_end,
    );
  } catch {
    return storage.hasActiveSubscription(stripeCustomerId);
  }
}

export async function requireSubscription(req: any, res: any, next: any) {
  try {
    const user = await storage.getUser(req.userId);
    if (!user?.stripeCustomerId) {
      return res.status(403).json({ error: "Subscription required", code: "subscription_required" });
    }
    const active = await checkSubscriptionActive(user.stripeCustomerId);
    if (!active) {
      return res.status(403).json({ error: "Subscription required", code: "subscription_required" });
    }
    next();
  } catch (err) {
    next(err);
  }
}

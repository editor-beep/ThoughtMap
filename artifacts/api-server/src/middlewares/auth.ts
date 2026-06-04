import { getAuth } from "@clerk/express";
import { storage } from "../storage";

export function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = userId;
  next();
}

export async function requireSubscription(req: any, res: any, next: any) {
  try {
    const user = await storage.getUser(req.userId);
    if (!user?.stripeCustomerId) {
      return res.status(403).json({ error: "Subscription required", code: "subscription_required" });
    }
    const active = await storage.hasActiveSubscription(user.stripeCustomerId);
    if (!active) {
      return res.status(403).json({ error: "Subscription required", code: "subscription_required" });
    }
    next();
  } catch (err) {
    next(err);
  }
}

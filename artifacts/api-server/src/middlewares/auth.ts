import { getAuth, clerkClient } from "@clerk/express";
import { storage } from "../storage";
import { getUncachableStripeClient } from "../stripeClient";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = userId;
  next();
}

async function isAdminUser(userId: string, storedEmail?: string): Promise<boolean> {
  if (ADMIN_EMAILS.length === 0) return false;
  if (storedEmail && ADMIN_EMAILS.includes(storedEmail.toLowerCase())) return true;
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    return ADMIN_EMAILS.includes(email.toLowerCase());
  } catch {
    return false;
  }
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
    if (await isAdminUser(req.userId, user?.email ?? undefined)) {
      return next();
    }
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

import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable, type SelectSubscription } from "@workspace/db";
import { requireAuth } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      subscription?: SelectSubscription;
    }
  }
}

// 60-second in-memory cache: userId → { subscription, expiresAt }
const cache = new Map<string, { subscription: SelectSubscription | null; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

// 10 requests per minute per user short-term limiter
const shortTermMap = new Map<string, { count: number; resetAt: number }>();
const SHORT_LIMIT = 10;
const SHORT_WINDOW_MS = 60_000;

function isShortRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = shortTermMap.get(userId);
  if (!entry || now >= entry.resetAt) {
    shortTermMap.set(userId, { count: 1, resetAt: now + SHORT_WINDOW_MS });
    return false;
  }
  if (entry.count >= SHORT_LIMIT) return true;
  entry.count++;
  return false;
}

async function getSubscription(userId: string): Promise<SelectSubscription | null> {
  const cached = cache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.subscription;

  const rows = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId)).limit(1);
  const subscription = rows[0] ?? null;
  cache.set(userId, { subscription, expiresAt: Date.now() + CACHE_TTL_MS });
  return subscription;
}

export function invalidateSubscriptionCache(userId: string): void {
  cache.delete(userId);
}

export function requireSubscription(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, async () => {
    const userId = req.user!.id;

    if (isShortRateLimited(userId)) {
      res.status(429).json({ error: "Too many requests — please wait a moment before trying again" });
      return;
    }

    let subscription: SelectSubscription | null;
    try {
      subscription = await getSubscription(userId);
    } catch {
      res.status(500).json({ error: "Failed to verify subscription" });
      return;
    }

    if (!subscription || subscription.status !== "active") {
      res.status(402).json({ error: "subscription_required" });
      return;
    }

    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
      res.status(402).json({ error: "subscription_required" });
      return;
    }

    if (subscription.requestsThisPeriod >= subscription.monthlyRequestLimit) {
      res.status(402).json({ error: "usage_limit_reached" });
      return;
    }

    req.subscription = subscription;
    next();
  });
}

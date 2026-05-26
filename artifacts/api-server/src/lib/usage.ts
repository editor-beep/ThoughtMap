import { eq, sql } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import { invalidateSubscriptionCache } from "../middlewares/subscription.js";

export async function recordUsage(userId: string, tokens: number): Promise<void> {
  await db
    .update(subscriptionsTable)
    .set({
      requestsThisPeriod: sql`${subscriptionsTable.requestsThisPeriod} + 1`,
      tokensThisPeriod: sql`${subscriptionsTable.tokensThisPeriod} + ${tokens}`,
    })
    .where(eq(subscriptionsTable.userId, userId));
  invalidateSubscriptionCache(userId);
}

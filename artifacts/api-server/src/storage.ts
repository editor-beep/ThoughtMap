import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient } from "./stripeClient";

export class Storage {
  async getUser(id: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user ?? null;
  }

  async upsertUser(id: string, email: string) {
    const [user] = await db
      .insert(usersTable)
      .values({ id, email })
      .onConflictDoUpdate({ target: usersTable.id, set: { email } })
      .returning();
    return user;
  }

  async updateUserStripeInfo(
    userId: string,
    stripeInfo: { stripeCustomerId?: string; stripeSubscriptionId?: string },
  ) {
    const [user] = await db
      .update(usersTable)
      .set(stripeInfo)
      .where(eq(usersTable.id, userId))
      .returning();
    return user;
  }

  async hasActiveSubscription(stripeCustomerId: string): Promise<boolean> {
    const [user] = await db
      .select({
        subscriptionStatus: usersTable.subscriptionStatus,
        stripeSubscriptionId: usersTable.stripeSubscriptionId,
      })
      .from(usersTable)
      .where(eq(usersTable.stripeCustomerId, stripeCustomerId));

    if (!user) return false;

    if (user.subscriptionStatus === "active") return true;

    if (user.subscriptionStatus !== null) return false;

    try {
      const stripe = await getUncachableStripeClient();
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "active",
        limit: 1,
      });
      const isActive = subscriptions.data.length > 0;
      if (isActive) {
        const sub = subscriptions.data[0];
        await db
          .update(usersTable)
          .set({ subscriptionStatus: "active", stripeSubscriptionId: sub.id })
          .where(eq(usersTable.stripeCustomerId, stripeCustomerId));
      }
      return isActive;
    } catch {
      return false;
    }
  }

  async updateSubscriptionStatusByCustomerId(
    stripeCustomerId: string,
    status: string,
    subscriptionId?: string,
    endDate?: Date | null,
  ) {
    const set: Partial<typeof usersTable.$inferInsert> = {
      subscriptionStatus: status,
    };
    if (subscriptionId !== undefined) set.stripeSubscriptionId = subscriptionId;
    if (endDate !== undefined) set.subscriptionEndDate = endDate;

    await db
      .update(usersTable)
      .set(set)
      .where(eq(usersTable.stripeCustomerId, stripeCustomerId));
  }
}

export const storage = new Storage();

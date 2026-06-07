import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
      .select({ subscriptionStatus: usersTable.subscriptionStatus })
      .from(usersTable)
      .where(eq(usersTable.stripeCustomerId, stripeCustomerId));
    return user?.subscriptionStatus === "active";
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

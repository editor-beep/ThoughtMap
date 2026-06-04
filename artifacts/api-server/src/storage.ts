import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

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
    const result = await db.execute(
      sql`SELECT id FROM stripe.subscriptions WHERE customer = ${stripeCustomerId} AND status = 'active' LIMIT 1`,
    );
    return (result.rows?.length ?? 0) > 0;
  }

  async listProductsWithPrices() {
    const result = await db.execute(
      sql`
        SELECT
          p.id as product_id, p.name as product_name, p.description as product_description,
          pr.id as price_id, pr.unit_amount, pr.currency, pr.recurring
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY p.id, pr.unit_amount
      `,
    );
    const map = new Map<string, any>();
    for (const row of result.rows as any[]) {
      if (!map.has(row.product_id)) {
        map.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          prices: [],
        });
      }
      if (row.price_id) {
        map.get(row.product_id).prices.push({
          id: row.price_id,
          unitAmount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
        });
      }
    }
    return Array.from(map.values());
  }
}

export const storage = new Storage();

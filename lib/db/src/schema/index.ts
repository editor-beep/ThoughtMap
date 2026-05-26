import { pgTable, text, real, boolean, timestamp, primaryKey, integer, jsonb } from "drizzle-orm/pg-core";

// ── Nodes ──────────────────────────────────────────────────────────────────

export const nodesTable = pgTable("nodes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  type: text("type").notNull().default("thought"),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertNode = typeof nodesTable.$inferInsert;
export type SelectNode = typeof nodesTable.$inferSelect;

// ── Edges ──────────────────────────────────────────────────────────────────

export const edgesTable = pgTable("edges", {
  id: text("id").primaryKey(),
  source: text("source")
    .notNull()
    .references(() => nodesTable.id, { onDelete: "cascade" }),
  target: text("target")
    .notNull()
    .references(() => nodesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("references"),
});

export type InsertEdge = typeof edgesTable.$inferInsert;
export type SelectEdge = typeof edgesTable.$inferSelect;

// ── Realms ─────────────────────────────────────────────────────────────────

export const realmsTable = pgTable("realms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().default("✦"),
  color: text("color").notNull().default("#06b6d4"),
  isActive: boolean("is_active").notNull().default(true),
});

export type InsertRealm = typeof realmsTable.$inferInsert;
export type SelectRealm = typeof realmsTable.$inferSelect;

// ── Node ↔ Realm join ──────────────────────────────────────────────────────

export const nodeRealmsTable = pgTable(
  "node_realms",
  {
    nodeId: text("node_id")
      .notNull()
      .references(() => nodesTable.id, { onDelete: "cascade" }),
    realmId: text("realm_id")
      .notNull()
      .references(() => realmsTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.nodeId, t.realmId] })],
);

// ── Chat messages ──────────────────────────────────────────────────────────

export const chatMessagesTable = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  complete: boolean("complete").notNull().default(true),
  extractedNodeId: text("extracted_node_id").references(() => nodesTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertChatMessage = typeof chatMessagesTable.$inferInsert;
export type SelectChatMessage = typeof chatMessagesTable.$inferSelect;

// ── Users ──────────────────────────────────────────────────────────────────

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

// ── Subscriptions ──────────────────────────────────────────────────────────

export const subscriptionsTable = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  status: text("status").notNull().default("none"), // 'active' | 'trialing' | 'past_due' | 'canceled' | 'none'
  currentPeriodEnd: timestamp("current_period_end"),
  monthlyRequestLimit: integer("monthly_request_limit").notNull().default(500),
  requestsThisPeriod: integer("requests_this_period").notNull().default(0),
  tokensThisPeriod: integer("tokens_this_period").notNull().default(0),
  periodResetAt: timestamp("period_reset_at"),
});

export type InsertSubscription = typeof subscriptionsTable.$inferInsert;
export type SelectSubscription = typeof subscriptionsTable.$inferSelect;

// ── User snapshots (cloud sync) ────────────────────────────────────────────

export const userSnapshotsTable = pgTable("user_snapshots", {
  userId: text("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type InsertUserSnapshot = typeof userSnapshotsTable.$inferInsert;
export type SelectUserSnapshot = typeof userSnapshotsTable.$inferSelect;

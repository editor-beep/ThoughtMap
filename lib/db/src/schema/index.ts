import { pgTable, text, real, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";

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

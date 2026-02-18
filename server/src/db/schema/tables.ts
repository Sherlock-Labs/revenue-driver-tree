import { pgTable, serial, text, uuid, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const trees = pgTable(
  "trees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    name: text("name").notNull().default("Untitled Revenue Plan"),
    inputs: jsonb("inputs").notNull().default("{}"),
    nodes: jsonb("nodes").notNull().default("[]"),
    shareToken: text("share_token").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_trees_user").on(table.clerkUserId)]
);

export const processedEvents = pgTable("processed_events", {
  eventId: text("event_id").primaryKey(),
  source: text("source").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});

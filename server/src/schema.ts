// Drizzle schema for Kryntar.
//
// `scores`: DEEP DIVE runs submitted to the shared all-time leaderboard.
// The `pearls` column predates the current naming; it counts the Kryn
// gems collected in that dive. `depth` is the depth reached in metres.
// `tier` is the player's self-declared holder tier at submit time
// ("free" NFT holder or "legendary" NFT holder — guests cannot submit).
// `season` is the ISO date (YYYY-MM-DD) of the Monday 00:00 UTC that
// opened the season the run belongs to, computed server-side at submit
// time (kept from the original weekly board).
//
// `plays`: one row per dive STARTED, used to enforce the daily play
// quota server-side. Identity is the player's name + optional wallet;
// `day` is the UTC date (YYYY-MM-DD) the play belongs to. Quotas reset
// at 00:00 UTC: guest 1/day, free holder 3/day, legendary unlimited.

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const scores = sqliteTable("scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  score: integer("score").notNull(),
  pearls: integer("pearls").notNull(),
  depth: integer("depth").notNull().default(0),
  tier: text("tier", { enum: ["free", "legendary"] }).notNull().default("free"),
  wallet: text("wallet"),
  season: text("season").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const plays = sqliteTable("plays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  wallet: text("wallet"),
  tier: text("tier", { enum: ["guest", "free", "legendary"] }).notNull(),
  day: text("day").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Actions for Kryntar — DEEP DIVE play access + the shared online
// leaderboard.
//
// PLAY ACCESS (counted on the server, per player identity per UTC day):
// a player identity is the diver name + optional wallet string they type
// in. Identity is self-declared — the Kryntar NFT contract is not live
// yet, so there is no on-chain holder check; the tier a player picks is
// taken at face value until the contract ships and verification can be
// switched on. Quotas per UTC day (reset 00:00 UTC):
//   legendary holder — unlimited plays
//   free holder      — 3 plays, every finished dive can be submitted
//   guest (no NFT)   — 1 practice play, score CANNOT be submitted
//
// LEADERBOARD: every submitted score is recorded permanently and shown
// to everyone, all-time, ordered by score. Honor only — no prize pool.
// Seasons (Monday 00:00 UTC) are still stamped on each score row and the
// old weekly board action is kept for compatibility.

import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { asc, desc, eq } from "drizzle-orm";
import * as schema from "./schema";

/** ISO date (YYYY-MM-DD) of the Monday 00:00 UTC opening the season that
 *  contains `date`. */
function seasonStartOf(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dow = d.getUTCDay(); // 0 = Sunday … 1 = Monday
  const back = (dow + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

function shiftSeason(season: string, weeks: number): string {
  const d = new Date(`${season}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function maskWallet(wallet: string | null): string | null {
  if (!wallet) return null;
  const w = wallet.trim();
  if (w.length <= 10) return w;
  return `${w.slice(0, 6)}…${w.slice(-4)}`;
}

/* --------------------------- play access --------------------------- */

const tierEnum = z.enum(["guest", "free", "legendary"]);
type Tier = z.infer<typeof tierEnum>;

/** Daily play quota per tier; null = unlimited. */
const PLAY_LIMITS: Record<Tier, number | null> = {
  guest: 1,
  free: 3,
  legendary: null,
};

/** UTC calendar day (YYYY-MM-DD) containing `date` — quotas key on it. */
function utcDayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** ISO instant of the next 00:00 UTC after `date` (the quota reset). */
function nextUtcMidnight(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

/** Canonical identity key: name and wallet are matched case-insensitively
 *  and without surrounding whitespace, so "VEYRA" and "veyra" are one
 *  player for quota purposes. */
function identityKey(name: string, wallet: string | null): string {
  return `${name.trim().toLowerCase()}|${(wallet ?? "").trim().toLowerCase()}`;
}

const accessResponse = z.object({
  tier: tierEnum,
  day: z.string(),
  resets_at: z.string(),
  plays_used: z.number(),
  plays_limit: z.number().nullable(),
  plays_left: z.number().nullable(),
  can_submit: z.boolean(),
});

type AccessInfo = z.infer<typeof accessResponse>;

async function loadAccess(
  ctx: Ctx,
  name: string,
  wallet: string | null,
  tier: Tier,
): Promise<AccessInfo> {
  const db = ctx.db<typeof schema>();
  const now = new Date();
  const day = utcDayOf(now);
  const key = identityKey(name, wallet);
  const rows = await db
    .select()
    .from(schema.plays)
    .where(eq(schema.plays.day, day));
  const used = rows.filter(
    (r) => identityKey(r.name, r.wallet) === key,
  ).length;
  const limit = PLAY_LIMITS[tier];
  return {
    tier,
    day,
    resets_at: nextUtcMidnight(now),
    plays_used: used,
    plays_limit: limit,
    plays_left: limit === null ? null : Math.max(0, limit - used),
    can_submit: tier !== "guest",
  };
}

/* ---------------------------- board shapes ---------------------------- */

const boardEntry = z.object({
  rank: z.number(),
  name: z.string(),
  score: z.number(),
  pearls: z.number(),
  wallet: z.string().nullable(),
  created_at: z.string(),
});

const boardResponse = z.object({
  season: z.string(),
  season_ends_at: z.string(),
  entries: z.array(boardEntry),
  champions: z.array(boardEntry),
  total_runs: z.number(),
});

const lbEntry = z.object({
  rank: z.number(),
  name: z.string(),
  score: z.number(),
  depth: z.number(),
  pearls: z.number(),
  tier: z.string(),
  wallet: z.string().nullable(),
  created_at: z.string(),
});

const leaderboardResponse = z.object({
  entries: z.array(lbEntry),
  mine: lbEntry.nullable(),
  total: z.number(),
});

export const Actions = {
  getBoard: defineAction({
    description:
      "Returns the current week's Top Divers top 10, last week's top 3, and this week's total saved dives.",
    request: z.object({}),
    response: boardResponse,
    async handler(ctx): Promise<z.infer<typeof boardResponse>> {
      const db = ctx.db<typeof schema>();
      const now = new Date();
      const season = seasonStartOf(now);
      const prevSeason = shiftSeason(season, -1);
      const ends = new Date(`${season}T00:00:00Z`);
      ends.setUTCDate(ends.getUTCDate() + 7);

      const rows = await db
        .select()
        .from(schema.scores)
        .where(eq(schema.scores.season, season))
        .orderBy(desc(schema.scores.score), asc(schema.scores.id));
      const champRows = await db
        .select()
        .from(schema.scores)
        .where(eq(schema.scores.season, prevSeason))
        .orderBy(desc(schema.scores.score), asc(schema.scores.id))
        .limit(3);

      const toEntry = (
        row: (typeof rows)[number],
        i: number,
      ): z.infer<typeof boardEntry> => ({
        rank: i + 1,
        name: row.name,
        score: row.score,
        pearls: row.pearls,
        wallet: maskWallet(row.wallet),
        created_at: row.createdAt.toISOString(),
      });

      return {
        season,
        season_ends_at: ends.toISOString(),
        entries: rows.slice(0, 10).map(toEntry),
        champions: champRows.map(toEntry),
        total_runs: rows.length,
      };
    },
  }),

  getAccess: defineAction({
    description:
      "Returns today's play access for a player identity (name + optional wallet) and self-declared holder tier: plays used, plays left (null = unlimited), whether scores can be submitted, and the next 00:00 UTC reset.",
    request: z.object({
      name: z.string().trim().min(1).max(24),
      wallet: z.string().trim().max(64).optional(),
      tier: tierEnum,
    }),
    response: accessResponse,
    async handler(ctx, args): Promise<AccessInfo> {
      const wallet = args.wallet?.trim() ? args.wallet.trim() : null;
      return loadAccess(ctx, args.name, wallet, args.tier);
    },
  }),

  startPlay: defineAction({
    description:
      "Consumes one play from the player's daily quota (server-counted per name + wallet per UTC day) and returns the updated access. Denied when the quota is used up; legendary holders are never denied.",
    request: z.object({
      name: z.string().trim().min(1).max(24),
      wallet: z.string().trim().max(64).optional(),
      tier: tierEnum,
    }),
    response: z.object({
      allowed: z.boolean(),
      access: accessResponse,
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const wallet = args.wallet?.trim() ? args.wallet.trim() : null;
      const before = await loadAccess(ctx, args.name, wallet, args.tier);
      if (before.plays_left !== null && before.plays_left <= 0) {
        return { allowed: false, access: before };
      }
      await db.insert(schema.plays).values({
        name: args.name,
        wallet,
        tier: args.tier,
        day: before.day,
      });
      const after = await loadAccess(ctx, args.name, wallet, args.tier);
      ctx.invalidateQueries();
      return { allowed: true, access: after };
    },
  }),

  getLeaderboard: defineAction({
    description:
      "Returns the all-time online leaderboard: top 20 submitted dives (score, depth, gems, holder tier badge, submit time in UTC), the requesting player's own best entry even when outside the top 20, and the total number of recorded scores.",
    request: z.object({
      name: z.string().trim().max(24).optional(),
      wallet: z.string().trim().max(64).optional(),
    }),
    response: leaderboardResponse,
    async handler(ctx, args): Promise<z.infer<typeof leaderboardResponse>> {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.scores)
        .orderBy(desc(schema.scores.score), asc(schema.scores.id));

      const toEntry = (
        row: (typeof rows)[number],
        i: number,
      ): z.infer<typeof lbEntry> => ({
        rank: i + 1,
        name: row.name,
        score: row.score,
        depth: row.depth,
        pearls: row.pearls,
        tier: row.tier,
        wallet: maskWallet(row.wallet),
        created_at: row.createdAt.toISOString(),
      });

      let mine: z.infer<typeof lbEntry> | null = null;
      const name = args.name?.trim();
      if (name) {
        const key = identityKey(
          name,
          args.wallet?.trim() ? args.wallet.trim() : null,
        );
        const idx = rows.findIndex(
          (r) => identityKey(r.name, r.wallet) === key,
        );
        const row = idx >= 0 ? rows[idx] : undefined;
        if (row) mine = toEntry(row, idx);
      }

      return {
        entries: rows.slice(0, 20).map(toEntry),
        mine,
        total: rows.length,
      };
    },
  }),

  submitScore: defineAction({
    description:
      "Saves one finished DEEP DIVE run (diver name, score, depth reached, Kryn gems collected, holder tier, optional wallet) to the all-time online leaderboard and returns the run's leaderboard rank. Guest runs are rejected — only NFT holders can submit.",
    request: z.object({
      name: z.string().trim().min(1).max(24),
      score: z.number().int().min(0).max(100000),
      pearls: z.number().int().min(0).max(10000),
      depth: z.number().int().min(0).max(100000),
      tier: z.enum(["free", "legendary"]),
      wallet: z.string().trim().max(64).optional(),
    }),
    response: z.object({
      ok: z.literal(true),
      rank: z.number().nullable(),
      season: z.string(),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const season = seasonStartOf(new Date());
      const wallet = args.wallet?.trim() ? args.wallet.trim() : null;
      const inserted = await db
        .insert(schema.scores)
        .values({
          name: args.name,
          score: args.score,
          pearls: args.pearls,
          depth: args.depth,
          tier: args.tier,
          wallet,
          season,
        })
        .returning({ id: schema.scores.id });
      const row = inserted[0];
      if (!row) throw new Error("submitScore: insert returned no rows");

      const allRows = await db
        .select()
        .from(schema.scores)
        .orderBy(desc(schema.scores.score), asc(schema.scores.id));
      const idx = allRows.findIndex((r) => r.id === row.id);
      ctx.invalidateQueries();
      return {
        ok: true as const,
        rank: idx >= 0 ? idx + 1 : null,
        season,
      };
    },
  }),
} satisfies ActionsModule;

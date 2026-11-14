// Dive progress saved on this device: the gem bank, dive stats and missions.
//
// Everything here is localStorage only — no server. The bank counts every
// finished dive on this device, whether or not a server was reachable.
// Missions are derived from the bank + stats, so there is no separate
// mission state to drift out of sync.

import type { GemKind, RunResult } from "./game";

export type GemBank = Record<GemKind, number>;
export type DiveStats = { runs: number; bestDepth: number; bestCombo: number };

export type ProgressSnapshot = {
  bank: GemBank;
  stats: DiveStats;
  /** All gems banked on this device (kept in the legacy kryntar-gems-total key). */
  total: number;
  /** Best single-dive score (kept in the legacy kryntar-dive-best key). */
  best: number;
};

export const EMPTY_BANK: GemBank = { pale: 0, cracked: 0, ember: 0, heart: 0 };

const BANK_KEY = "kryntar-gem-bank";
const STATS_KEY = "kryntar-dive-stats";
const TOTAL_KEY = "kryntar-gems-total";
const BEST_KEY = "kryntar-dive-best";

function readNumber(key: string): number {
  const v = Number(localStorage.getItem(key) ?? 0);
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}

function readBank(): GemBank {
  try {
    const raw = localStorage.getItem(BANK_KEY);
    if (!raw) return { ...EMPTY_BANK };
    const parsed = JSON.parse(raw) as Partial<Record<GemKind, unknown>>;
    const num = (v: unknown): number =>
      typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0;
    return {
      pale: num(parsed.pale),
      cracked: num(parsed.cracked),
      ember: num(parsed.ember),
      heart: num(parsed.heart),
    };
  } catch {
    return { ...EMPTY_BANK };
  }
}

function readStats(): DiveStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { runs: 0, bestDepth: 0, bestCombo: 0 };
    const parsed = JSON.parse(raw) as Partial<DiveStats>;
    const num = (v: unknown): number =>
      typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0;
    return {
      runs: num(parsed.runs),
      bestDepth: num(parsed.bestDepth),
      bestCombo: num(parsed.bestCombo),
    };
  } catch {
    return { runs: 0, bestDepth: 0, bestCombo: 0 };
  }
}

export function loadProgress(): ProgressSnapshot {
  return {
    bank: readBank(),
    stats: readStats(),
    total: readNumber(TOTAL_KEY),
    best: readNumber(BEST_KEY),
  };
}

export type Mission = {
  id: string;
  title: string;
  desc: string;
  target: number;
  progress: (p: ProgressSnapshot) => number;
};

export const MISSIONS: Mission[] = [
  {
    id: "first-haul",
    title: "FIRST HAUL",
    desc: "Bank 25 Kryn gems.",
    target: 25,
    progress: (p) => p.total,
  },
  {
    id: "deep-delver",
    title: "DEEP DELVER",
    desc: "Reach 1,800 m in one dive — the HEART layer.",
    target: 1800,
    progress: (p) => p.stats.bestDepth,
  },
  {
    id: "heart-hunter",
    title: "HEART HUNTER",
    desc: "Bank 10 Heart Kryn.",
    target: 10,
    progress: (p) => p.bank.heart,
  },
  {
    id: "combo-master",
    title: "COMBO MASTER",
    desc: "Chain a ×6 combo in one dive.",
    target: 6,
    progress: (p) => p.stats.bestCombo,
  },
  {
    id: "century-club",
    title: "CENTURY CLUB",
    desc: "Score 500+ in a single dive.",
    target: 500,
    progress: (p) => p.best,
  },
];

export function missionProgress(m: Mission, p: ProgressSnapshot): number {
  return Math.min(m.target, Math.max(0, m.progress(p)));
}

export function recordRun(result: RunResult): {
  snapshot: ProgressSnapshot;
  newlyCompleted: string[];
} {
  const before = loadProgress();
  const bank: GemBank = {
    pale: before.bank.pale + result.counts.pale,
    cracked: before.bank.cracked + result.counts.cracked,
    ember: before.bank.ember + result.counts.ember,
    heart: before.bank.heart + result.counts.heart,
  };
  const stats: DiveStats = {
    runs: before.stats.runs + 1,
    bestDepth: Math.max(before.stats.bestDepth, result.depth),
    bestCombo: Math.max(before.stats.bestCombo, result.maxCombo),
  };
  const total = before.total + result.gems;
  const best = Math.max(before.best, result.score);
  try {
    localStorage.setItem(BANK_KEY, JSON.stringify(bank));
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    localStorage.setItem(TOTAL_KEY, String(total));
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Private mode / full storage: the dive still counts for this session.
  }
  const snapshot: ProgressSnapshot = { bank, stats, total, best };
  const newlyCompleted = MISSIONS.filter(
    (m) => m.progress(before) < m.target && m.progress(snapshot) >= m.target,
  ).map((m) => m.id);
  return { snapshot, newlyCompleted };
}

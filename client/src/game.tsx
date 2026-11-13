// Deep Dive — the Kryntar dive game.
//
// 60 seconds, 3 oxygen. The diver sinks on its own; the player steers left
// and right (drag, arrow keys / A-D, or hold buttons). Gems rise past the
// diver and are worth more the deeper the layer: Surface ×1, Fracture ×2,
// Core ×3, Heart ×5. Rocks fall, jellyfish drift and sting — both cost
// 1 oxygen. Air bubbles give oxygen back. No prize pool.
//
// Play access is enforced by the parent through `access`: starting a dive
// asks the server (`onStartRequest`) to spend one of today's plays —
// legendary holders unlimited, free holders 3/day, guests 1 practice
// play/day (guests cannot submit scores). The Game Over panel offers a
// Post to X share once the run has been submitted to the leaderboard.

import {
useCallback,
useEffect,
useRef,
useState,
type CSSProperties,
type PointerEvent as ReactPointerEvent,
} from "react";

export type GemKind = "pale" | "cracked" | "ember" | "heart";

export type RunResult = {
  score: number;
  gems: number;
  depth: number;
  counts: Record<GemKind, number>;
};

const W = 720;
const H = 600;
const RUN_SECONDS = 60;
const DIVER_Y = 240;
const PX = 4;
const MAX_OXYGEN = 3;

type ItemKind = GemKind | "air" | "rock" | "jelly";
type Item = {
  x: number;
  y: number;
  vy: number;
  kind: ItemKind;
  sway: number;
  drift: number;
};
type Popup = { x: number; y: number; text: string; color: string; t: number };
type Phase = "idle" | "running" | "paused" | "over";

/** Depth layer + score multiplier for a given depth in metres. */
function layerOf(depth: number): { name: string; mult: number; idx: number } {
  if (depth < 300) return { name: "SURFACE", mult: 1, idx: 0 };
  if (depth < 900) return { name: "FRACTURE", mult: 2, idx: 1 };
  if (depth < 1800) return { name: "CORE", mult: 3, idx: 2 };
  return { name: "HEART", mult: 5, idx: 3 };
}

const GEM_POINTS: Record<GemKind, number> = { pale: 10, cracked: 20, ember: 30, heart: 50 };

/** What rises (or falls) past the diver depends on the layer: cheap gems
 *  near the top, Heart Kryn only in the deep layers. */
function pickKind(depth: number): ItemKind {
  const layer = layerOf(depth).idx;
  const roll = Math.random();
  if (layer === 0) {
    if (roll < 0.52) return "pale";
    if (roll < 0.72) return "cracked";
    if (roll < 0.79) return "ember";
    if (roll < 0.9) return "air";
    return "rock";
  }
  if (layer === 1) {
    if (roll < 0.34) return "pale";
    if (roll < 0.62) return "cracked";
    if (roll < 0.78) return "ember";
    if (roll < 0.89) return "air";
    return "rock";
  }
  if (layer === 2) {
    if (roll < 0.2) return "pale";
    if (roll < 0.44) return "cracked";
    if (roll < 0.68) return "ember";
    if (roll < 0.78) return "heart";
    if (roll < 0.88) return "air";
    return "rock";
  }
  if (roll < 0.12) return "pale";
  if (roll < 0.3) return "cracked";
  if (roll < 0.54) return "ember";
  if (roll < 0.76) return "heart";
  if (roll < 0.86) return "air";
  return "rock";
}

/* ------------------------- pixel sprite maps ----------------------------- */
/* Drawn as plain squares with smoothing off — nothing is ever blurred.    */

const DIVER_BODY = [
  "......HHHHHH......",
  "....HHHHHHHHHH....",
  "...HHhhhhhhhhHH...",
  "..HHhVVVVVVVVhHH..",
  "..HhVWWVVVVWWVhH..",
  "..HhVVVVVVVVVVhH..",
  "...HHhVVVVVVhHH...",
  "....HHHHHHHHHH....",
  ".....TTTTTTTT.....",
  "..AAAA.BBBB.AAAA..",
  ".AAAAA.BBBB.AAAAA.",
  ".AAAA...BB...AAAA.",
  "..LLL...BB...LLL..",
  "..LLL........LLL..",
  "...LL........LL...",
  "...LL........LL...",
];
const DIVER_FINS_A = [
  "..FF..........FF..",
  ".FFFF........FFFF.",
  "FFFF..........FFFF",
];
const DIVER_FINS_B = [
  "...FF........FF...",
  "....FF......FF....",
  ".....FFFF.FFFF....",
];
const DIVER_PALETTE: Record<string, string> = {
  H: "#C97B2D",
  h: "#8A4B16",
  V: "#FF8A3D",
  W: "#FFE9C9",
  T: "#B9B2A4",
  A: "#8A867E",
  B: "#6E6A60",
  L: "#55534C",
  F: "#C97B2D",
};

const GEM_MAP = [
  "....X....",
  "...XXX...",
  "..XXWXX..",
  ".XXXXXXX.",
  "XXWXXXDXX",
  ".XXXXXXX.",
  "..XXXXX..",
  "...XXX...",
  "....X....",
  "....D....",
];
const GEM_PALETTES: Record<GemKind, Record<string, string>> = {
  pale: { X: "#D8D2C4", W: "#FFFFFF", D: "#8A867E" },
  cracked: { X: "#9B968B", W: "#E8E3D8", D: "#55534C" },
  ember: { X: "#FF8A3D", W: "#FFE1B8", D: "#C97B2D" },
  heart: { X: "#FFC46B", W: "#FFF3D6", D: "#E09A2B" },
};
const GEM_LABELS: Record<GemKind, string> = {
  pale: "Pale Kryn",
  cracked: "Cracked Kryn",
  ember: "Ember Kryn",
  heart: "Heart Kryn",
};
const GEM_COLORS: Record<GemKind, string> = {
  pale: "#D8D2C4",
  cracked: "#9B968B",
  ember: "#FF8A3D",
  heart: "#FFC46B",
};

const ROCK_MAP = [
  "...XXXXX...",
  ".XXXXXXXXX.",
  "XXXXXXXXXXX",
  "XXDXXXXXXXX",
  "XXXXXXXXXXX",
  ".XXXXXXXXX.",
  "..XXXXXXX..",
  "...XXXXX...",
];
const ROCK_PALETTE: Record<string, string> = { X: "#3A372F", D: "#55534C" };

const JELLY_MAP = [
  ".....JJJJ.....",
  "...JJJJJJJJ...",
  "..JJJJJJJJJJ..",
  ".JJJJEEEEJJJJ.",
  ".JJJJJJJJJJJJ.",
  "..JJJJJJJJJJ..",
];
const JELLY_TENTACLES_A = ["..J..J..J..J..", "..J..J..J..J.."];
const JELLY_TENTACLES_B = [".J....J....J..", ".J....J....J.."];
const JELLY_PALETTE: Record<string, string> = { J: "#B98AE0", E: "#FFE1B8" };

const BUBBLE_MAP = [".XXXXX.", "XW....X", "X.....X", "X.....X", "X.....X", ".XXXXX."];
const BUBBLE_PALETTE: Record<string, string> = { X: "#B9B2A4", W: "#FFFFFF" };

function drawMap(
  ctx: CanvasRenderingContext2D,
  map: string[],
  palette: Record<string, string>,
  cx: number,
  cy: number,
  px: number,
) {
  const w = (map[0]?.length ?? 0) * px;
  const h = map.length * px;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  for (let r = 0; r < map.length; r++) {
    const row = map[r] ?? "";
    for (let c = 0; c < row.length; c++) {
      const color = palette[row[c] ?? ""];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x0 + c * px, y0 + r * px, px, px);
    }
  }
}

/* --------------------------------- game ---------------------------------- */

export type PlayAccess = {
  /** Plays left today; null = unlimited (legendary holders). */
  playsLeft: number | null;
  /** Daily quota; null = unlimited. */
  playsLimit: number | null;
  /** Whether this player may submit scores (holders only, not guests). */
  canSubmit: boolean;
  /** ISO instant of the next 00:00 UTC quota reset. */
  resetsAt: string;
};

export type StartVerdict = { allowed: boolean; access: PlayAccess | null };

export function DeepDive({
  onFinish,
  access,
  accessLoading,
  onStartRequest,
  submittedRank,
}: {
  onFinish: (result: RunResult) => void;
  /** Today's server-counted play access for the current player identity. */
  access: PlayAccess | null;
  accessLoading: boolean;
  /** Called when Start is pressed: asks the server to spend one play.
   *  Starting is blocked unless it resolves with allowed = true. */
  onStartRequest: () => Promise<StartVerdict>;
  /** Leaderboard rank of the just-submitted run, once the player saved
   *  it — unlocks the Post to X button in the Game Over panel. */
  submittedRank: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [hud, setHud] = useState({
    score: 0,
    time: RUN_SECONDS,
    oxygen: MAX_OXYGEN,
    depth: 0,
    mult: 1,
    layer: "SURFACE",
    gems: 0,
    combo: 0,
  });
  const [finalRun, setFinalRun] = useState<RunResult | null>(null);
  const [startBlocked, setStartBlocked] = useState<string | null>(null);
  const [startPending, setStartPending] = useState(false);
  const [best, setBest] = useState<number>(() => {
    const v = Number(localStorage.getItem("kryntar-dive-best") ?? 0);
    return Number.isFinite(v) ? v : 0;
  });

  const g = useRef({
    diverX: W / 2,
    velX: 0,
    targetX: null as number | null,
    keys: { left: false, right: false },
    items: [] as Item[],
    popups: [] as Popup[],
    bubbles: [] as { x: number; y: number; v: number; r: number }[],
    bubbleIn: 1.2,
    motes: Array.from({ length: 44 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      v: 10 + Math.random() * 22,
    })),
    gemPoints: 0,
    gems: 0,
    counts: { pale: 0, cracked: 0, ember: 0, heart: 0 } as Record<GemKind, number>,
    oxygen: MAX_OXYGEN,
    depth: 0,
    elapsed: 0,
    spawnIn: 0,
    hazIn: 2.5,
    flash: 0,
    shake: 0,
    invuln: 0,
    combo: 0,
    comboT: 0,
    layerIdx: 0,
    layerFlashT: 0,
    finT: 0,
    last: 0,
  });
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;
  const finishedRef = useRef(false);

  const totalScore = useCallback(() => {
    const s = g.current;
    return s.gemPoints + Math.floor(s.depth / 10);
  }, []);

  const syncHud = useCallback(() => {
    const s = g.current;
    const layer = layerOf(s.depth);
    setHud({
      score: totalScore(),
      time: Math.max(0, Math.ceil(RUN_SECONDS - s.elapsed)),
      oxygen: Math.max(0, s.oxygen),
      depth: Math.floor(s.depth),
      mult: layer.mult,
      layer: layer.name,
      gems: s.gems,
      combo: s.combo,
    });
  }, [totalScore]);

  const endRun = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const s = g.current;
    const result: RunResult = {
      score: totalScore(),
      gems: s.gems,
      depth: Math.floor(s.depth),
      counts: { ...s.counts },
    };
    setPhase("over");
    setFinalRun(result);
    syncHud();
    setBest((prev) => {
      const next = Math.max(prev, result.score);
      localStorage.setItem("kryntar-dive-best", String(next));
      return next;
    });
    onFinish(result);
  }, [onFinish, syncHud, totalScore]);

  const startRun = useCallback(() => {
    const s = g.current;
    s.items = [];
    s.popups = [];
    s.bubbles = [];
    s.bubbleIn = 1.2;
    s.gemPoints = 0;
    s.gems = 0;
    s.counts = { pale: 0, cracked: 0, ember: 0, heart: 0 };
    s.oxygen = MAX_OXYGEN;
    s.depth = 0;
    s.elapsed = 0;
    s.spawnIn = 0;
    s.hazIn = 2.5;
    s.flash = 0;
    s.shake = 0;
    s.invuln = 0;
    s.combo = 0;
    s.comboT = 0;
    s.layerIdx = 0;
    s.layerFlashT = 0;
    s.diverX = W / 2;
    s.velX = 0;
    s.targetX = null;
    finishedRef.current = false;
    setFinalRun(null);
    setStartBlocked(null);
    setPhase("running");
    syncHud();
  }, [syncHud]);

  /** Start is gated by the server-side daily quota: the parent asks the
   *  server to spend one play, and the dive only begins when allowed. */
  const handleStart = useCallback(async () => {
    if (phaseRef.current === "running" || phaseRef.current === "paused") {
      startRun();
      return;
    }
    if (startPending) return;
    setStartPending(true);
    try {
      const verdict = await onStartRequest();
      if (!verdict.allowed) {
        if (!verdict.access) {
          setStartBlocked(
            "Type your diver name in the access panel above first — your daily plays are counted under your name on the server.",
          );
          return;
        }
        const reset = new Date(verdict.access.resetsAt)
          .toISOString()
          .slice(11, 16);
        setStartBlocked(
          `No plays left today. Your dives reset at ${reset} UTC — or switch to a holder tier in the access panel above.`,
        );
        return;
      }
      startRun();
    } catch {
      setStartBlocked(
        "Could not check your plays with the server. Try again in a moment.",
      );
    } finally {
      setStartPending(false);
    }
  }, [onStartRequest, startPending, startRun]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const s = g.current;
      const dt = Math.min(0.05, s.last ? (t - s.last) / 1000 : 0);
      s.last = t;
      const running = phaseRef.current === "running";
      const layer = layerOf(s.depth);

      ctx.save();
      if (s.shake > 0.02) {
        ctx.translate((Math.random() - 0.5) * s.shake * 9, (Math.random() - 0.5) * s.shake * 9);
      }

      // water — flat dark, deeper layers darker still
      const base = ["#0C0E0F", "#0A0B0D", "#080809", "#050506"][layer.idx] ?? "#0C0E0F";
      ctx.fillStyle = base;
      ctx.fillRect(-12, -12, W + 24, H + 24);
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.38)");
      ctx.fillStyle = grad;
      ctx.fillRect(-12, -12, W + 24, H + 24);
      if (layer.idx >= 2) {
        ctx.fillStyle = `rgba(255,138,61,${layer.idx === 3 ? 0.07 : 0.04})`;
        ctx.fillRect(-12, -12, W + 24, H + 24);
      }

      // strata lines + depth ruler on the right
      const spacing = 120;
      const offset = s.depth > 0 ? (s.depth * 0.55) % spacing : 0;
      ctx.font = "12px 'Space Mono', monospace";
      ctx.textAlign = "right";
      for (let y = -spacing + offset; y < H + spacing; y += spacing) {
        ctx.fillStyle = "rgba(232,227,216,0.10)";
        ctx.fillRect(0, y, W, 3);
        const metres = Math.max(0, Math.round(s.depth + (DIVER_Y - y) * 1.6));
        ctx.fillStyle = "rgba(232,227,216,0.45)";
        ctx.fillText(`${String(metres).padStart(4, "0")} M`, W - 52, y - 7);
      }
      ctx.fillStyle = "rgba(232,227,216,0.3)";
      ctx.fillRect(W - 36, 0, 3, H);
      for (let y = 10; y < H; y += 30) ctx.fillRect(W - 36, y, 11, 3);
      ctx.fillStyle = "#FF8A3D";
      ctx.fillRect(W - 42, DIVER_Y - 4, 16, 7);

      // square dust motes drifting up
      ctx.fillStyle = "rgba(232,227,216,0.3)";
      for (const m of s.motes) {
        m.y -= m.v * dt * (running ? 1.6 : 0.4);
        if (m.y < -6) {
          m.y = H + 6;
          m.x = Math.random() * (W - 56);
        }
        ctx.fillRect(m.x, m.y, 3, 3);
      }

      if (running) {
        s.elapsed += dt;
        s.depth += dt * (26 + s.elapsed * 0.5);
        const nowLayer = layerOf(s.depth);
        if (nowLayer.idx !== s.layerIdx) {
          s.layerIdx = nowLayer.idx;
          s.layerFlashT = 1.5;
        }
        // oxygen drains with time, faster in the deep layers
        s.oxygen -= dt * (0.015 + nowLayer.idx * 0.0035);
        if (s.invuln > 0) s.invuln -= dt;
        if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 2.4);
        if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 3.2);
        if (s.layerFlashT > 0) s.layerFlashT -= dt;
        if (s.comboT > 0) {
          s.comboT -= dt;
          if (s.comboT <= 0) s.combo = 0;
        }
        s.finT += dt;

        // steering — velocity with acceleration and drag; a pointer target
        // pulls smoothly, keys take over the moment they are pressed
        const ACCEL = 2600;
        const MAXV = 480;
        if (s.keys.left || s.keys.right) {
          s.targetX = null;
          if (s.keys.left) s.velX -= ACCEL * dt;
          if (s.keys.right) s.velX += ACCEL * dt;
        } else if (s.targetX !== null) {
          const diff = s.targetX - s.diverX;
          s.velX = Math.max(-MAXV, Math.min(MAXV, diff * 13));
          if (Math.abs(diff) < 2) s.velX = 0;
        } else {
          s.velX -= s.velX * Math.min(1, dt * 9);
          if (Math.abs(s.velX) < 4) s.velX = 0;
        }
        s.velX = Math.max(-MAXV, Math.min(MAXV, s.velX));
        s.diverX += s.velX * dt;
        if (s.diverX < 44) {
          s.diverX = 44;
          s.velX = 0;
        }
        if (s.diverX > W - 98) {
          s.diverX = W - 98;
          s.velX = 0;
        }

        // helmet bubbles trail up from the diver
        s.bubbleIn -= dt;
        if (s.bubbleIn <= 0) {
          s.bubbleIn = 0.5 + Math.random() * 0.7;
          s.bubbles.push({
            x: s.diverX + 18 + Math.random() * 10,
            y: DIVER_Y - 40,
            v: 62 + Math.random() * 38,
            r: 3 + Math.random() * 3,
          });
        }
        s.bubbles = s.bubbles.filter((b) => {
          b.y -= b.v * dt;
          b.x += Math.sin(t / 300 + b.y / 22) * 9 * dt;
          return b.y > -8;
        });

        // spawns — gems & air rise from below, rocks fall, jellyfish drift
        s.spawnIn -= dt;
        if (s.spawnIn <= 0) {
          s.spawnIn = 0.42 + Math.random() * 0.3;
          const kind = pickKind(s.depth);
          const rise = 185 + Math.random() * 85 + s.elapsed * 2.6 + nowLayer.idx * 13;
          s.items.push({
            x: 36 + Math.random() * (W - 120),
            y: kind === "rock" ? -36 : H + 36,
            vy: kind === "rock" ? 285 + Math.random() * 115 : -rise,
            kind,
            sway: Math.random() * Math.PI * 2,
            drift: 0,
          });
        }
        s.hazIn -= dt;
        if (s.hazIn <= 0) {
          s.hazIn = 2.6 + Math.random() * 1.6;
          s.items.push({
            x: 44 + Math.random() * (W - 130),
            y: H + 48,
            vy: -(108 + Math.random() * 48),
            kind: "jelly",
            sway: Math.random() * Math.PI * 2,
            drift: 46 + Math.random() * 40,
          });
        }

        const mult = nowLayer.mult;
        s.items = s.items.filter((it) => {
          it.y += it.vy * dt;
          if (it.kind === "jelly") {
            it.x += Math.sin(t / 620 + it.sway) * it.drift * dt;
          } else if (it.kind !== "rock") {
            it.x += Math.sin(t / 320 + it.sway) * 24 * dt;
          }
          if (it.y < -58 || it.y > H + 64) return false;
          const dx = Math.abs(it.x - s.diverX);
          const dy = Math.abs(it.y - DIVER_Y);
          const hit =
            it.kind === "jelly"
              ? dx < 52 && dy < 48
              : it.kind === "rock"
                ? dx < 46 && dy < 42
                : dx < 48 && dy < 44;
          if (!hit) return true;

          if (it.kind === "rock" || it.kind === "jelly") {
            if (s.invuln <= 0) {
              s.oxygen -= 1;
              if (it.kind === "rock") s.gemPoints = Math.max(0, s.gemPoints - 15);
              s.flash = 1;
              s.shake = 1;
              s.invuln = 1.2;
              s.combo = 0;
              s.comboT = 0;
              s.popups.push({
                x: s.diverX,
                y: DIVER_Y - 64,
                text: it.kind === "rock" ? "ROCK HIT! −1 O₂" : "STUNG! −1 O₂",
                color: "#FF7A6B",
                t: 0,
              });
              syncHud();
            }
            return it.kind === "jelly" ? false : s.invuln > 0.2;
          }
          if (it.kind === "air") {
            s.oxygen = Math.min(MAX_OXYGEN, s.oxygen + 0.5);
            s.popups.push({ x: it.x, y: it.y - 28, text: "+0.5 O₂", color: "#B9B2A4", t: 0 });
            syncHud();
            return false;
          }
          const kind = it.kind as GemKind;
          const pts = GEM_POINTS[kind] * mult;
          s.gemPoints += pts;
          s.gems += 1;
          s.counts[kind] += 1;
          s.combo += 1;
          s.comboT = 2.2;
          if (s.combo > 0 && s.combo % 3 === 0) {
            s.gemPoints += 5;
            s.popups.push({
              x: s.diverX,
              y: DIVER_Y - 84,
              text: `COMBO ×${s.combo} +5`,
              color: "#FFC46B",
              t: 0,
            });
          }
          s.popups.push({
            x: it.x,
            y: it.y - 28,
            text: `+${pts}`,
            color: GEM_COLORS[kind],
            t: 0,
          });
          syncHud();
          return false;
        });

        s.popups = s.popups.filter((p) => {
          p.t += dt;
          p.y -= 56 * dt;
          return p.t < 0.95;
        });

        if (s.oxygen <= 0 || s.elapsed >= RUN_SECONDS) {
          s.oxygen = Math.max(0, s.oxygen);
          endRun();
        } else if (Math.floor(s.elapsed * 10) !== Math.floor((s.elapsed - dt) * 10)) {
          syncHud();
        }
      }

      // items
      for (const it of s.items) {
        const bob = Math.sin(t / 340 + it.sway) * 3;
        if (it.kind === "rock") {
          drawMap(ctx, ROCK_MAP, ROCK_PALETTE, it.x, it.y, PX);
        } else if (it.kind === "jelly") {
          const tent = Math.floor(t / 380 + it.sway) % 2 === 0 ? JELLY_TENTACLES_A : JELLY_TENTACLES_B;
          ctx.fillStyle = "rgba(185,138,224,0.13)";
          ctx.fillRect(it.x - 34, it.y - 26 + bob, 68, 70);
          drawMap(ctx, JELLY_MAP, JELLY_PALETTE, it.x, it.y - 8 + bob, PX);
          drawMap(ctx, tent, JELLY_PALETTE, it.x, it.y + 22 + bob, PX);
        } else if (it.kind === "air") {
          drawMap(ctx, BUBBLE_MAP, BUBBLE_PALETTE, it.x - 12, it.y + bob, 3);
          drawMap(ctx, BUBBLE_MAP, BUBBLE_PALETTE, it.x + 13, it.y + 10 + bob, 4);
        } else {
          const palette = GEM_PALETTES[it.kind as GemKind];
          drawMap(ctx, GEM_MAP, palette, it.x, it.y + bob, it.kind === "heart" ? 5 : PX);
          if (it.kind === "cracked") {
            ctx.fillStyle = "#2A2721";
            ctx.fillRect(it.x - 3, it.y - 8 + bob, 4, 4);
            ctx.fillRect(it.x - 6, it.y + bob, 4, 4);
            ctx.fillRect(it.x - 2, it.y + 7 + bob, 4, 4);
          }
        }
      }

      // helmet bubbles
      ctx.fillStyle = "rgba(232,227,216,0.55)";
      for (const b of s.bubbles) ctx.fillRect(b.x, b.y, b.r, b.r);

      // diver — chibi helmet, glowing visor, kicking fins (blinks after a hit)
      const blink = s.invuln > 0 && Math.floor(t / 110) % 2 === 0;
      if (!blink) {
        const bobY = Math.sin(t / 360) * 3;
        ctx.fillStyle = "rgba(255,138,61,0.07)";
        ctx.fillRect(s.diverX - 42, DIVER_Y - 44 + bobY, 84, 92);
        const fins = Math.floor(s.finT * 5) % 2 === 0 ? DIVER_FINS_A : DIVER_FINS_B;
        drawMap(ctx, DIVER_BODY, DIVER_PALETTE, s.diverX, DIVER_Y - 6 + bobY, PX);
        drawMap(ctx, fins, DIVER_PALETTE, s.diverX, DIVER_Y + 38 + bobY, PX);
      }

      // floating score popups
      for (const p of s.popups) {
        ctx.globalAlpha = Math.max(0, 1 - p.t / 0.95);
        ctx.font = "bold 15px 'Space Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
        ctx.globalAlpha = 1;
      }

      // layer change banner
      if (s.layerFlashT > 0) {
        const alpha = Math.min(1, s.layerFlashT / 0.7);
        ctx.globalAlpha = alpha;
        ctx.textAlign = "center";
        ctx.fillStyle = "#FF8A3D";
        ctx.font = "17px 'Press Start 2P', monospace";
        ctx.fillText(`— ${layer.name} —`, W / 2, 76);
        ctx.font = "13px 'Space Mono', monospace";
        ctx.fillStyle = "#E8E3D8";
        ctx.fillText(`EVERY GEM ×${layer.mult} HERE`, W / 2, 104);
        ctx.globalAlpha = 1;
      }

      if (s.flash > 0) {
        ctx.fillStyle = `rgba(255,70,70,${(s.flash * 0.17).toFixed(3)})`;
        ctx.fillRect(-12, -12, W + 24, H + 24);
      }
      ctx.restore();

      const overlay = (title: string, sub: string) => {
        ctx.fillStyle = "rgba(5,5,6,0.72)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#E8E3D8";
        ctx.font = "22px 'Press Start 2P', monospace";
        ctx.fillText(title, W / 2, H / 2 - 12);
        ctx.font = "13px 'Space Mono', monospace";
        ctx.fillStyle = "#9B968B";
        ctx.fillText(sub, W / 2, H / 2 + 28);
      };
      if (phaseRef.current === "idle") {
        overlay("DIVE DEEP!", "DRAG OR ← → TO MOVE · 60 SECONDS · 3 OXYGEN");
      }
      if (phaseRef.current === "paused") {
        overlay("PAUSED", "PRESS RESUME TO KEEP DIVING");
      }
      if (phaseRef.current === "over") {
        overlay("DIVE OVER", "YOUR HAUL IS BELOW — SAVE IT UNDER YOUR NAME");
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [endRun, syncHud]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        g.current.keys.left = true;
        if (phaseRef.current === "running") e.preventDefault();
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        g.current.keys.right = true;
        if (phaseRef.current === "running") e.preventDefault();
      }
      if (e.key === " ") {
        e.preventDefault();
        if (phaseRef.current === "running") setPhase("paused");
        else if (phaseRef.current === "paused") setPhase("running");
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") g.current.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") g.current.keys.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const pointTo = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    g.current.targetX = ((e.clientX - rect.left) / rect.width) * W;
  };

  const hold = (dir: "left" | "right", on: boolean) => {
    g.current.keys[dir] = on;
  };

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 font-mono sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["SCORE", String(hud.score)],
          ["DEPTH", `${hud.depth} M`],
          ["LAYER", `${hud.layer} ×${hud.mult}`],
          ["TIME", `${hud.time}S`],
          ["GEMS", String(hud.gems)],
          ["COMBO", hud.combo >= 2 ? `×${hud.combo}` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="chunk-sm bg-[#0B0B0C] px-3 py-2.5" style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}>
            <span className="block text-[11px] tracking-[0.2em] text-[var(--dim)]">{k}</span>
            <span className="mt-0.5 block text-lg font-bold text-[var(--text)]">{v}</span>
          </div>
        ))}
        <div
          className="chunk-sm bg-[#0B0B0C] px-3 py-2.5"
          style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
          aria-label={`Oxygen left ${hud.oxygen.toFixed(1)} of 3`}
        >
          <span className="block text-[11px] tracking-[0.2em] text-[var(--dim)]">OXYGEN</span>
          <span className="mt-2.5 flex gap-1">
            {[0, 1, 2].map((i) => {
              const fill = Math.max(0, Math.min(1, hud.oxygen - i)) * 100;
              return (
                <span key={i} className="h-3.5 flex-1 bg-[#262019]">
                  <span className="block h-full bg-[#E8E3D8]" style={{ width: `${fill}%` }} />
                </span>
              );
            })}
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        aria-label="Deep Dive game arena"
        className="pixelated block h-auto w-full touch-none border-[3px] border-black"
        onPointerMove={pointTo}
        onPointerDown={pointTo}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={
            (phase === "idle" || phase === "over") &&
            (startPending ||
              accessLoading ||
              (access !== null && access.playsLeft === 0))
          }
          className="chunk-sm bg-[#E8E3D8] px-6 py-3 font-mono text-sm font-bold uppercase tracking-[0.15em] text-[#070708] transition-transform active:translate-y-0.5 disabled:opacity-40"
          style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}
        >
          {startPending
            ? "Checking plays…"
            : phase === "over" || phase === "idle"
              ? "Start dive"
              : "Restart dive"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (phase === "running") setPhase("paused");
            else if (phase === "paused") setPhase("running");
          }}
          disabled={phase !== "running" && phase !== "paused"}
          className="chunk-sm bg-transparent px-6 py-3 font-mono text-sm font-bold uppercase tracking-[0.15em] text-[var(--text)] disabled:opacity-40"
          style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
        >
          {phase === "paused" ? "Resume" : "Pause"}
        </button>
        <div className="ml-auto flex gap-2 sm:hidden">
          <button
            type="button"
            aria-label="Move left"
            className="chunk-sm px-7 py-3.5 text-2xl text-[var(--text)]"
            style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
            onPointerDown={() => hold("left", true)}
            onPointerUp={() => hold("left", false)}
            onPointerLeave={() => hold("left", false)}
            onPointerCancel={() => hold("left", false)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Move right"
            className="chunk-sm px-7 py-3.5 text-2xl text-[var(--text)]"
            style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
            onPointerDown={() => hold("right", true)}
            onPointerUp={() => hold("right", false)}
            onPointerLeave={() => hold("right", false)}
            onPointerCancel={() => hold("right", false)}
          >
            →
          </button>
        </div>
      </div>

      {(phase === "idle" || phase === "over") &&
        (accessLoading ? (
          <p className="mt-3 font-mono text-xs text-[var(--dim)]" role="status">
            Checking today's plays with the server…
          </p>
        ) : access ? (
          <p className="mt-3 font-mono text-xs text-[var(--dim)]" role="status">
            {access.playsLeft === null ? (
              <>
                <span className="font-bold text-[#FFC46B]">Unlimited plays</span>{" "}
                — legendary holders dive as much as they want.
              </>
            ) : (
              <>
                Plays left today:{" "}
                <span className="font-bold text-[var(--text)]">
                  {access.playsLeft}/{access.playsLimit ?? 0}
                </span>{" "}
                · resets 00:00 UTC
              </>
            )}
            {!access.canSubmit &&
              " · Guest scores are practice only — they cannot be submitted to the leaderboard."}
          </p>
        ) : (
          <p className="mt-3 font-mono text-xs text-[var(--dim)]" role="status">
            Set your diver name and tier in the access panel above — plays
            are counted on the server, per name, per day.
          </p>
        ))}
      {startBlocked && (
        <p className="mt-3 font-mono text-xs font-bold text-[#FF8A3D]" role="alert">
          {startBlocked}
        </p>
      )}

      {phase === "over" && finalRun && (
        <div
          className="chunk-sm mt-6 bg-[#0B0B0C] p-4 sm:p-5"
          style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}
          role="status"
        >
          <h3 className="pixel-h text-xs sm:text-sm">DIVE OVER — YOUR HAUL</h3>
          <div className="mt-4 grid grid-cols-3 gap-4 font-mono">
            <div>
              <span className="block text-[11px] tracking-[0.2em] text-[var(--dim)]">DEPTH REACHED</span>
              <span className="mt-1 block text-2xl font-bold">{finalRun.depth} M</span>
            </div>
            <div>
              <span className="block text-[11px] tracking-[0.2em] text-[var(--dim)]">TOTAL SCORE</span>
              <span className="mt-1 block text-2xl font-bold text-[#FF8A3D]">{finalRun.score}</span>
            </div>
            <div>
              <span className="block text-[11px] tracking-[0.2em] text-[var(--dim)]">BEST SCORE</span>
              <span className="mt-1 block text-2xl font-bold">{best}</span>
            </div>
          </div>
          <ul className="mt-4 grid gap-2 border-t-2 border-[#201E1A] pt-4 font-mono text-sm sm:grid-cols-2">
            {(Object.keys(GEM_LABELS) as GemKind[]).map((k) => (
              <li key={k} className="flex items-center justify-between gap-4">
                <span>
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5"
                    style={{ background: GEM_COLORS[k] }}
                    aria-hidden="true"
                  />
                  {GEM_LABELS[k]}
                </span>
                <span className="font-bold">× {finalRun.counts[k]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-[var(--dim)]">
            Total gems brought up:{" "}
            <strong className="text-[var(--text)]">{finalRun.gems}</strong>.{" "}
            {access?.canSubmit
              ? "Submit the dive below and it lands on the leaderboard and in My Gems."
              : "Guest dives are practice only — scores from guests cannot be submitted to the leaderboard."}
          </p>
          {submittedRank !== null && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t-2 border-[#201E1A] pt-4">
              <p className="font-mono text-xs">
                On the leaderboard:{" "}
                <span className="font-bold text-[#FFC46B]">#{submittedRank}</span>
              </p>
              <a
                href={`https://x.com/intent/post?text=${encodeURIComponent(
                  `I scored ${finalRun.score} in Kryntar DEEP DIVE — ${finalRun.depth} m deep, ${finalRun.gems} Kryn gems hauled up. Rank #${submittedRank} on the all-time leaderboard. #Kryntar`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="chunk-sm bg-[#E8E3D8] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#070708]"
                style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
              >
                Post to X
              </a>
            </div>
          )}
        </div>
      )}

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[13px] text-[var(--dim)]">
        <li><span className="mr-1.5 inline-block h-3 w-3 bg-[#D8D2C4]" />Pale Kryn · +10</li>
        <li><span className="mr-1.5 inline-block h-3 w-3 bg-[#9B968B]" />Cracked Kryn · +20</li>
        <li><span className="mr-1.5 inline-block h-3 w-3 bg-[#FF8A3D]" />Ember Kryn · +30</li>
        <li><span className="mr-1.5 inline-block h-3 w-3 bg-[#FFC46B]" />Heart Kryn · +50, deep layers only</li>
        <li><span className="mr-1.5 inline-block h-3 w-3 border-2 border-[#B9B2A4]" />Air · +0.5 oxygen</li>
        <li><span className="mr-1.5 inline-block h-3 w-3 bg-[#3A372F]" />Rock · −1 oxygen, −15 pts</li>
        <li><span className="mr-1.5 inline-block h-3 w-3 bg-[#B98AE0]" />Jellyfish · stings, −1 oxygen</li>
      </ul>
      <p className="mt-2 font-mono text-[13px] text-[var(--dim)]">
        Move: drag on the arena, arrow keys / A D, or the hold buttons · Space: pause &amp; resume · Grab gems in a row for combo bonuses
      </p>
    </div>
  );
}

import {
useEffect,
useRef,
useState,
type CSSProperties, type ReactNode
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaTopScrim } from "@hatch/space-sdk/client";
import { api, type ApiResponse } from "./api";
import {
  DeepDive,
  type PlayAccess,
  type RunResult,
  type StartVerdict,
} from "./game";

import heroImg from "./assets/media-generation-kryntar-hero-gem-0-6c686306-0a8f-4e15-8016-f589684203cf.webp";
import paleImg from "./assets/media-generation-kryntar-gem-pale-0-58facf25-3156-49c3-b7fd-750c502494e8.webp";
import crackedImg from "./assets/media-generation-kryntar-gem-cracked-0-5dde3e58-695d-4fc4-acd9-e7a78d9319da.webp";
import emberImg from "./assets/media-generation-kryntar-gem-ember-0-f0664a2e-8a31-49ab-bcc4-b50784d450b7.webp";
import heartImg from "./assets/media-generation-kryntar-gem-heart-0-0d88661d-b455-4cf1-8e87-32a4d5b3abba.webp";
import crystalImg from "./assets/diver-crystal.webp";
import royalImg from "./assets/diver-royal.webp";
import dragonImg from "./assets/diver-dragon.webp";
import embercrystalImg from "./assets/diver-embercrystal.webp";

/* ------------------------------- gem mark -------------------------------- */

/** Small pixel gem used as the Kryntar mark. Plain squares, no curves. */
function GemMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 22" className={className} aria-hidden="true">
      <rect x="7" y="0" width="4" height="2" fill="#FF8A3D" />
      <rect x="5" y="2" width="8" height="2" fill="#FF8A3D" />
      <rect x="3" y="4" width="12" height="2" fill="#C97B2D" />
      <rect x="1" y="6" width="16" height="2" fill="#C97B2D" />
      <rect x="0" y="8" width="18" height="2" fill="#FF8A3D" />
      <rect x="2" y="10" width="14" height="2" fill="#C97B2D" />
      <rect x="4" y="12" width="10" height="2" fill="#C97B2D" />
      <rect x="6" y="14" width="6" height="2" fill="#8A4B16" />
      <rect x="7" y="16" width="4" height="2" fill="#8A4B16" />
      <rect x="8" y="18" width="2" height="2" fill="#8A4B16" />
      <rect x="8" y="4" width="2" height="2" fill="#FFE1B8" />
      <rect x="6" y="6" width="2" height="2" fill="#FFE1B8" />
    </svg>
  );
}

/* ------------------------------ depth layers ----------------------------- */

const LAYERS = [
  {
    name: "SURFACE",
    band: "0 – 300 m",
    mult: "×1",
    line: "Pale Kryn country. Easy gems, low points. Everyone starts here.",
  },
  {
    name: "FRACTURE",
    band: "300 – 900 m",
    mult: "×2",
    line: "The rock starts to crack. Cracked Kryn shows up, worth double.",
  },
  {
    name: "CORE",
    band: "900 – 1,800 m",
    mult: "×3",
    line: "Hot copper ground. Ember Kryn glows here, and Heart Kryn can appear.",
  },
  {
    name: "HEART",
    band: "1,800 m +",
    mult: "×5",
    line: "The bottom of the world. Every gem is worth five times its face value.",
  },
];

/* --------------------------------- gems ---------------------------------- */

const GEMS = [
  {
    id: "K-01",
    name: "PALE KRYN",
    img: paleImg,
    alt: "Pixel art of a pale bone-white Kryn gem on a black background",
    type: "COMMON",
    found: "0 – 300 m",
    score: "+10 × layer",
    drop: "~45%",
    power: "10 – 99",
    accent: "#E8E3D8",
    line: "Every diver's first find — plain, pale, everywhere near the top.",
  },
  {
    id: "K-02",
    name: "CRACKED KRYN",
    img: crackedImg,
    alt: "Pixel art of a grey Kryn gem with copper light inside its cracks, on a black background",
    type: "UNCOMMON",
    found: "300 – 900 m",
    score: "+20 × layer",
    drop: "~27%",
    power: "100 – 299",
    accent: "#C97B2D",
    line: "Pressure cracked it open and the cracks glow copper. Worth two Pale.",
  },
  {
    id: "K-03",
    name: "EMBER KRYN",
    img: emberImg,
    alt: "Pixel art of a glowing copper-orange Ember Kryn gem on a black background",
    type: "RARE",
    found: "900 – 1,800 m",
    score: "+30 × layer",
    drop: "~18%",
    power: "300 – 699",
    accent: "#FF8A3D",
    line: "Born in the hot core layers — it glows on its own, no lamp needed.",
  },
  {
    id: "K-04",
    name: "HEART KRYN",
    img: heartImg,
    alt: "Pixel art of a bright gold Heart Kryn gem with a white-hot centre, on a black background",
    type: "LEGENDARY",
    found: "900 m +",
    score: "+50 × layer",
    drop: "~10%",
    power: "700 – 999",
    accent: "#FFC46B",
    line: "The rarest thing in Kryntar — it only forms at the very bottom.",
  },
];

const RARITY = [
  { name: "PALE", count: "Common", pct: "~45%", pctNum: 45, color: "#E8E3D8" },
  { name: "CRACKED", count: "Uncommon", pct: "~27%", pctNum: 27, color: "#C97B2D" },
  { name: "EMBER", count: "Rare", pct: "~18%", pctNum: 18, color: "#FF8A3D" },
  { name: "HEART", count: "Legendary", pct: "~10%", pctNum: 10, color: "#FFC46B" },
];

/* --------------------------- diver collection ---------------------------- */

/** Rarity is an official trait of the Kryntar Divers collection (2,222
 *  tokens), together with Max Depth. The contract is live on BNB Chain
 *  — only the 4 Legendary masters are shown below as a design showcase
 *  of the final masters. The other 22 master assets stay in the
 *  project, just not rendered on the page. */
const DIVER_TIERS = [
  { name: "COMMON", count: "1,111", pct: "50%", maxDepth: "300 M", color: "#8A867E", frame: "#8A867E", shadow: "#262019", glow: "" },
  { name: "RARE", count: "667", pct: "30%", maxDepth: "600 M", color: "#FF8A3D", frame: "#C97B2D", shadow: "#3A2410", glow: "0 0 14px rgba(201,123,45,0.35)" },
  { name: "EPIC", count: "333", pct: "15%", maxDepth: "900 M", color: "#9FD8E8", frame: "#9FD8E8", shadow: "#1E343C", glow: "0 0 18px rgba(159,216,232,0.45)" },
  { name: "LEGENDARY", count: "111", pct: "5%", maxDepth: "1,200 M", color: "#FFC46B", frame: "#FFC46B", shadow: "#4A2E08", glow: "0 0 26px rgba(255,138,61,0.6)" },
];

/** Only the 4 Legendary masters are shown on the page — the top tier of
 *  the collection. The other 22 master assets remain in the project but
 *  are not rendered. Dragon Diver was promoted from Epic to Legendary:
 *  its gold-and-red dragon design is the most iconic of the top tier. */
const DIVER_MASTERS = [
  {
    no: "06",
    name: "CRYSTAL DIVER",
    img: crystalImg,
    alt: "Pixel art: a diver crowned with huge glowing blue Kryn crystals, a pink gem in the chest and crystal fins",
    tier: "LEGENDARY",
    line: "Kryn grew straight through his suit. One of only 111 — the deepest diver in Kryntar.",
  },
  {
    no: "14",
    name: "ROYAL GOLD",
    img: royalImg,
    alt: "Pixel art: a diver in a golden helmet topped with a crown, gold armour with a red gem on the chest, a purple cape and gold fins",
    tier: "LEGENDARY",
    line: "A crown on a golden helmet and a gem on his chest. The king of the deep — one of only 111.",
  },
  {
    no: "21",
    name: "DRAGON DIVER",
    img: dragonImg,
    alt: "Pixel art: a diver in a red dragon hood suit with horns, wings, a tail and a big dive mask with a regulator",
    tier: "LEGENDARY",
    line: "A red dragon hood with horns, wings and a tail. One of only 111 — down here, the gems are his hoard.",
  },
  {
    no: "26",
    name: "EMBER CRYSTAL",
    img: embercrystalImg,
    alt: "Pixel art: a diver whose helmet and suit have grown into glowing orange Kryn crystals, with crystal fins and sparks all around",
    tier: "LEGENDARY",
    line: "His whole suit grew into glowing Kryn crystal. One of only 111 — the Heart layer made him.",
  },
];

/* ------------------------- on-chain mint (live) -------------------------- */

/** The one official Kryntar Divers contract on BNB Chain (chainId 56).
 *  Any other address claiming to be Kryntar is fake. */
const CONTRACT_ADDRESS = "0xB77D3495d3ed4427dA78c9D0f7Cb76C21c23D9fe";

/** Public BSC RPC endpoints. Reads race all of them; the first success wins. */
const RPC_URLS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
  "https://bsc-dataseed2.bnbchain.org",
];

/** Function selectors of the Kryntar contract (see contract/Kryntar.sol). */
const SELECTORS = {
  mintFree: "0x8ab53447",
  mintDeep: "0xa0466745",
  mintLegendary: "0x8a03dd7a",
  mintOpen: "0x24bbd049",
  totalMinted: "0xa2309ff8",
  standardMinted: "0x8d97003c",
  legendaryMinted: "0xe9aac102",
  freeCount: "0x958c8848",
  deepCount: "0xed7ab442",
  legendaryCount: "0x211e52c1",
  hasAgentId: "0x4eab3ef2",
};

const STANDARD_POOL_SIZE = 2111;
const LEGENDARY_POOL_SIZE = 111;
const FREE_CAP = 1;
const DEEP_CAP = 5;
const LEGENDARY_CAP = 5;

/** Exact mint values as hex wei: 0.0005 BNB and 0.01 BNB. */
const DEEP_VALUE_HEX = "0x" + BigInt("500000000000000").toString(16);
const LEGENDARY_VALUE_HEX = "0x" + BigInt("10000000000000000").toString(16);

type MintLane = "free" | "deep" | "legendary";

type LaneStatus =
  | { status: "idle" }
  | { status: "pending"; message: string }
  | { status: "error"; message: string }
  | { status: "success"; message: string; txHash: string };

type MintChainStatus = {
  open: boolean;
  total: number;
  standard: number;
  legendary: number;
  updatedAt: string;
};

/** Minimal EIP-1193 provider surface the mint flow uses. */
type EthereumProvider = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getEthereum(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ethereum?: EthereumProvider };
  return w.ethereum ?? null;
}

/** First fulfilled promise wins; rejects only when every promise fails. */
function firstSuccess<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let failed = 0;
    let settled = false;
    promises.forEach((p) => {
      p.then(
        (value) => {
          if (!settled) {
            settled = true;
            resolve(value);
          }
        },
        () => {
          failed += 1;
          if (!settled && failed === promises.length) {
            settled = true;
            reject(new Error("all endpoints failed"));
          }
        },
      );
    });
  });
}

/** Read-only eth_call against the Kryntar contract. Returns the raw hex result. */
async function ethCall(data: string): Promise<string> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [{ to: CONTRACT_ADDRESS, data }, "latest"],
  });
  return firstSuccess(
    RPC_URLS.map(async (url) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      if (!res.ok) throw new Error(`rpc http ${res.status}`);
      const json = (await res.json()) as { result?: unknown };
      if (typeof json.result !== "string") throw new Error("rpc error");
      return json.result;
    }),
  );
}

function decodeUint(hex: string): number {
  try {
    const n = Number(BigInt(hex));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function decodeBool(hex: string): boolean {
  try {
    return BigInt(hex) !== BigInt(0);
  } catch {
    return false;
  }
}

/** ABI-encode a single address argument after a function selector. */
function encodeAddressArg(selector: string, address: string): string {
  return selector + address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (!err || typeof err !== "object") return "";
  const e = err as { message?: unknown; data?: { message?: unknown } };
  if (typeof e.message === "string") return e.message;
  if (e.data && typeof e.data.message === "string") return e.data.message;
  return "";
}

function errorCode(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "number" ? code : null;
}

/** Turn a wallet/contract failure into one plain sentence for the minter. */
function friendlyTxError(err: unknown): string {
  const msg = errorMessage(err).toLowerCase();
  if (errorCode(err) === 4001 || msg.includes("user rejected") || msg.includes("user denied")) {
    return "You rejected the transaction in your wallet — nothing was minted.";
  }
  if (msg.includes("agent id required")) {
    return "This wallet has no Binance Agent ID — free mint is gated.";
  }
  if (msg.includes("mint closed")) {
    return "The mint is closed right now — the transaction was rejected by the contract.";
  }
  if (msg.includes("free limit")) return "Free mint already used for this wallet.";
  if (msg.includes("deep limit")) return "Deep limit reached for this wallet (max 5).";
  if (msg.includes("legendary limit")) return "Legendary limit reached for this wallet (max 5).";
  if (msg.includes("exact price")) return "Wrong BNB amount — the contract rejected the transaction.";
  if (msg.includes("sold out")) return "This lane is sold out.";
  if (msg.includes("insufficient funds")) {
    return "Not enough BNB in this wallet to cover the mint price plus gas.";
  }
  return "The transaction failed — nothing was minted. Check your wallet and try again.";
}

const LANES: Record<
  MintLane,
  { data: string; value: string; countSelector: string; cap: number; capMessage: string }
> = {
  free: {
    data: SELECTORS.mintFree,
    value: "0x0",
    countSelector: SELECTORS.freeCount,
    cap: FREE_CAP,
    capMessage: "Free mint already used for this wallet.",
  },
  deep: {
    data: SELECTORS.mintDeep,
    value: DEEP_VALUE_HEX,
    countSelector: SELECTORS.deepCount,
    cap: DEEP_CAP,
    capMessage: "Deep limit reached for this wallet (max 5).",
  },
  legendary: {
    data: SELECTORS.mintLegendary,
    value: LEGENDARY_VALUE_HEX,
    countSelector: SELECTORS.legendaryCount,
    cap: LEGENDARY_CAP,
    capMessage: "Legendary limit reached for this wallet (max 5).",
  },
};

/* ---------------------------- agent prompts ------------------------------ */

const AGENT_PROMPT_FREE = `Mint 1 Kryntar Diver on BNB Chain (chainId 56). Contract: ${CONTRACT_ADDRESS}. Call mintFree() and pay exactly 0 BNB (0 wei). You must hold a Binance Agent ID in this wallet (free lane is Agent-ID gated). If mintOpen() returns false, STOP and report to me. Execute once, then send me the transaction hash.`;

const AGENT_PROMPT_LEGENDARY = `Mint 1 Kryntar Diver on BNB Chain (chainId 56). Contract: ${CONTRACT_ADDRESS}. Call mintLegendary() and pay exactly 0.01 BNB (10000000000000000 wei) — guaranteed Legendary. If mintOpen() returns false, STOP and report to me. Execute once, then send me the transaction hash.`;

const AGENT_PROMPT_DEEP = `Mint 1 Kryntar Diver on BNB Chain (chainId 56). Contract: ${CONTRACT_ADDRESS}. Call mintDeep() and pay exactly 0.0005 BNB (500000000000000 wei). If mintOpen() returns false, STOP and report to me. Execute once, then send me the transaction hash.`;

/* ---------------------------------- faq ---------------------------------- */

const FAQS = [
  {
    q: "What is Kryntar?",
    a: "A dive game and a pixel gem collection on BNB Chain. You dive underground, collect Kryn gems, and save your gems.",
  },
  {
    q: "What is Kryn?",
    a: "Kryn is the gem of Kryntar. It only forms deep underground, under extreme pressure, over a very long time. The deeper it forms, the rarer and stronger it is.",
  },
  {
    q: "How do I play Deep Dive?",
    a: "Set your diver name and holder tier in the access panel, then press START DIVE. You get 60 seconds and 3 oxygen. Drag on the arena or use the arrow keys / A and D to move. Grab the gems rising past you and the air bubbles that refill oxygen; dodge the falling rocks and the jellyfish. The deeper you go, the darker the water, the faster oxygen drains — and the more every gem is worth.",
  },
  {
    q: "How many times can I play?",
    a: "It depends on your tier. Legendary NFT holders play unlimited. Free-NFT holders get 3 plays per day. Guests without an NFT get 1 practice play per day. Plays are counted on the server under your name (plus wallet, if you give one) and reset every day at 00:00 UTC.",
  },
  {
    q: "What is the leaderboard?",
    a: "An online board that runs around the clock. Every score a holder submits is recorded on the server and ranked all-time by score — top 20 shown, with your own best dive pinned below if you rank lower. It is a record of honor only: there are no prizes. After submitting you can post your score and rank to X with one tap.",
  },
  {
    q: "Why can't guests submit scores?",
    a: "Submitting is a holder perk. Guests can practice once a day to learn the dive, but their scores stay off the board. Free-NFT holders submit every dive; legendary holders submit without limits.",
  },
  {
    q: "What are the Kryntar Divers?",
    a: `The Kryntar Divers are the NFT collection: 2,222 unique pixel diver characters in four rarity tiers — Common 1,111 (50%), Rare 667 (30%), Epic 333 (15%), Legendary 111 (5%). Every token carries two official traits: Rarity and Max Depth (300 m / 600 m / 900 m / 1,200 m). The contract is live on BNB Chain at ${CONTRACT_ADDRESS}; the 4 Legendary master cards on this page are a design showcase of the final masters.`,
  },
  {
    q: "Can I swap my gems for the token now?",
    a: "Not yet. The Kryntar token is not launched. The plan: gems you collect and submit with your score will be exchangeable for the token after it launches. No rate is set yet, and the swap is not active today.",
  },
  {
    q: "Is there a prize pool?",
    a: "No. There is no prize pool and no money prizes. The leaderboard is a record of honor — you dive for gems, depth, and your place on the board.",
  },
  {
    q: "Do I need a wallet to play?",
    a: "No. Anyone can dive — guests get one practice play a day with just a name. The wallet field is optional; plays and scores are counted under your name plus wallet when you give one, so use the same pair every time.",
  },
  {
    q: "Who can mint for free?",
    a: "Wallets that hold a Binance Agent ID. The free lane (Surface Claim, 0 BNB) is Agent-ID gated — the contract checks the Binance Agent ID registry before a free mint goes through. No Agent ID, no free mint. The Deep Forge lane (0.0005 BNB) and the Legendary Mint (0.01 BNB) are not gated.",
  },
  {
    q: "How do I get a Legendary diver?",
    a: "Only one way: the Legendary Mint. It costs exactly 0.01 BNB and guarantees a Legendary NFT — one of the four Legendary masters (Crystal Diver, Royal Gold, Ember Crystal, Dragon Diver), Max Depth 1,200 m. No luck, no random draw. The free lane and the 0.0005 BNB lane never give a Legendary. The mint is open now — the Legendary lane is live.",
  },
  {
    q: "When does the mint open?",
    a: `It is open now. The mint is live on BNB Chain at ${CONTRACT_ADDRESS}, and all three lanes — Surface Claim (free, Agent-ID gated), Deep Forge (0.0005 BNB), and Legendary Mint (0.01 BNB) — are live in parallel; no lane waits for another. Connect your wallet in the Mint section above and mint directly, or use an agent prompt. Any other address claiming to be Kryntar is not Kryntar.`,
  },
];

/* ---------------------------- section heading ---------------------------- */

function SectionHead({
  kicker,
  title,
  intro,
}: {
  kicker: string;
  title: ReactNode;
  intro?: string;
}) {
  return (
    <div>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#FF8A3D]">
        {kicker}
      </p>
      <h2 className="pixel-h mt-4 text-xl text-[var(--text)] sm:text-3xl">{title}</h2>
      {intro && (
        <p className="mt-4 max-w-2xl leading-relaxed text-[var(--dim)]">{intro}</p>
      )}
    </div>
  );
}

/* ------------------------- player identity ------------------------------- */

type PlayerTier = "guest" | "free" | "legendary";
type AccessData = ApiResponse<typeof api, "getAccess">;
type LbEntry = ApiResponse<typeof api, "getLeaderboard">["entries"][number];

const TIER_LABEL: Record<PlayerTier, string> = {
  guest: "GUEST",
  free: "FREE NFT",
  legendary: "LEGENDARY NFT",
};

function loadTier(): PlayerTier {
  const v = localStorage.getItem("kryntar-tier");
  return v === "free" || v === "legendary" ? v : "guest";
}

function loadWallet(): string {
  return localStorage.getItem("kryntar-wallet") ?? "";
}

/** "2026-11-14 · 17:04 UTC" — leaderboard times are always shown in UTC. */
function formatUtc(iso: string): string {
  const d = new Date(iso);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCDate()} ${months[d.getUTCMonth()] ?? ""} ${d.getUTCFullYear()} · ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())} UTC`;
}

function xPostUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

function TierBadge({ tier }: { tier: string }) {
  if (tier === "legendary") {
    return (
      <span className="bg-[#FFC46B] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#070708]">
        Legendary
      </span>
    );
  }
  return (
    <span className="bg-[#3D382E] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text)]">
      Free NFT
    </span>
  );
}

function SaveDiveForm({
  run,
  name,
  wallet,
  tier,
  onNameChange,
  onWalletChange,
  onSaved,
}: {
  run: RunResult | null;
  name: string;
  wallet: string;
  tier: PlayerTier;
  onNameChange: (v: string) => void;
  onWalletChange: (v: string) => void;
  onSaved: (rank: number | null) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [savedRank, setSavedRank] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const submit = useMutation({
    mutationFn: async (args: {
      name: string;
      score: number;
      pearls: number;
      depth: number;
      tier: "free" | "legendary";
      wallet?: string;
    }) => await api.submitScore(args),
    onSuccess: (res) => {
      localStorage.setItem("kryntar-name", name.trim());
      const prev = Number(localStorage.getItem("kryntar-gems-total") ?? 0);
      const safePrev = Number.isFinite(prev) ? prev : 0;
      localStorage.setItem("kryntar-gems-total", String(safePrev + (run?.gems ?? 0)));
      setSavedRank(res.rank);
      setMessage(
        res.rank
          ? `Submitted. You are #${res.rank} on the all-time leaderboard — post it to X from the panel above.`
          : "Submitted to the leaderboard.",
      );
      void queryClient.invalidateQueries();
      onSaved(res.rank);
    },
    onError: () => setMessage("Could not submit. Try again in a moment."),
  });

  if (!run) return null;

  if (tier === "guest") {
    return (
      <div
        className="chunk-sm mt-6 bg-[#0B0B0C] p-4 sm:p-5"
        style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
        role="status"
      >
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em]">
          Guest dive — practice only
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
          You scored {run.score} and reached {run.depth} m, but guest scores
          cannot be submitted to the leaderboard. Submitting is for Kryntar
          NFT holders: free-NFT holders submit every dive, legendary holders
          dive and submit without limits. If you hold one, pick your tier in
          the access panel above the game.
        </p>
      </div>
    );
  }

  return (
    <form
      className="chunk-sm mt-6 bg-[#0B0B0C] p-4 sm:p-5"
      style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || submit.isPending) return;
        setMessage(null);
        submit.mutate({
          name: name.trim(),
          score: run.score,
          pearls: run.gems,
          depth: run.depth,
          tier,
          wallet: wallet.trim() ? wallet.trim() : undefined,
        });
      }}
    >
      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em]">
        Submit this dive — score {run.score} · {TIER_LABEL[tier]}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
        You reached {run.depth} m and brought up {run.gems} Kryn gems (Pale ×
        {run.counts.pale} · Cracked × {run.counts.cracked} · Ember ×{" "}
        {run.counts.ember} · Heart × {run.counts.heart}). Submit it and the
        score goes on the online leaderboard for everyone to see, and the
        gems land in My Gems below — the saved gems are the ones that count
        later, when the gem-to-token swap opens.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 text-sm">
          <span className="mb-1 block font-mono text-xs uppercase tracking-[0.18em] text-[var(--dim)]">
            Diver name
          </span>
          <input
            aria-label="Diver name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={24}
            required
            placeholder="e.g. VEYRA"
            className="w-full border-2 border-[#3D382E] bg-[var(--surface)] px-3 py-2 text-[var(--text)] placeholder:text-[#55534c]"
          />
        </label>
        <label className="flex-1 text-sm">
          <span className="mb-1 block font-mono text-xs uppercase tracking-[0.18em] text-[var(--dim)]">
            BNB wallet (optional)
          </span>
          <input
            aria-label="BNB wallet (optional)"
            value={wallet}
            onChange={(e) => onWalletChange(e.target.value)}
            maxLength={64}
            placeholder="0x…"
            className="w-full border-2 border-[#3D382E] bg-[var(--surface)] px-3 py-2 text-[var(--text)] placeholder:text-[#55534c]"
          />
        </label>
        <button
          type="submit"
          disabled={submit.isPending || !name.trim() || savedRank !== null}
          className="chunk-sm self-end bg-[#E8E3D8] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#070708] disabled:opacity-40"
          style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
        >
          {submit.isPending
            ? "Submitting…"
            : savedRank !== null
              ? "Submitted ✓"
              : "Submit score"}
        </button>
      </div>
      {message && (
        <p role="status" className="mt-3 font-mono text-xs text-[#FF8A3D]">
          {message}
        </p>
      )}
    </form>
  );
}

/* ---------------------------- access panel ------------------------------- */

function AccessPanel({
  name,
  wallet,
  tier,
  onNameChange,
  onWalletChange,
  onTierChange,
  access,
  accessLoading,
}: {
  name: string;
  wallet: string;
  tier: PlayerTier;
  onNameChange: (v: string) => void;
  onWalletChange: (v: string) => void;
  onTierChange: (t: PlayerTier) => void;
  access: AccessData | null;
  accessLoading: boolean;
}) {
  const tiers: { id: PlayerTier; label: string; rule: string }[] = [
    { id: "legendary", label: "LEGENDARY NFT", rule: "Unlimited plays · submit scores" },
    { id: "free", label: "FREE NFT", rule: "3 plays a day · submit scores" },
    { id: "guest", label: "GUEST — NO NFT", rule: "1 practice play a day · no submitting" },
  ];
  return (
    <div
      className="chunk-sm mb-6 bg-[#0B0B0C] p-4 sm:p-5"
      style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="pixel-h text-xs sm:text-sm">WHO IS DIVING?</h3>
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--dim)]">
          {accessLoading
            ? "Checking plays…"
            : access
              ? access.plays_left === null
                ? "Plays today: unlimited"
                : `Plays left today: ${access.plays_left}/${access.plays_limit ?? 0}`
              : "Plays counted on the server"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-mono text-xs uppercase tracking-[0.18em] text-[var(--dim)]">
            Diver name
          </span>
          <input
            aria-label="Diver name for play access"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={24}
            placeholder="e.g. VEYRA"
            className="w-full border-2 border-[#3D382E] bg-[var(--surface)] px-3 py-2 text-[var(--text)] placeholder:text-[#55534c]"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-mono text-xs uppercase tracking-[0.18em] text-[var(--dim)]">
            BNB wallet (optional)
          </span>
          <input
            aria-label="BNB wallet for play access (optional)"
            value={wallet}
            onChange={(e) => onWalletChange(e.target.value)}
            maxLength={64}
            placeholder="0x…"
            className="w-full border-2 border-[#3D382E] bg-[var(--surface)] px-3 py-2 text-[var(--text)] placeholder:text-[#55534c]"
          />
        </label>
      </div>
      <div
        className="mt-4 grid gap-2 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Holder tier"
      >
        {tiers.map((t) => {
          const active = tier === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onTierChange(t.id)}
              className={`border-2 px-3 py-2.5 text-left ${
                active
                  ? t.id === "legendary"
                    ? "border-[#FFC46B] bg-[#241A08]"
                    : "border-[#FF8A3D] bg-[#241708]"
                  : "border-[#3D382E] bg-[var(--surface)]"
              }`}
            >
              <span className="block font-mono text-xs font-bold tracking-[0.12em]">
                {t.label}
              </span>
              <span className="mt-1 block font-mono text-[11px] leading-relaxed text-[var(--dim)]">
                {t.rule}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 font-mono text-[11px] leading-relaxed text-[var(--dim)]">
        Plays are counted on the server per name + wallet and reset at 00:00
        UTC. Honest note: holder status is self-declared for now. The
        Kryntar contract is live on BNB Chain, and on-chain holder
        verification is being connected — it is not active yet, so nothing
        is being verified against your wallet today.
      </p>
    </div>
  );
}

/* ----------------------------- leaderboard ------------------------------- */

function LeaderboardRow({
  entry,
  isMine,
}: {
  entry: LbEntry;
  isMine: boolean;
}) {
  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${
        isMine ? "bg-[#241708]" : ""
      }`}
    >
      <span className="w-10 font-mono text-lg font-bold text-[#FF8A3D]">
        #{entry.rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="break-all font-mono text-sm font-bold">{entry.name}</span>
          <TierBadge tier={entry.tier} />
          {isMine && (
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#FFC46B]">
              You
            </span>
          )}
        </span>
        <span className="mt-1 block font-mono text-[11px] text-[var(--dim)]">
          {entry.depth} m deep · {entry.pearls} gems
          {entry.wallet ? ` · ${entry.wallet}` : ""} · {formatUtc(entry.created_at)}
        </span>
      </span>
      <span className="font-mono text-xl font-bold">{entry.score}</span>
      {isMine && (
        <a
          href={xPostUrl(
            `I scored ${entry.score} in Kryntar DEEP DIVE — ${entry.depth} m deep, ${entry.pearls} Kryn gems hauled up. Rank #${entry.rank} on the all-time leaderboard. #Kryntar`,
          )}
          target="_blank"
          rel="noreferrer"
          aria-label={`Post your rank ${entry.rank} score to X`}
          className="chunk-sm bg-[#E8E3D8] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#070708]"
          style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
        >
          Post to X
        </a>
      )}
    </li>
  );
}

function LeaderboardSection({
  name,
  wallet,
}: {
  name: string;
  wallet: string;
}) {
  const board = useQuery({
    queryKey: ["leaderboard", name.trim().toLowerCase(), wallet.trim().toLowerCase()],
    queryFn: () =>
      api.getLeaderboard({
        name: name.trim() ? name.trim() : undefined,
        wallet: wallet.trim() ? wallet.trim() : undefined,
      }),
    refetchInterval: 30_000,
  });
  const data = board.data;
  const mine = data?.mine ?? null;
  const mineInTop = mine !== null && mine.rank <= 20;

  return (
    <section id="board" className="scroll-mt-24 pt-20">
      <SectionHead
        kicker="Leaderboard"
        title="TOP DIVERS — ALL TIME"
        intro="The online board: every submitted dive is recorded on the server and stays here, ranked by score. It runs around the clock — submit a dive and it appears for every visitor. Honor and bragging rights only: there is no prize pool."
      />
      <div className="chunk mt-8 p-2 sm:p-6" style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2 pt-2 sm:px-0 sm:pt-0">
          <p className="font-mono text-xs text-[var(--dim)]">
            {data
              ? `${data.total} ${data.total === 1 ? "score" : "scores"} recorded · auto-refreshes every 30 s`
              : "Loading the board…"}
          </p>
          <button
            type="button"
            onClick={() => void board.refetch()}
            disabled={board.isFetching}
            className="chunk-sm bg-transparent px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[var(--text)] disabled:opacity-40"
            style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
          >
            {board.isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {board.isError && (
          <p className="px-2 font-mono text-xs text-[#FF8A3D]" role="alert">
            The leaderboard could not be loaded. Press Refresh to try again.
          </p>
        )}

        {data && data.entries.length === 0 && (
          <p className="px-2 py-6 text-center font-mono text-sm text-[var(--dim)]" role="status">
            No scores yet. Be the first name on the board — dive, then submit.
          </p>
        )}

        {data && data.entries.length > 0 && (
          <ol className="divide-y divide-[#201E1A] border-2 border-[#201E1A] bg-[#0B0B0C]">
            {data.entries.map((e) => (
              <LeaderboardRow
                key={e.rank}
                entry={e}
                isMine={mine !== null && e.rank === mine.rank}
              />
            ))}
          </ol>
        )}

        {mine && !mineInTop && (
          <div className="mt-4">
            <p className="mb-2 px-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">
              Your best dive — outside the top 20
            </p>
            <ol className="border-2 border-[#C97B2D] bg-[#0B0B0C]">
              <LeaderboardRow entry={mine} isMine />
            </ol>
          </div>
        )}

        {data && !mine && name.trim() && (
          <p className="mt-4 px-2 font-mono text-xs text-[var(--dim)]">
            No submitted dive under “{name.trim()}” yet — finish a dive and
            submit it to take your place on the board.
          </p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ prompt card ------------------------------ */

function PromptCard({
  title,
  price,
  text,
}: {
  title: string;
  price: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <article className="chunk bg-[var(--surface)] p-5 sm:p-6" style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="pixel-h text-sm">{title}</h3>
        <span className="font-mono text-xs font-bold tracking-[0.15em] text-[#FF8A3D]">{price}</span>
      </div>
      <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap border-2 border-[#201E1A] bg-[#070708] p-3 font-mono text-xs leading-relaxed text-[var(--dim)]">
        {text}
      </pre>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Copy the ${title} agent prompt`}
        className="chunk-sm mt-4 bg-[#E8E3D8] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#070708]"
        style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
      >
        {copied ? "Copied ✓" : "Copy prompt"}
      </button>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-[var(--dim)]">
        <li>Pick a lane — free or paid.</li>
        <li>Copy the prompt and paste it to your agent.</li>
        <li>The mint is open — the agent checks mintOpen(), then executes right away.</li>
      </ol>
    </article>
  );
}

/* --------------------------- contract address ---------------------------- */

function ContractAddressBlock() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = CONTRACT_ADDRESS;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mt-4 border-2 border-[#201E1A] bg-[#070708] p-3 sm:p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">
        Contract address — BNB Chain (chainId 56)
      </p>
      <p className="mt-2 break-all font-mono text-sm font-bold leading-relaxed text-[var(--text)]">
        {CONTRACT_ADDRESS}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void copy()}
          aria-label="Copy the Kryntar contract address"
          className="chunk-sm bg-[#E8E3D8] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#070708]"
          style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
        >
          {copied ? "Copied ✓" : "Copy address"}
        </button>
        <a
          href={`https://bscscan.com/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          aria-label="View the Kryntar contract on BscScan (opens in a new tab)"
          className="chunk-sm inline-flex items-center border-2 border-[#3D382E] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[var(--text)] hover:text-[#FF8A3D]"
          style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
        >
          View on BscScan ↗
        </a>
      </div>
    </div>
  );
}

/* ------------------------------ mint section ----------------------------- */

/** Live mint panel: on-chain counters, wallet connect, and the three lanes.
 *  Every count is read from the contract; every pre-mint check runs again
 *  on-chain at mint time, so a stale counter can never oversell a lane. */
function MintSection() {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [chainStatus, setChainStatus] = useState<MintChainStatus | null>(null);
  const [chainFailed, setChainFailed] = useState(false);
  const [mintingLane, setMintingLane] = useState<MintLane | null>(null);
  const [laneStatus, setLaneStatus] = useState<Record<MintLane, LaneStatus>>({
    free: { status: "idle" },
    deep: { status: "idle" },
    legendary: { status: "idle" },
  });
  const accountRef = useRef<string | null>(null);
  accountRef.current = account;

  const setLane = (lane: MintLane, next: LaneStatus) =>
    setLaneStatus((prev) => ({ ...prev, [lane]: next }));

  const refreshStatus = async () => {
    try {
      const [openHex, totalHex, standardHex, legendaryHex] = await Promise.all([
        ethCall(SELECTORS.mintOpen),
        ethCall(SELECTORS.totalMinted),
        ethCall(SELECTORS.standardMinted),
        ethCall(SELECTORS.legendaryMinted),
      ]);
      setChainStatus({
        open: decodeBool(openHex),
        total: decodeUint(totalHex),
        standard: decodeUint(standardHex),
        legendary: decodeUint(legendaryHex),
        updatedAt: new Date().toISOString(),
      });
      setChainFailed(false);
    } catch {
      setChainFailed(true);
    }
  };

  useEffect(() => {
    void refreshStatus();
    const timer = setInterval(() => void refreshStatus(), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const provider = getEthereum();
    if (!provider || !provider.on) return;
    const handler = (...args: unknown[]) => {
      const accounts = args[0];
      if (Array.isArray(accounts) && typeof accounts[0] === "string") {
        setAccount(accounts[0]);
      } else {
        setAccount(null);
      }
    };
    provider.on("accountsChanged", handler);
    return () => {
      provider.removeListener?.("accountsChanged", handler);
    };
  }, []);

  const connect = async () => {
    const provider = getEthereum();
    if (!provider) {
      setConnectError(
        "No wallet found in this browser. Open kryntar.xyz inside a wallet browser (MetaMask, Trust Wallet, Binance Wallet…) — or mint with an agent using the prompts below.",
      );
      return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as unknown;
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        throw new Error("no account returned");
      }
      if ((await provider.request({ method: "eth_chainId" })) !== "0x38") {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x38" }],
          });
        } catch (switchErr) {
          if (errorCode(switchErr) === 4902) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x38",
                  chainName: "BNB Smart Chain",
                  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                  rpcUrls: ["https://bsc-dataseed.binance.org"],
                  blockExplorerUrls: ["https://bscscan.com"],
                },
              ],
            });
          } else {
            throw switchErr;
          }
        }
      }
      setAccount(accounts[0]);
    } catch (err) {
      setConnectError(
        errorCode(err) === 4001
          ? "Wallet connection was rejected — approve it in your wallet to mint here."
          : "Could not connect the wallet. Check it is unlocked and on BNB Chain, then try again.",
      );
    } finally {
      setConnecting(false);
    }
  };

  const mint = async (lane: MintLane) => {
    const wallet = accountRef.current;
    if (!wallet || mintingLane) return;
    const cfg = LANES[lane];
    setMintingLane(lane);
    setLane(lane, { status: "pending", message: "Checking the chain…" });
    try {
      let open: boolean | null = null;
      let count: number | null = null;
      let hasId: boolean | null = null;
      try {
        const [openHex, countHex] = await Promise.all([
          ethCall(SELECTORS.mintOpen),
          ethCall(encodeAddressArg(cfg.countSelector, wallet)),
        ]);
        open = decodeBool(openHex);
        count = decodeUint(countHex);
        if (lane === "free") {
          hasId = decodeBool(await ethCall(encodeAddressArg(SELECTORS.hasAgentId, wallet)));
        }
      } catch {
        /* Pre-checks failed: the contract re-checks everything at mint time. */
      }
      if (open === false) {
        setLane(lane, {
          status: "error",
          message: "The mint is closed right now — the contract reports mintOpen = false.",
        });
        return;
      }
      if (count !== null && count >= cfg.cap) {
        setLane(lane, { status: "error", message: cfg.capMessage });
        return;
      }
      if (lane === "free" && hasId === false) {
        setLane(lane, {
          status: "error",
          message: "This wallet has no Binance Agent ID — free mint is gated.",
        });
        return;
      }
      const provider = getEthereum();
      if (!provider) throw new Error("wallet disappeared");
      if ((await provider.request({ method: "eth_chainId" })) !== "0x38") {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x38" }],
          });
        } catch {
          setLane(lane, {
            status: "error",
            message: "Switch your wallet to BNB Chain (chainId 56) and try again.",
          });
          return;
        }
      }
      setLane(lane, { status: "pending", message: "Confirm the transaction in your wallet…" });
      const txHash = (await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: wallet, to: CONTRACT_ADDRESS, data: cfg.data, value: cfg.value }],
      })) as string;
      setLane(lane, {
        status: "success",
        message: "Mint sent — your Diver is on its way.",
        txHash,
      });
      void refreshStatus();
    } catch (err) {
      setLane(lane, { status: "error", message: friendlyTxError(err) });
    } finally {
      setMintingLane(null);
    }
  };

  const renderLaneButton = (lane: MintLane, label: string, ariaLabel: string, className: string) => {
    const st = laneStatus[lane];
    return (
      <>
        <button
          type="button"
          disabled={!account || mintingLane !== null}
          onClick={() => void mint(lane)}
          aria-label={ariaLabel}
          className={className}
        >
          {!account ? "Connect wallet first" : mintingLane === lane ? "Minting…" : label}
        </button>
        {st.status === "pending" && (
          <p className="mt-3 font-mono text-xs leading-relaxed text-[var(--dim)]" role="status">
            {st.message}
          </p>
        )}
        {st.status === "error" && (
          <p className="mt-3 font-mono text-xs font-bold leading-relaxed text-[#FF7A59]" role="alert">
            {st.message}
          </p>
        )}
        {st.status === "success" && (
          <p className="mt-3 font-mono text-xs leading-relaxed text-[#9BE08A]" role="status">
            {st.message}{" "}
            <a
              href={`https://bscscan.com/tx/${st.txHash}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`View mint transaction ${shortAddress(st.txHash)} on BscScan (opens in a new tab)`}
              className="font-bold text-[#FFC46B] underline underline-offset-2"
            >
              Tx {shortAddress(st.txHash)} ↗
            </a>
          </p>
        )}
      </>
    );
  };

  const updatedAt = chainStatus ? new Date(chainStatus.updatedAt).toISOString().slice(11, 19) : null;

  return (
    <div className="chunk mt-8 p-5 sm:p-6" style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="pixel-h text-xs sm:text-sm">MINT STATUS</h3>
        <span className="chunk-sm bg-[#FF8A3D] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#070708]" style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}>
          Mint open — all lanes live
        </span>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--dim)]">
        The Kryntar mint is{" "}
        <strong className="text-[var(--text)]">OPEN — all three lanes live</strong>{" "}
        on BNB Chain for the{" "}
        <strong className="text-[var(--text)]">Kryntar Divers</strong>{" "}
        collection — 2,222 pixel divers in four rarity tiers. Connect your wallet below and mint right here, or send your agent one of the prompts further down. The address below is the only official one; any other address claiming to be Kryntar is fake.
      </p>

      <ContractAddressBlock />

      <div className="mt-4 border-2 border-[#201E1A] bg-[#070708] p-3 sm:p-4" aria-live="polite">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 font-mono text-sm">
          <p>
            <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">Minted </span>
            <strong className="text-base text-[var(--text)]">
              {chainStatus ? chainStatus.total.toLocaleString("en-US") : "—"} / 2,222
            </strong>
          </p>
          <p>
            <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">Standard pool left </span>
            <strong className="text-base text-[var(--text)]">
              {chainStatus ? Math.max(0, STANDARD_POOL_SIZE - chainStatus.standard).toLocaleString("en-US") : "—"}
            </strong>
          </p>
          <p>
            <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">Legendary left </span>
            <strong className="text-base text-[#FFC46B]">
              {chainStatus ? Math.max(0, LEGENDARY_POOL_SIZE - chainStatus.legendary).toLocaleString("en-US") : "—"} / 111
            </strong>
          </p>
        </div>
      </div>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--dim)]">
        {chainStatus
          ? `Live · updated ${updatedAt} UTC · refreshes every 15 s`
          : chainFailed
            ? "Live counter unreachable right now — mint buttons still work; every check runs again on-chain at mint time."
            : "Reading the chain…"}
      </p>

      <div className="mt-4 border-2 border-[#201E1A] bg-[#070708] p-3 sm:p-4">
        {account ? (
          <p className="font-mono text-sm leading-relaxed">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">Wallet connected </span>
            <strong className="break-all text-[var(--text)]">{account}</strong>{" "}
            <span className="text-[var(--dim)]">(BNB Chain)</span>
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void connect()}
              disabled={connecting}
              aria-label="Connect your wallet to mint Kryntar Divers"
              className="chunk-sm w-full bg-[#FF8A3D] px-5 py-3 font-mono text-sm font-bold uppercase tracking-[0.15em] text-[#070708] disabled:opacity-60 sm:w-auto"
              style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
            >
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--dim)]">
              One connect for all three lanes · switches to BNB Chain (chainId 56) automatically
            </p>
          </>
        )}
        {connectError && (
          <p className="mt-3 font-mono text-xs font-bold leading-relaxed text-[#FF7A59]" role="alert">
            {connectError}
          </p>
        )}
      </div>

      <article
        className="mt-6 p-5 sm:p-6"
        style={{
          border: "3px solid #FFC46B",
          boxShadow: "6px 6px 0 #4A2E08, 0 0 26px rgba(255,138,61,0.6)",
          background: "#0B0B0C",
        }}
      >
        <div className="flex items-end gap-1" aria-hidden="true">
          {[10, 18, 26, 18, 10].map((hgt, i) => (
            <span key={i} className="block w-full" style={{ height: hgt, background: "#FFC46B" }} />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#FFC46B]">
            Lane 03 — Legendary
          </p>
          <span className="chunk-sm bg-[#FFC46B] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#070708]" style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}>
            Guaranteed Legendary
          </span>
        </div>
        <h4 className="pixel-h mt-3 text-base sm:text-lg">LEGENDARY MINT</h4>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--dim)]">
          <strong className="text-[var(--text)]">
            GUARANTEED LEGENDARY — no luck, no random draw.
          </strong>{" "}
          Pay exactly 0.01 BNB and you get a Legendary NFT, every time:
          one of the four Legendary masters — Crystal Diver, Royal Gold,
          Ember Crystal, or Dragon Diver — with Max Depth 1,200 m. This
          is the <strong className="text-[var(--text)]">only</strong>{" "}
          lane that gives a Legendary; no other lane can pull one.
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <p className="font-mono text-4xl font-bold text-[#FFC46B]">0.01 BNB</p>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--dim)]">
            Max Depth <span className="font-bold text-[var(--text)]">1,200 M</span> · 111 of 2,222
          </p>
        </div>
        {renderLaneButton(
          "legendary",
          "Mint Legendary — 0.01 BNB",
          "Mint one guaranteed Legendary Kryntar Diver for 0.01 BNB",
          "mt-4 w-full border-2 border-[#FFC46B] bg-[#FFC46B] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#070708] disabled:cursor-not-allowed disabled:border-[#3D382E] disabled:bg-transparent disabled:text-[var(--dim)] disabled:opacity-70",
        )}
      </article>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <article className="chunk-sm bg-[#0B0B0C] p-5" style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">
            Lane 01 — Free
          </p>
          <h4 className="pixel-h mt-2 text-sm">SURFACE CLAIM</h4>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--dim)]">
            <li>▸ <strong className="text-[var(--text)]">0 BNB.</strong> Free — gas only.</li>
            <li>▸ Requires a <strong className="text-[var(--text)]">Binance Agent ID</strong> in your wallet.</li>
            <li>▸ Pulls <strong className="text-[var(--text)]">Surface</strong> layer gems only.</li>
            <li>▸ Power 10–99. The plain start every diver gets.</li>
          </ul>
          <p className="mt-5 font-mono text-3xl font-bold">0 BNB</p>
          {renderLaneButton(
            "free",
            "Mint free — 0 BNB",
            "Mint one Kryntar Diver free with the Agent-ID gated Surface Claim lane",
            "mt-4 w-full border-2 border-[#E8E3D8] bg-[#E8E3D8] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#070708] disabled:cursor-not-allowed disabled:border-[#3D382E] disabled:bg-transparent disabled:text-[var(--dim)] disabled:opacity-70",
          )}
        </article>

        <article className="chunk-sm relative bg-[#0B0B0C] p-5" style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}>
          <span className="core-line absolute inset-x-0 top-0 h-1" aria-hidden="true" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">
            Lane 02 — Paid
          </p>
          <h4 className="pixel-h mt-2 text-sm">DEEP FORGE</h4>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--dim)]">
            <li>▸ Exactly <strong className="text-[var(--text)]">0.0005 BNB</strong> per mint.</li>
            <li>
              ▸ The only lane that can pull{" "}
              <strong className="text-[var(--text)]">Core</strong> and{" "}
              <strong className="text-[var(--text)]">Heart</strong> gems.
            </li>
            <li>▸ Power up to 999. Open from day one, next to the free lane.</li>
            <li>▸ Never a Legendary NFT — Legendary comes only from the Legendary Mint above.</li>
          </ul>
          <p className="mt-5 font-mono text-3xl font-bold">0.0005 BNB</p>
          {renderLaneButton(
            "deep",
            "Mint Deep — 0.0005 BNB",
            "Mint one Kryntar Diver with the Deep Forge lane for 0.0005 BNB",
            "mt-4 w-full border-2 border-[#FF8A3D] bg-[#FF8A3D] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#070708] disabled:cursor-not-allowed disabled:border-[#3D382E] disabled:bg-transparent disabled:text-[var(--dim)] disabled:opacity-70",
          )}
        </article>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse font-mono text-sm">
          <thead>
            <tr className="border-b-[3px] border-black text-left">
              <th className="py-2 pr-4 text-xs uppercase tracking-[0.15em] text-[var(--dim)]">Compare</th>
              <th className="py-2 pr-4 text-xs uppercase tracking-[0.15em]">Surface Claim</th>
              <th className="py-2 text-xs uppercase tracking-[0.15em]">Deep Forge</th>
            </tr>
          </thead>
          <tbody className="text-[var(--dim)]">
            <tr className="border-b border-dashed border-[#2A2721]">
              <td className="py-2.5 pr-4 font-bold text-[var(--text)]">Price</td>
              <td className="py-2.5 pr-4">0 BNB</td>
              <td className="py-2.5">0.0005 BNB</td>
            </tr>
            <tr className="border-b border-dashed border-[#2A2721]">
              <td className="py-2.5 pr-4 font-bold text-[var(--text)]">Layers</td>
              <td className="py-2.5 pr-4">Surface only</td>
              <td className="py-2.5">Surface → Heart</td>
            </tr>
            <tr className="border-b border-dashed border-[#2A2721]">
              <td className="py-2.5 pr-4 font-bold text-[var(--text)]">Power</td>
              <td className="py-2.5 pr-4">10 – 99</td>
              <td className="py-2.5">10 – 999</td>
            </tr>
            <tr className="border-b border-dashed border-[#2A2721]">
              <td className="py-2.5 pr-4 font-bold text-[var(--text)]">Legendary NFT</td>
              <td className="py-2.5 pr-4">Never</td>
              <td className="py-2.5">Never — Legendary Mint only (0.01 BNB)</td>
            </tr>
            <tr>
              <td className="py-2.5 pr-4 font-bold text-[var(--text)]">Opens</td>
              <td className="py-2.5 pr-4">Day one</td>
              <td className="py-2.5">Day one — same block</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------- app ---------------------------------- */

export function App() {
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [submittedRank, setSubmittedRank] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem("kryntar-name") ?? "",
  );
  const [playerWallet, setPlayerWallet] = useState(loadWallet);
  const [playerTier, setPlayerTier] = useState<PlayerTier>(loadTier);
  const [gemsTotal, setGemsTotal] = useState<number>(() => {
    const v = Number(localStorage.getItem("kryntar-gems-total") ?? 0);
    return Number.isFinite(v) ? v : 0;
  });
  const [bestScore] = useState<number>(() => {
    const v = Number(localStorage.getItem("kryntar-dive-best") ?? 0);
    return Number.isFinite(v) ? v : 0;
  });
  const queryClient = useQueryClient();

  const trimmedName = playerName.trim();
  const trimmedWallet = playerWallet.trim();
  const accessArgs = {
    name: trimmedName,
    wallet: trimmedWallet ? trimmedWallet : undefined,
    tier: playerTier,
  };
  const accessQuery = useQuery({
    queryKey: ["access", trimmedName.toLowerCase(), trimmedWallet.toLowerCase(), playerTier],
    queryFn: () => api.getAccess(accessArgs),
    enabled: trimmedName.length > 0,
  });
  const access: PlayAccess | null = accessQuery.data
    ? {
        playsLeft: accessQuery.data.plays_left,
        playsLimit: accessQuery.data.plays_limit,
        canSubmit: accessQuery.data.can_submit,
        resetsAt: accessQuery.data.resets_at,
      }
    : null;

  const handleStartRequest = async (): Promise<StartVerdict> => {
    const res = await api.startPlay(accessArgs);
    void queryClient.invalidateQueries({ queryKey: ["access"] });
    return {
      allowed: res.allowed,
      access: {
        playsLeft: res.access.plays_left,
        playsLimit: res.access.plays_limit,
        canSubmit: res.access.can_submit,
        resetsAt: res.access.resets_at,
      },
    };
  };

  const changeName = (v: string) => {
    setPlayerName(v);
    localStorage.setItem("kryntar-name", v);
  };
  const changeWallet = (v: string) => {
    setPlayerWallet(v);
    localStorage.setItem("kryntar-wallet", v);
  };
  const changeTier = (t: PlayerTier) => {
    setPlayerTier(t);
    localStorage.setItem("kryntar-tier", t);
  };

  const navLink =
    "px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--dim)] hover:text-[var(--text)]";

  return (
    <div className="depth-bg min-h-screen font-mono text-[var(--text)]">
      <SafeAreaTopScrim backgroundColor="var(--bg)" />

      <nav className="sticky top-0 z-20 border-b-[3px] border-black bg-[#070708]/95 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center px-4">
          <a href="#top" aria-label="Back to the top" className="flex items-center gap-2 py-2 pr-2">
            <GemMark className="h-7 w-6" />
            <span className="pixel-h text-sm">
              KRYN<span className="core-text">TAR</span>
            </span>
          </a>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-0.5 py-1">
            <a className={navLink} href="#game">Game</a>
            <a className={navLink} href="#board">Board</a>
            <a className={navLink} href="#world">World</a>
            <a className={navLink} href="#collection">Gems</a>
            <a className={navLink} href="#divers">Divers</a>
            <a className={navLink} href="#mint">Mint</a>
            <a className={navLink} href="#faq">FAQ</a>
          </div>
        </div>
      </nav>

      <main id="top" className="mx-auto max-w-6xl px-4 pb-20">
        {/* -------------------------------- hero ------------------------------ */}
        <header className="pt-12 sm:pt-16">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#FF8A3D]">
            The deep dive game — BNB Chain
          </p>
          <h1 className="pixel-h mt-5 text-[1.7rem] leading-[1.6] sm:text-5xl sm:leading-[1.5]">
            DIVE DEEP.
            <br />
            BRING UP <span className="core-text">KRYN.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--dim)]">
            Kryn is a gem that only forms deep underground, under extreme
            pressure. Play the dive game, collect Kryn gems on the way down,
            and save your gems. The deeper you go, the more every gem is
            worth — and the gems you save are planned to swap for the Kryntar
            token later.
          </p>

          <dl className="chunk mt-8 grid grid-cols-2 gap-px bg-black font-mono lg:grid-cols-4" style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}>
            {[
              ["PLAY", "Holders dive more — see access"],
              ["ONE DIVE", "60 seconds · 3 oxygen"],
              ["GEMS", "4 types · deeper = rarer"],
              ["TOKEN", "Not launched yet"],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#0B0B0C] px-4 py-3">
                <dt className="text-[10px] tracking-[0.22em] text-[var(--dim)]">{k}</dt>
                <dd className="mt-1 text-xs font-bold leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>

          <figure className="mt-8">
            <div className="chunk overflow-hidden" style={{ "--chunk-shadow": "#262019" } as CSSProperties}>
              <img
                src={heroImg}
                alt="Pixel art: a tiny diver with an orange visor swims down toward a huge glowing copper Kryn crystal cluster deep underground"
                className="pixelated block aspect-[4/3] w-full object-cover object-center sm:aspect-[21/9]"
              />
            </div>
            <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dim)]">
              A diver, a lamp, and the biggest Kryn cluster ever found.
            </figcaption>
          </figure>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#game"
              className="chunk-sm bg-[#FF8A3D] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#070708]"
              style={{ "--chunk-shadow": "#262019" } as CSSProperties}
            >
              Play Deep Dive
            </a>
            <a
              href="#collection"
              className="chunk-sm bg-transparent px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[var(--text)]"
              style={{ "--chunk-shadow": "#262019" } as CSSProperties}
            >
              See the gems
            </a>
          </div>
        </header>

        {/* -------------------------------- game ------------------------------ */}
        <section id="game" className="scroll-mt-24 pt-20">
          <SectionHead
            kicker="The Game"
            title="DEEP DIVE"
            intro="One dive, 60 seconds. Gems rise past you as you sink — grab them, dodge the rocks, watch your oxygen. Your score is your depth plus your gems, and every gem is multiplied by the layer you are in: ×1 at the Surface, up to ×5 in the Heart. How often you can dive depends on your tier: legendary NFT holders play without limits, free-NFT holders get 3 plays a day, and guests get 1 practice play a day — plays are counted on the server and reset at 00:00 UTC."
          />
          <div className="chunk mt-8 p-2 sm:p-6" style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="pixel-h text-xs sm:text-sm">DEEP DIVE — ONE RUN</h3>
              <span className="chunk-sm bg-[#FF8A3D] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#070708]" style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}>
                Legendary: unlimited · Free NFT: 3/day
              </span>
            </div>
            <AccessPanel
              name={playerName}
              wallet={playerWallet}
              tier={playerTier}
              onNameChange={changeName}
              onWalletChange={changeWallet}
              onTierChange={changeTier}
              access={accessQuery.data ?? null}
              accessLoading={accessQuery.isFetching}
            />
            <p className="mb-4 max-w-3xl text-sm leading-relaxed text-[var(--dim)]">
              You have <strong className="text-[var(--text)]">60 seconds</strong> and{" "}
              <strong className="text-[var(--text)]">3 oxygen</strong>. Pale Kryn +10,
              Cracked +20, Ember +30, Heart +50 — times the layer multiplier. Oxygen
              drains faster the deeper you go, so grab the rising air bubbles. A
              falling rock costs 1 oxygen and 15 points; a jellyfish sting costs 1
              oxygen. Chain gems without a break for combo bonuses.
            </p>
            <DeepDive
              onFinish={(result) => {
                setLastRun(result);
                setSubmittedRank(null);
              }}
              access={trimmedName ? access : null}
              accessLoading={accessQuery.isFetching}
              onStartRequest={async (): Promise<StartVerdict> => {
                if (!trimmedName) return { allowed: false, access: null };
                return handleStartRequest();
              }}
              submittedRank={submittedRank}
            />
            <SaveDiveForm
              run={lastRun}
              name={playerName}
              wallet={playerWallet}
              tier={playerTier}
              onNameChange={changeName}
              onWalletChange={changeWallet}
              onSaved={(rank) => {
                setSubmittedRank(rank);
                const v = Number(localStorage.getItem("kryntar-gems-total") ?? 0);
                setGemsTotal(Number.isFinite(v) ? v : 0);
              }}
            />

            {/* my gems */}
            <div className="chunk-sm mt-6 bg-[#0B0B0C] p-4 sm:p-5" style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 className="pixel-h text-xs sm:text-sm">MY GEMS</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--dim)]">
                    Gems from the dives you submitted on this device. They
                    are counted here, under your name.
                  </p>
                </div>
                <div className="flex gap-6 font-mono">
                  <div>
                    <span className="block text-[10px] tracking-[0.2em] text-[var(--dim)]">SAVED GEMS</span>
                    <span className="mt-1 block text-2xl font-bold text-[#FF8A3D]">{gemsTotal}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] tracking-[0.2em] text-[var(--dim)]">BEST SCORE</span>
                    <span className="mt-1 block text-2xl font-bold">{bestScore}</span>
                  </div>
                </div>
              </div>
              <div className="core-line mt-4 h-0.5 w-full opacity-70" aria-hidden="true" />
              <p className="mt-4 text-sm leading-relaxed text-[var(--dim)]">
                <strong className="text-[var(--text)]">Gems → token, later.</strong>{" "}
                The plan: when the Kryntar token launches, saved gems will be
                exchangeable for the token. The token is{" "}
                <strong className="text-[var(--text)]">not launched yet</strong>, the
                swap is <strong className="text-[var(--text)]">not active</strong>,
                and no exchange rate is set. For now: dive, collect, save.
              </p>
            </div>
          </div>
        </section>

        <LeaderboardSection name={playerName} wallet={playerWallet} />

        {/* -------------------------------- world ------------------------------ */}
        <section id="world" className="scroll-mt-24 pt-20">
          <SectionHead
            kicker="The World"
            title="WORLD OF KRYNTAR"
            intro="Kryntar is the deep ground under the world, where Kryn forms. Nothing forms fast down there: pressure and time do all the work. The ground is split into four layers, and each layer pays more than the one above it."
          />
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {LAYERS.map((l) => (
              <article key={l.name} className="chunk p-5" style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="pixel-h text-sm">{l.name}</h3>
                  <span className="font-mono text-lg font-bold text-[#FF8A3D]">{l.mult}</span>
                </div>
                <p className="mt-2 font-mono text-xs tracking-[0.15em] text-[var(--dim)]">
                  DEPTH {l.band}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--dim)]">{l.line}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 max-w-3xl leading-relaxed text-[var(--dim)]">
            That is the whole idea of Kryntar:{" "}
            <strong className="text-[var(--text)]">
              the surface is free, the depth is earned.
            </strong>{" "}
            Anyone can pick up a pale gem near the top. The good gems sit under
            real pressure, and only divers who stay down long enough reach them.
          </p>
        </section>

        {/* ----------------------------- collection ---------------------------- */}
        <section id="collection" className="scroll-mt-24 pt-20">
          <SectionHead
            kicker="The Collection"
            title="THE KRYN GEMS"
            intro="Four gem types live in Kryntar. Each card lists exactly what the gem is, where it is found, and what it scores in the game."
          />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {GEMS.map((g) => (
              <article
                key={g.id}
                className="chunk-sm flex flex-col items-center p-3 text-center sm:p-4"
                style={
                  {
                    borderColor: g.accent,
                    "--chunk-shadow": g.accent,
                    boxShadow:
                      g.type === "LEGENDARY"
                        ? "4px 4px 0 #FFC46B, 0 0 22px rgba(255, 196, 107, 0.35)"
                        : undefined,
                  } as CSSProperties
                }
              >
                <img
                  src={g.img}
                  alt={g.alt}
                  className="pixelated aspect-square w-full border-2 border-black bg-black object-cover"
                  style={{ filter: `drop-shadow(0 0 12px ${g.accent}59)` }}
                />
                <p className="mt-3 font-mono text-[10px] tracking-[0.2em]" style={{ color: g.accent }}>
                  {g.id} · {g.type}
                  {g.type === "LEGENDARY" ? " ★" : ""}
                </p>
                <h3 className="pixel-h mt-1.5 text-[11px] sm:text-xs">{g.name}</h3>
                <p className="mt-2 inline-block border-2 border-black bg-[#14120F] px-2 py-1 font-mono text-[10px] tracking-[0.15em] text-[var(--dim)]">
                  POWER <span className="text-sm font-bold text-[#FF8A3D]">{g.power}</span>
                </p>
                <div className="mt-2.5 flex flex-wrap justify-center gap-1">
                  <span className="border border-[#2A2721] bg-[#14120F] px-1.5 py-0.5 font-mono text-[10px] font-bold">
                    ▼ {g.found}
                  </span>
                  <span className="border border-[#2A2721] bg-[#14120F] px-1.5 py-0.5 font-mono text-[10px] font-bold">
                    {g.score}
                  </span>
                  <span className="border border-[#2A2721] bg-[#14120F] px-1.5 py-0.5 font-mono text-[10px] font-bold">
                    {g.drop} drops
                  </span>
                </div>
                <p className="mt-2.5 text-[11px] leading-snug text-[var(--dim)]">{g.line}</p>
              </article>
            ))}
          </div>

          <h3 className="pixel-h mt-10 text-sm sm:text-base">HOW RARE IS EACH GEM?</h3>
          <div
            className="chunk-sm mt-5 flex h-12 w-full overflow-hidden sm:h-14"
            role="img"
            aria-label="Drop-rate share of all gems: Pale about 45 percent, Cracked about 27 percent, Ember about 18 percent, Heart about 10 percent"
          >
            {RARITY.map((r) => (
              <div
                key={r.name}
                className="flex min-w-0 flex-col items-center justify-center px-1"
                style={{ width: `${r.pctNum}%`, background: r.color }}
              >
                <span className="hidden font-mono text-[10px] font-bold tracking-[0.1em] text-black sm:block">
                  {r.name}
                </span>
                <span className="font-mono text-xs font-bold text-black sm:text-sm">{r.pct}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {RARITY.map((r) => (
              <span key={r.name} className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--dim)]">
                <span className="inline-block h-2.5 w-2.5 shrink-0" style={{ background: r.color }} aria-hidden="true" />
                <span className="font-bold text-[var(--text)]">{r.name}</span> {r.count} · {r.pct}
              </span>
            ))}
          </div>
          <p className="mt-3 font-mono text-xs text-[var(--dim)]">
            Drop rates are the game's spawn odds. Heart Kryn only spawns at 900 m or deeper.
          </p>
        </section>

        {/* ------------------------------- divers ------------------------------ */}
        <section id="divers" className="scroll-mt-24 pt-20">
          <SectionHead
            kicker="The NFT Collection"
            title="KRYNTAR DIVERS — 2,222"
            intro="2,222 unique pixel divers, each drawn one by one — no two alike. Every diver carries a rarity tier and a Max Depth, and both are official traits in the collection metadata. Holders will dive in Deep Dive as their own minted diver."
          />

          <h3 className="pixel-h mt-10 text-sm sm:text-base">RARITY — HOW THE 2,222 SPLIT</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DIVER_TIERS.map((t) => (
              <article
                key={t.name}
                className="p-4"
                style={{
                  border: `3px solid ${t.frame}`,
                  boxShadow: `6px 6px 0 ${t.shadow}${t.glow ? `, ${t.glow}` : ""}`,
                  background: "var(--surface)",
                }}
              >
                <span className="block h-3 w-3" style={{ background: t.color }} aria-hidden="true" />
                <h4 className="pixel-h mt-3 text-xs">{t.name}</h4>
                <p className="mt-3 font-mono text-2xl font-bold">{t.count}</p>
                <p className="mt-1 font-mono text-xs text-[var(--dim)]">{t.pct} of 2,222 divers</p>
                <p className="mt-3 border-t-2 border-[#201E1A] pt-3 font-mono text-xs text-[var(--dim)]">
                  MAX DEPTH <span className="font-bold text-[var(--text)]">{t.maxDepth}</span>
                </p>
              </article>
            ))}
          </div>

          <h3 className="pixel-h mt-10 text-sm sm:text-base">THE LEGENDARY FOUR</h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--dim)]">
            Only four masters are shown here — the Legendary ones. Each wears
            the lit crystal frame with a crown, and each dives to the full
            1,200 m. The rarest tier of the collection: 111 of 2,222.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {DIVER_MASTERS.map((m) => {
              const tier = DIVER_TIERS.find((t) => t.name === m.tier) ?? DIVER_TIERS[0]!;
              return (
                <article
                  key={m.name}
                  className="p-4"
                  style={{
                    border: `3px solid ${tier.frame}`,
                    boxShadow: `6px 6px 0 ${tier.shadow}${tier.glow ? `, ${tier.glow}` : ""}`,
                    background: "var(--surface)",
                  }}
                >
                  {m.tier === "LEGENDARY" && (
                    <div className="mb-3 flex items-end gap-1" aria-hidden="true">
                      {[10, 18, 26, 18, 10].map((hgt, i) => (
                        <span key={i} className="block w-full" style={{ height: hgt, background: "#FFC46B" }} />
                      ))}
                    </div>
                  )}
                  <img
                    src={m.img}
                    alt={m.alt}
                    className="pixelated block aspect-square w-full border-2 border-black object-cover"
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span
                      className="px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#070708]"
                      style={{ background: tier.color }}
                    >
                      {tier.name}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--dim)]">
                      Max Depth {tier.maxDepth}
                    </span>
                    <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--dim)]">
                      Master #{m.no}
                    </span>
                  </div>
                  <h4 className="pixel-h mt-3 text-sm">{m.name}</h4>
                  <dl className="mt-3 border-t-2 border-[#201E1A]">
                    {[
                      ["Character", m.name],
                      ["Rarity", `${tier.name} · ${tier.count} of 2,222`],
                      ["Max Depth", tier.maxDepth],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-baseline justify-between gap-4 border-b border-dashed border-[#201E1A] py-2"
                      >
                        <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--dim)]">{k}</dt>
                        <dd className="text-right font-mono text-xs font-bold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--dim)]">{m.line}</p>
                </article>
              );
            })}
          </div>
          <p className="mt-6 max-w-3xl font-mono text-xs leading-relaxed text-[var(--dim)]">
            Design showcase. The contract for the full 2,222 collection is
            live on BNB Chain — its address is in the Mint section below,
            and the mint is open: all three lanes are live. Rarity and Max
            Depth ship as official metadata traits on every token, and a
            connected holder's diver becomes the character they play in
            Deep Dive. These four Legendaries are minted only through the
            Legendary Mint — 0.01 BNB, guaranteed — in the Mint section
            below.
          </p>
        </section>

        {/* -------------------------------- mint ------------------------------- */}
        <section id="mint" className="scroll-mt-24 pt-20">
          <SectionHead
            kicker="The Mint"
            title="THREE LANES. ALL OPEN ON DAY ONE."
            intro="The Kryntar NFT mint runs on BNB Chain with three lanes side by side from the first block. No lane is ever locked behind another — and only one lane gives you a Legendary."
          />
          <MintSection />
          <h3 className="pixel-h mt-10 text-sm sm:text-base">MINT WITH AN AGENT</h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--dim)]">
            Pick a lane, copy the prompt, paste it to your agent. Every prompt
            names the live contract address; the mint is open, so the agent
            executes right away (it still stops if mintOpen() ever reads false).
          </p>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <PromptCard title="SURFACE CLAIM" price="0 BNB" text={AGENT_PROMPT_FREE} />
            <PromptCard title="DEEP FORGE" price="0.0005 BNB" text={AGENT_PROMPT_DEEP} />
            <PromptCard title="LEGENDARY MINT" price="0.01 BNB" text={AGENT_PROMPT_LEGENDARY} />
          </div>
        </section>

        {/* --------------------------------- faq ------------------------------- */}
        <section id="faq" className="scroll-mt-24 pt-20">
          <SectionHead kicker="FAQ" title="QUESTIONS, ANSWERED SHORT" />
          <div className="mt-8 border-t-[3px] border-black">
            {FAQS.map((f) => (
              <details key={f.q} className="group border-b-2 border-[#201E1A]">
                <summary className="cursor-pointer py-5 font-mono text-base font-bold">
                  {f.q}
                </summary>
                <p className="max-w-3xl pb-6 leading-relaxed text-[var(--dim)]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="pt-20 text-center">
          <GemMark className="mx-auto h-9 w-7" />
          <p className="pixel-h mt-4 text-xs">
            KRYN<span className="core-text">TAR</span>
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-[var(--dim)]">
            The surface is free. The depth is earned. Dive safe.
          </p>
          <div className="core-line mx-auto mt-6 h-0.5 w-40 opacity-60" aria-hidden="true" />
        </footer>
      </main>
    </div>
  );
}

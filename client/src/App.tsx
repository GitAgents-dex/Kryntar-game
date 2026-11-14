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
  type GemKind,
  type PlayAccess,
  type RunResult,
  type StartVerdict,
} from "./game";
import {
  loadProgress,
  MISSIONS,
  missionProgress,
  recordRun,
  type ProgressSnapshot,
} from "./progress";

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
  standardIdAt: "0xe2623512",
  legendaryIdAt: "0x351e92d2",
  ownerOf: "0x6352211e",
  hasAgentId: "0x4eab3ef2",
};

/** Kryntar Scores — the on-chain Deep Dive leaderboard (holders only).
 *  Empty until the contract is deployed; set to the deployed address and
 *  the scores board + on-chain submit below switch on. Never put a fake
 *  address here. */
const SCOREBOARD_ADDRESS: string = "0xb3C30e21ff0515E50711e2603453a2eE8255bA16";

/** Function selectors of the KryntarScores contract (see
 *  contract/KryntarScores.sol). balanceOf is the NFT contract's. */
const SCORE_SELECTORS = {
  submitScore: "0x036e2294",
  playerCount: "0x302bcc57",
  playerAt: "0x8f828470",
  entryOf: "0x58bb388a",
  isPlayer: "0x09c95e10",
  nft: "0x47ccca02",
  submitFee: "0x3bb45586",
  balanceOf: "0x70a08231",
};

const STANDARD_POOL_SIZE = 2111;

/** $KRYN — the Kryntar token — and its holder-claim contract, both live
 *  on BNB Chain (chainId 56). Never put a fake address here. */
const KRYN_TOKEN_ADDRESS = "0x651a15460F62dF9d9B77ea0324fc948F6b94b5fA";
const KRYN_CLAIM_ADDRESS = "0xF423486D0B021E457c0132b3144728DEa105f028";

/** Function selectors of the KrynClaim contract (see
 *  contract/KrynClaim.sol). balanceOf is the token contract's. */
const CLAIM_SELECTORS = {
  claim: "0x379607f5",
  claimed: "0xdbe7e3bd",
  claimedCount: "0xc08fa1a4",
  reward: "0xcab34c08",
  claimFee: "0xe41e4fc6",
  balanceOf: "0x70a08231",
};
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

/* ================= board data (on-chain) — start ================= */
/* The board reads holdings straight from BNB Chain: no server, and no
 * event logs (the public BSC endpoints reject eth_getLogs). Minting is
 * sequential from fixed pools, so the minted IDs are exactly
 * standardIdAt(0..S-1) and legendaryIdAt(0..L-1); one batched multicall
 * reads every ID, a second reads every current owner. */

const MULTICALL_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
const MULTICALL_CHUNK = 250;

type BoardHolder = {
  wallet: string;
  held: number;
  legendaryHeld: number;
  /** Earliest mint in pool order (standard-pool index, legendary-pool
   *  indices offset by 100000: cross-pool mint order is not observable
   *  without event logs, so the standard pool orders first by convention). */
  firstMint: number;
};

type BoardData = {
  holders: BoardHolder[];
  totalHolders: number;
  totalMinted: number;
  legendaryMinted: number;
  updatedAt: string;
};

function padHex(value: bigint, bytes: number): string {
  return value.toString(16).padStart(bytes * 2, "0");
}

function encodeUintCall(selector: string, value: number): string {
  return selector + padHex(BigInt(value), 32);
}

/** ABI-encode Multicall3.aggregate((address,bytes)[]). */
function encodeAggregate(calls: { to: string; data: string }[]): string {
  const head = "0x252dba42" + padHex(32n, 32) + padHex(BigInt(calls.length), 32);
  let offsets = "";
  let tuples = "";
  // Tuple offsets are relative to the start of the array's elements (just
  // after the length word): the first tuple starts after all offset words.
  let cursor = calls.length * 32;
  for (const c of calls) {
    offsets += padHex(BigInt(cursor), 32);
    const dataHex = c.data.startsWith("0x") ? c.data.slice(2) : c.data;
    const addrHex = c.to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
    const dataLen = dataHex.length / 2;
    const paddedLen = Math.ceil(dataLen / 32) * 32;
    const tuple =
      addrHex + padHex(64n, 32) + padHex(BigInt(dataLen), 32) + dataHex.padEnd(paddedLen * 2, "0");
    tuples += tuple;
    cursor += tuple.length / 2;
  }
  return head + offsets + tuples;
}

function readU256(hex: string, bytePos: number): bigint {
  const s = hex.slice(bytePos * 2, bytePos * 2 + 64);
  return s ? BigInt("0x" + s) : 0n;
}

type MulticallResult = string;

/** Decode Multicall3.aggregate's (uint256, bytes[]) return data. A failing
 *  subcall reverts the whole batch, so there are no per-call success flags;
 *  our subcalls (pool ids, owners of minted ids) cannot fail. */
function decodeAggregate(hex: string): MulticallResult[] {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const arrOff = Number(readU256(h, 32));
  const len = Number(readU256(h, arrOff));
  const out: MulticallResult[] = [];
  for (let i = 0; i < len; i++) {
    const elemOff = Number(readU256(h, arrOff + 32 + i * 32));
    // Element offsets are relative to the start of the array's elements
    // (just after the length word), not to the length word itself.
    const elemPos = arrOff + 32 + elemOff;
    const bytesLen = Number(readU256(h, elemPos));
    const data = "0x" + h.slice((elemPos + 32) * 2, (elemPos + 32 + bytesLen) * 2);
    out.push(data);
  }
  return out;
}

/** Read-only eth_call to any address, first responding RPC wins. */
async function ethCallTo(to: string, data: string): Promise<string> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [{ to, data }, "latest"],
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

/** Read an address's BNB balance, first responding RPC wins. */
async function ethGetBalance(address: string): Promise<bigint> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getBalance",
    params: [address, "latest"],
  });
  const hex = await firstSuccess(
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
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}

/** Format wei as BNB with up to 4 decimals (0.0001, 0.0123, 1.5). */
function formatBnb(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n)
    .toString()
    .padStart(18, "0")
    .slice(0, 4)
    .replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

/** Run calls through Multicall3 in parallel chunks, in call order. */
async function multicall(calls: { to: string; data: string }[]): Promise<MulticallResult[]> {
  if (calls.length === 0) return [];
  const chunks: { to: string; data: string }[][] = [];
  for (let i = 0; i < calls.length; i += MULTICALL_CHUNK) {
    chunks.push(calls.slice(i, i + MULTICALL_CHUNK));
  }
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const raw = await ethCallTo(MULTICALL_ADDRESS, encodeAggregate(chunk));
      const decoded = decodeAggregate(raw);
      if (decoded.length !== chunk.length) throw new Error("multicall result length mismatch");
      return decoded;
    }),
  );
  return results.flat();
}

/** Read the full holder ranking from the chain. Two batched passes:
 *  minted IDs in pool order, then the current owner of every ID. */
async function fetchBoardData(): Promise<BoardData> {
  const [standardHex, legendaryHex] = await Promise.all([
    ethCall(SELECTORS.standardMinted),
    ethCall(SELECTORS.legendaryMinted),
  ]);
  const standardCount = decodeUint(standardHex);
  const legendaryCount = decodeUint(legendaryHex);

  const idCalls: { to: string; data: string }[] = [];
  for (let i = 0; i < standardCount; i++) {
    idCalls.push({ to: CONTRACT_ADDRESS, data: encodeUintCall(SELECTORS.standardIdAt, i) });
  }
  for (let i = 0; i < legendaryCount; i++) {
    idCalls.push({ to: CONTRACT_ADDRESS, data: encodeUintCall(SELECTORS.legendaryIdAt, i) });
  }
  const idResults = await multicall(idCalls);
  const ids: { id: number; legendary: boolean; order: number }[] = [];
  idResults.forEach((data, i) => {
    const legendary = i >= standardCount;
    ids.push({
      id: Number(BigInt(data)),
      legendary,
      order: legendary ? 100000 + (i - standardCount) : i,
    });
  });

  const ownerResults = await multicall(
    ids.map(({ id }) => ({ to: CONTRACT_ADDRESS, data: encodeUintCall(SELECTORS.ownerOf, id) })),
  );
  const byWallet = new Map<string, BoardHolder>();
  ownerResults.forEach((data, i) => {
    const entry = ids[i];
    if (!entry) throw new Error("multicall owner read failed");
    const wallet = ("0x" + data.slice(-40)).toLowerCase();
    if (wallet === "0x0000000000000000000000000000000000000000") {
      throw new Error("unminted id in board read");
    }
    const cur = byWallet.get(wallet) ?? {
      wallet,
      held: 0,
      legendaryHeld: 0,
      firstMint: Number.POSITIVE_INFINITY,
    };
    cur.held += 1;
    if (entry.legendary) cur.legendaryHeld += 1;
    if (entry.order < cur.firstMint) cur.firstMint = entry.order;
    byWallet.set(wallet, cur);
  });

  const holders = [...byWallet.values()].sort(
    (a, b) =>
      b.held - a.held ||
      b.legendaryHeld - a.legendaryHeld ||
      a.firstMint - b.firstMint ||
      (a.wallet < b.wallet ? -1 : a.wallet > b.wallet ? 1 : 0),
  );
  return {
    holders,
    totalHolders: holders.length,
    totalMinted: standardCount + legendaryCount,
    legendaryMinted: legendaryCount,
    updatedAt: new Date().toISOString(),
  };
}

/* ================= board data (on-chain) — end ================= */

/* ------------------------ scores board (on-chain) ------------------------ */

type ScoreEntry = {
  wallet: string;
  name: string;
  score: number;
  depth: number;
  gems: number;
  updatedAt: number;
};

type ScoresData = {
  entries: ScoreEntry[];
  totalPlayers: number;
  /** Submit fees accumulated in the scores contract (wei). */
  collectedWei: bigint;
  updatedAt: string;
};

/** Decode KryntarScores.entryOf's (string, uint256, uint256, uint256,
 *  uint256) return data. */
function decodeScoreEntry(hex: string): {
  name: string;
  score: number;
  depth: number;
  gems: number;
  updatedAt: number;
} {
  const empty = { name: "", score: 0, depth: 0, gems: 0, updatedAt: 0 };
  try {
    const h = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (h.length < 320) return empty;
    const strOff = Number(readU256(h, 0));
    const strLen = Number(readU256(h, strOff));
    const strHex = h.slice((strOff + 32) * 2, (strOff + 32 + strLen) * 2);
    const bytes = new Uint8Array(strHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(strHex.slice(i * 2, i * 2 + 2), 16);
    }
    let name = "";
    try {
      name = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      name = "";
    }
    return {
      name,
      score: Number(readU256(h, 32)),
      depth: Number(readU256(h, 64)),
      gems: Number(readU256(h, 96)),
      updatedAt: Number(readU256(h, 128)),
    };
  } catch {
    return empty;
  }
}

/** Read the full scores ranking from the KryntarScores contract. Two
 *  batched passes: player wallets in submission order, then every
 *  player's best entry. */
async function fetchScoresData(): Promise<ScoresData> {
  if (!SCOREBOARD_ADDRESS) throw new Error("scoreboard not deployed");
  const [countHex, collectedWei] = await Promise.all([
    ethCallTo(SCOREBOARD_ADDRESS, SCORE_SELECTORS.playerCount),
    ethGetBalance(SCOREBOARD_ADDRESS),
  ]);
  const count = decodeUint(countHex);
  const playerResults = await multicall(
    Array.from({ length: count }, (_, i) => ({
      to: SCOREBOARD_ADDRESS,
      data: encodeUintCall(SCORE_SELECTORS.playerAt, i),
    })),
  );
  const wallets = playerResults.map((data) => ("0x" + data.slice(-40)).toLowerCase());
  const entryResults = await multicall(
    wallets.map((w) => ({
      to: SCOREBOARD_ADDRESS,
      data: encodeAddressArg(SCORE_SELECTORS.entryOf, w),
    })),
  );
  const entries: ScoreEntry[] = wallets.map((wallet, i) => ({
    wallet,
    ...decodeScoreEntry(entryResults[i] ?? "0x"),
  }));
  entries.sort(
    (a, b) =>
      b.score - a.score ||
      a.updatedAt - b.updatedAt ||
      (a.wallet < b.wallet ? -1 : a.wallet > b.wallet ? 1 : 0),
  );
  return {
    entries,
    totalPlayers: count,
    collectedWei,
    updatedAt: new Date().toISOString(),
  };
}

/** ABI-encode submitScore(string,uint256,uint256,uint256). The string
 *  argument is dynamic: the head carries its offset (128), the tail
 *  carries length + padded bytes. */
function encodeSubmitScore(
  name: string,
  score: number,
  depth: number,
  gems: number,
): string {
  const nameBytes = new TextEncoder().encode(name);
  const dataHex = Array.from(nameBytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const paddedLen = Math.ceil(nameBytes.length / 32) * 32;
  return (
    SCORE_SELECTORS.submitScore +
    padHex(128n, 32) +
    padHex(BigInt(score), 32) +
    padHex(BigInt(depth), 32) +
    padHex(BigInt(gems), 32) +
    padHex(BigInt(nameBytes.length), 32) +
    dataHex.padEnd(paddedLen * 2, "0")
  );
}

/* ------------------------ $KRYN holder claim ------------------------- */

type ClaimInfo = {
  /** $KRYN per Diver, in token base units (18 decimals). */
  reward: bigint;
  /** Exact claim fee in wei. */
  fee: bigint;
  claimedCount: number;
  /** $KRYN left in the claim contract, in token base units. */
  pool: bigint;
  updatedAt: string;
};

/** Format a token amount with 18 decimals as whole $KRYN with commas
 *  (rewards and pools are whole $KRYN). */
function formatKryn(amount: bigint): string {
  return (amount / 10n ** 18n).toLocaleString("en-US");
}

/** Read the live claim numbers from the chain: reward, fee, how many
 *  Divers already claimed, and what is left in the claim pool. */
async function fetchClaimInfo(): Promise<ClaimInfo> {
  const [rewardHex, feeHex, countHex, poolHex] = await Promise.all([
    ethCallTo(KRYN_CLAIM_ADDRESS, CLAIM_SELECTORS.reward),
    ethCallTo(KRYN_CLAIM_ADDRESS, CLAIM_SELECTORS.claimFee),
    ethCallTo(KRYN_CLAIM_ADDRESS, CLAIM_SELECTORS.claimedCount),
    ethCallTo(
      KRYN_TOKEN_ADDRESS,
      encodeAddressArg(CLAIM_SELECTORS.balanceOf, KRYN_CLAIM_ADDRESS),
    ),
  ]);
  return {
    reward: BigInt(rewardHex),
    fee: BigInt(feeHex),
    claimedCount: decodeUint(countHex),
    pool: BigInt(poolHex),
    updatedAt: new Date().toISOString(),
  };
}

type OwnedDiver = { id: number; legendary: boolean; claimed: boolean };

/** Find every Diver the wallet holds, with its claim state. Mirrors the
 *  holder board's enumeration: minted IDs in pool order, then the
 *  current owner of every ID, then one claimed() read per owned ID. */
async function fetchOwnedDivers(wallet: string): Promise<OwnedDiver[]> {
  const [standardHex, legendaryHex] = await Promise.all([
    ethCall(SELECTORS.standardMinted),
    ethCall(SELECTORS.legendaryMinted),
  ]);
  const standardCount = decodeUint(standardHex);
  const legendaryCount = decodeUint(legendaryHex);

  const idCalls: { to: string; data: string }[] = [];
  for (let i = 0; i < standardCount; i++) {
    idCalls.push({ to: CONTRACT_ADDRESS, data: encodeUintCall(SELECTORS.standardIdAt, i) });
  }
  for (let i = 0; i < legendaryCount; i++) {
    idCalls.push({ to: CONTRACT_ADDRESS, data: encodeUintCall(SELECTORS.legendaryIdAt, i) });
  }
  const idResults = await multicall(idCalls);
  const ids: { id: number; legendary: boolean }[] = [];
  idResults.forEach((data, i) => {
    ids.push({ id: Number(BigInt(data)), legendary: i >= standardCount });
  });

  const ownerResults = await multicall(
    ids.map(({ id }) => ({ to: CONTRACT_ADDRESS, data: encodeUintCall(SELECTORS.ownerOf, id) })),
  );
  const mine = wallet.toLowerCase();
  const owned: { id: number; legendary: boolean }[] = [];
  ownerResults.forEach((data, i) => {
    const entry = ids[i];
    if (entry && ("0x" + data.slice(-40)).toLowerCase() === mine) {
      owned.push(entry);
    }
  });

  const claimedResults = await multicall(
    owned.map(({ id }) => ({
      to: KRYN_CLAIM_ADDRESS,
      data: encodeUintCall(CLAIM_SELECTORS.claimed, id),
    })),
  );
  return owned.map((o, i) => ({
    ...o,
    claimed: decodeBool(claimedResults[i] ?? "0x"),
  }));
}

/** Turn a wallet/contract failure into one plain sentence for the claimer. */
function friendlyClaimError(err: unknown, id: number): string {
  const msg = errorMessage(err).toLowerCase();
  if (
    errorCode(err) === 4001 ||
    msg.includes("user rejected") ||
    msg.includes("user denied")
  ) {
    return "You rejected the transaction in your wallet — nothing was claimed.";
  }
  if (msg.includes("alreadyclaimed") || msg.includes("already claimed")) {
    return `Diver #${id} already claimed its $KRYN — one claim per NFT.`;
  }
  if (msg.includes("notholder") || msg.includes("not holder")) {
    return `This wallet no longer holds Diver #${id} — only the current holder can claim.`;
  }
  if (msg.includes("incorrectfee") || msg.includes("exact fee")) {
    return "The claim costs exactly the fee shown above — the contract rejected the amount.";
  }
  if (msg.includes("insufficient funds")) {
    return "Not enough BNB in this wallet to cover the claim fee plus gas.";
  }
  return "The transaction failed — nothing was claimed. Check your wallet and try again.";
}

/** Simple direct-execute agent prompt for claiming one Diver's $KRYN.
 *  No domain names, ever. The fee is the live value read from the
 *  contract at copy time. */
function claimPromptFor(id: number, feeWei: bigint): string {
  return `Claim $KRYN for Diver #${id} on BNB Chain (chainId 56). Claim contract: ${KRYN_CLAIM_ADDRESS}.\nCheck claimed(${id}) is false and this wallet holds Diver #${id}. If already claimed or not held, STOP and report to me.\nCall claim(${id}) and pay exactly ${feeWei.toString()} wei.\nExecute once, then send me the transaction hash.`;
}

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
    a: "Press START DIVE. You get 60 seconds and 3 oxygen. Drag on the arena or use the arrow keys / A and D to move; SHIFT or the DASH button gives you a quick burst. Grab the gems rising past you and the air bubbles that refill oxygen; dodge the falling rocks and the jellyfish. The deeper you go, the darker the water, the faster oxygen drains — and the more every gem is worth. Mid-dive events — GEM RUSH, JELLY SWARM, BUBBLE SURGE — change the odds for a few seconds. On this page the game runs in local mode: unlimited practice dives, with gems, scores and missions saved on your device.",
  },
  {
    q: "How many times can I play?",
    a: "It depends on your tier. Legendary NFT holders play unlimited. Free-NFT holders get 3 plays per day. Guests without an NFT get 1 practice play per day. Plays are counted on the server under your name (plus wallet, if you give one) and reset every day at 00:00 UTC.",
  },
  {
    q: "What is the leaderboard?",
    a: "A board that runs on-chain, not on a server. It reads every Divers NFT straight from BNB Chain and ranks wallets by how many Divers they hold — Legendary held, then earliest mint, break ties. The top 20 are shown, and your own wallet is pinned below if it ranks lower. It refreshes every 60 seconds, and there are no prizes: honor and bragging rights only.",
  },
  {
    q: "What is the scores board?",
    a: "A second on-chain board, next to the holders board: player names and best Deep Dive scores, saved on BNB Chain by the players themselves. Only wallets holding a Kryntar Diver can save a score — finish a dive, then save it on-chain from the panel after the game (wallet + the 0.0001 BNB submit fee). Only your best score is kept, and the name you save is the name shown. The fee stays in the scores contract for the owner to withdraw.",
  },
  {
    q: "Why can't guests submit scores?",
    a: "On the server board, submitting is a holder perk: guests can practice once a day to learn the dive, but their scores stay off that board. Free-NFT holders submit every dive; legendary holders submit without limits. The on-chain scores board is different — it checks your wallet, not your tier: if you hold a Kryntar Diver, you can save any dive on-chain from the panel after the game, whatever tier you picked.",
  },
  {
    q: "What are the Kryntar Divers?",
    a: `The Kryntar Divers are the NFT collection: 2,222 unique pixel diver characters in four rarity tiers — Common 1,111 (50%), Rare 667 (30%), Epic 333 (15%), Legendary 111 (5%). Every token carries two official traits: Rarity and Max Depth (300 m / 600 m / 900 m / 1,200 m). The contract is live on BNB Chain at ${CONTRACT_ADDRESS}; the 4 Legendary master cards on this page are a design showcase of the final masters.`,
  },
  {
    q: "Can I swap my gems for the token now?",
    a: "No — gems saved on this device cannot be swapped. They are local and unverifiable. The $KRYN token is live: every Diver holder claims a fixed $KRYN reward per NFT, once, from the Claim section (a small BNB fee applies, read live from the contract). On-chain scores are planned to earn from seasonal reward pools later.",
  },
  {
    q: "Is there a prize pool?",
    a: "No. There is no prize pool and no money prizes. The leaderboard is a record of honor — you dive for gems, depth, and your place on the board.",
  },
  {
    q: "Do I need a wallet to play?",
    a: "No. Anyone can dive — guests get one practice play a day with just a name. The wallet field is optional; plays and scores are counted under your name plus wallet when you give one, so use the same pair every time. Saving a score on-chain is the one thing that needs a wallet — one that holds a Diver.",
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

/** Local mode has no server, so plays are unlimited practice runs that
 *  cannot be submitted anywhere — the access object says exactly that. */
const LOCAL_ACCESS: PlayAccess = {
  playsLeft: null,
  playsLimit: null,
  canSubmit: false,
  resetsAt: "",
};



function xPostUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}



/* ------------------------- on-chain score submit ------------------------- */

type ChainSubmitStatus =
  | { status: "idle" }
  | { status: "busy"; message: string }
  | { status: "error"; message: string }
  | { status: "sent"; txHash: string };

function friendlyScoreError(err: unknown): string {
  const msg = errorMessage(err).toLowerCase();
  if (
    errorCode(err) === 4001 ||
    msg.includes("user rejected") ||
    msg.includes("user denied")
  ) {
    return "You rejected the transaction in your wallet — nothing was saved.";
  }
  if (msg.includes("hold a kryntar diver")) {
    return "This wallet holds no Kryntar Diver — on-chain scores are holders only.";
  }
  if (msg.includes("exact fee")) {
    return "The save costs exactly 0.0001 BNB — the contract rejected the amount.";
  }
  if (msg.includes("name 1-24")) {
    return "Diver name must be 1–24 bytes.";
  }
  if (msg.includes("insufficient funds")) {
    return "Not enough BNB in this wallet to cover gas.";
  }
  return "The transaction failed — nothing was saved. Check your wallet and try again.";
}

/** Save this dive's score on the KryntarScores contract. Only rendered
 *  when the scoreboard is deployed. The contract keeps each wallet's
 *  best score; the gate is the real holder check, not the access-panel
 *  tier, so guests holding a Diver can submit too. */
function OnChainSubmit({ run, name }: { run: RunResult; name: string }) {
  const [st, setSt] = useState<ChainSubmitStatus>({ status: "idle" });

  const submit = async () => {
    const trimmed = name.trim();
    const byteLen = new TextEncoder().encode(trimmed).length;
    if (!trimmed) {
      setSt({
        status: "error",
        message: "Type your diver name first — it is saved on-chain with your score.",
      });
      return;
    }
    if (byteLen > 24) {
      setSt({
        status: "error",
        message: "Diver name is too long for the contract (max 24 bytes).",
      });
      return;
    }
    if (run.score <= 0) {
      setSt({ status: "error", message: "A score of 0 cannot be saved." });
      return;
    }
    const eth = getEthereum();
    if (!eth) {
      setSt({
        status: "error",
        message: "No wallet found. Open this page in a wallet app browser to save on-chain.",
      });
      return;
    }
    try {
      setSt({ status: "busy", message: "Connecting wallet…" });
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      const account = accounts[0];
      if (!account) throw new Error("No account returned by the wallet.");
      const chainId = (await eth.request({ method: "eth_chainId" })) as string;
      if (chainId !== "0x38") {
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x38" }],
          });
        } catch (switchErr) {
          if (errorCode(switchErr) === 4902) {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x38",
                  chainName: "BNB Chain",
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
      setSt({ status: "busy", message: "Checking holder status…" });
      const balHex = await ethCallTo(
        CONTRACT_ADDRESS,
        encodeAddressArg(SCORE_SELECTORS.balanceOf, account),
      );
      if (decodeUint(balHex) <= 0) {
        setSt({
          status: "error",
          message:
            "This wallet holds no Kryntar Diver — on-chain scores are holders only. Mint first, then submit.",
        });
        return;
      }
      setSt({ status: "busy", message: "Reading the submit fee…" });
      let feeHex: string;
      try {
        const feeRaw = await ethCallTo(
          SCOREBOARD_ADDRESS,
          SCORE_SELECTORS.submitFee,
        );
        feeHex = "0x" + BigInt(feeRaw).toString(16);
      } catch {
        setSt({
          status: "error",
          message:
            "Could not read the submit fee from the contract. Try again in a moment.",
        });
        return;
      }
      setSt({ status: "busy", message: "Confirm in your wallet…" });
      const data = encodeSubmitScore(trimmed, run.score, run.depth, run.gems);
      const hash = (await eth.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: SCOREBOARD_ADDRESS, data, value: feeHex }],
      })) as string;
      setSt({ status: "sent", txHash: hash });
    } catch (err) {
      setSt({ status: "error", message: friendlyScoreError(err) });
    }
  };

  return (
    <div
      className="chunk-sm mt-6 bg-[#0B0B0C] p-4 sm:p-5"
      style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}
    >
      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em]">
        Save score on-chain
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
        Your best score, your diver name, and this dive&apos;s depth and
        gems — saved forever on BNB Chain, visible to everyone on the
        scores board below. Only wallets holding a Kryntar Diver can save,
        and only your best score is kept. Each save costs 0.0001 BNB,
        kept in the scores contract, plus a little gas.
      </p>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={st.status === "busy" || st.status === "sent"}
        className="chunk-sm mt-4 bg-[#FF8A3D] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#070708] disabled:opacity-40"
        style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
      >
        {st.status === "busy"
          ? st.message
          : st.status === "sent"
            ? "Saved on-chain ✓"
            : "Save on-chain"}
      </button>
      {st.status === "error" && (
        <p role="alert" className="mt-3 font-mono text-xs text-[#FF8A3D]">
          {st.message}
        </p>
      )}
      {st.status === "sent" && (
        <p className="mt-3 font-mono text-xs text-[var(--dim)]">
          Transaction sent:{" "}
          <a
            className="break-all text-[#FF8A3D] underline"
            href={`https://bscscan.com/tx/${st.txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            {st.txHash}
          </a>{" "}
          — the scores board refreshes every 60 seconds.
        </p>
      )}
    </div>
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
  localMode,
}: {
  run: RunResult | null;
  name: string;
  wallet: string;
  tier: PlayerTier;
  onNameChange: (v: string) => void;
  onWalletChange: (v: string) => void;
  onSaved: (rank: number | null) => void;
  localMode: boolean;
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

  const onChain = SCOREBOARD_ADDRESS ? (
    <OnChainSubmit run={run} name={name} />
  ) : null;

  if (localMode) {
    return (
      <>
        <div
          className="chunk-sm mt-6 bg-[#0B0B0C] p-4 sm:p-5"
          style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
          role="status"
        >
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em]">
            Saved on this device
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
            You scored {run.score} and reached {run.depth} m — {run.gems}{" "}
            Kryn gems added to your gem bank below. There is no server on
            this page, so dives are saved on this device only.
            {SCOREBOARD_ADDRESS
              ? " Holders can also save this dive on-chain below — it lands on the public scores board."
              : ""}
          </p>
        </div>
        {onChain}
      </>
    );
  }

  if (tier === "guest") {
    return (
      <>
        <div
          className="chunk-sm mt-6 bg-[#0B0B0C] p-4 sm:p-5"
          style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
          role="status"
        >
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em]">
            Guest dive — practice only
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
            You scored {run.score} and reached {run.depth} m, but guest
            scores cannot be submitted to the leaderboard. Submitting is for
            Kryntar NFT holders: free-NFT holders submit every dive,
            legendary holders dive and submit without limits. If you hold
            one, pick your tier in the access panel above the game.
            {SCOREBOARD_ADDRESS
              ? " Or save this dive on-chain below — the contract checks your wallet, not the tier you picked."
              : ""}
          </p>
        </div>
        {onChain}
      </>
    );
  }

  return (
    <>
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
        gems land in My Gems below.
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
      {onChain}
    </>
  );
}

/* -------------------------------- missions ------------------------------- */

const BANK_KINDS: { id: GemKind; label: string; color: string }[] = [
  { id: "pale", label: "Pale Kryn", color: "#D8D2C4" },
  { id: "cracked", label: "Cracked Kryn", color: "#9B968B" },
  { id: "ember", label: "Ember Kryn", color: "#FF8A3D" },
  { id: "heart", label: "Heart Kryn", color: "#FFC46B" },
];

function MissionsPanel({
  progress,
  justCompleted,
}: {
  progress: ProgressSnapshot;
  justCompleted: string[];
}) {
  return (
    <div
      className="chunk-sm mt-6 bg-[#0B0B0C] p-4 sm:p-5"
      style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
    >
      <h3 className="pixel-h text-xs sm:text-sm">MISSIONS</h3>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--dim)]">
        Finish missions by diving. Progress is saved on this device only.
      </p>
      <ul className="mt-4 grid gap-3">
        {MISSIONS.map((m) => {
          const done = missionProgress(m, progress) >= m.target;
          const fresh = justCompleted.includes(m.id);
          const pct = Math.round(
            (missionProgress(m, progress) / m.target) * 100,
          );
          return (
            <li
              key={m.id}
              className={`border-2 px-3 py-2.5 ${
                fresh
                  ? "border-[#FFC46B] bg-[#241A08]"
                  : done
                    ? "border-[#3D382E] bg-[#171410]"
                    : "border-[#3D382E] bg-[var(--surface)]"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-xs font-bold tracking-[0.12em]">
                  {m.title}
                </span>
                <span className="font-mono text-[11px] text-[var(--dim)]">
                  {done ? (
                    <span className="font-bold text-[#FFC46B]">
                      {fresh ? "JUST COMPLETED ✓" : "DONE ✓"}
                    </span>
                  ) : (
                    `${missionProgress(m, progress)} / ${m.target}`
                  )}
                </span>
              </div>
              <span className="mt-1 block text-sm text-[var(--dim)]">{m.desc}</span>
              <span className="mt-2 block h-2 bg-[#262019]">
                <span
                  className="block h-full bg-[#FF8A3D]"
                  style={{ width: `${pct}%` }}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
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
  localMode,
}: {
  name: string;
  wallet: string;
  tier: PlayerTier;
  onNameChange: (v: string) => void;
  onWalletChange: (v: string) => void;
  onTierChange: (t: PlayerTier) => void;
  access: AccessData | null;
  accessLoading: boolean;
  localMode: boolean;
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
          {localMode
            ? "Local mode — unlimited practice"
            : accessLoading
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
        {localMode
          ? "Local mode: no server on this page, so plays are unlimited and counted on this device only. Your name and tier above are just your diver identity — nothing is verified against your wallet today."
          : "Plays are counted on the server per name + wallet and reset at 00:00 UTC. Honest note: holder status is self-declared for now. The Kryntar contract is live on BNB Chain, and on-chain holder verification is being connected — it is not active yet, so nothing is being verified against your wallet today."}
      </p>
    </div>
  );
}

/* ----------------------------- leaderboard ------------------------------- */

function BoardRow({
  holder,
  rank,
  isMine,
}: {
  holder: BoardHolder;
  rank: number;
  isMine: boolean;
}) {
  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${
        isMine ? "bg-[#241708]" : ""
      }`}
    >
      <span className="w-10 font-mono text-lg font-bold text-[#FF8A3D]">#{rank}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <a
            href={`https://bscscan.com/address/${holder.wallet}`}
            target="_blank"
            rel="noreferrer"
            className="break-all font-mono text-sm font-bold underline decoration-[#FF8A3D]/60 underline-offset-4"
          >
            {shortAddress(holder.wallet)}
          </a>
          {isMine && (
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#FFC46B]">
              You
            </span>
          )}
        </span>
        <span className="mt-1 block font-mono text-[11px] text-[var(--dim)]">
          {holder.legendaryHeld} Legendary · {holder.held - holder.legendaryHeld} Standard held
        </span>
      </span>
      <span className="font-mono text-xl font-bold">{holder.held}</span>
      {isMine && (
        <a
          href={xPostUrl(
            `I hold ${holder.held} Kryntar Divers — rank #${rank} on the on-chain board, ${holder.legendaryHeld} Legendary. #Kryntar`,
          )}
          target="_blank"
          rel="noreferrer"
          aria-label={`Post your rank ${rank} holding to X`}
          className="chunk-sm bg-[#E8E3D8] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#070708]"
          style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
        >
          Post to X
        </a>
      )}
    </li>
  );
}

function LeaderboardSection({ wallet }: { wallet: string }) {
  const board = useQuery({
    queryKey: ["board-onchain"],
    queryFn: fetchBoardData,
    refetchInterval: 60_000,
  });
  const data = board.data;
  const mineWallet = wallet.trim().toLowerCase();
  const mineRank =
    data && mineWallet ? data.holders.findIndex((h) => h.wallet === mineWallet) + 1 : 0;
  const mine = mineRank > 0 && data ? (data.holders[mineRank - 1] ?? null) : null;
  const mineInTop = mineRank > 0 && mineRank <= 20;

  return (
    <section id="board" className="scroll-mt-24 pt-20">
      <SectionHead
        kicker="Leaderboard"
        title="TOP DIVERS — ON-CHAIN"
        intro="The board, read straight from BNB Chain — no server, no sign-up. Every Divers NFT is public on-chain, so the ranking is just the truth: wallets ordered by Divers held, Legendary held breaking ties, then earliest mint. It refreshes every 60 s. Mint, and your wallet climbs. Honor and bragging rights only: there are no prizes."
      />
      <div className="chunk mt-8 p-2 sm:p-6" style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2 pt-2 sm:px-0 sm:pt-0">
          <p className="font-mono text-xs text-[var(--dim)]">
            {data
              ? `${data.totalHolders} ${data.totalHolders === 1 ? "holder" : "holders"} · ${data.totalMinted.toLocaleString("en-US")} minted / 2,222 · updated ${data.updatedAt.slice(11, 19)} UTC`
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

        {data && data.holders.length === 0 && (
          <p className="px-2 py-6 text-center font-mono text-sm text-[var(--dim)]" role="status">
            No Divers minted yet. Be the first name on the board — mint in the
            section above.
          </p>
        )}

        {data && data.holders.length > 0 && (
          <ol className="divide-y divide-[#201E1A] border-2 border-[#201E1A] bg-[#0B0B0C]">
            {data.holders.slice(0, 20).map((h, i) => (
              <BoardRow key={h.wallet} holder={h} rank={i + 1} isMine={mineRank === i + 1} />
            ))}
          </ol>
        )}

        {mine && !mineInTop && (
          <div className="mt-4">
            <p className="mb-2 px-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">
              Your wallet — outside the top 20
            </p>
            <ol className="border-2 border-[#C97B2D] bg-[#0B0B0C]">
              <BoardRow holder={mine} rank={mineRank} isMine />
            </ol>
          </div>
        )}

        {data && !mine && mineWallet && (
          <p className="mt-4 px-2 font-mono text-xs text-[var(--dim)]">
            No Divers held by “{wallet.trim()}” yet — mint in the section
            above to take your place on the board.
          </p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ scores board ----------------------------- */

function ScoreRow({
  entry,
  rank,
  isMine,
}: {
  entry: ScoreEntry;
  rank: number;
  isMine: boolean;
}) {
  return (
    <li className={isMine ? "bg-[#221C14]" : ""}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-3 sm:px-4">
        <span className="w-8 font-mono text-sm font-bold text-[#FFC46B]">
          #{rank}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">
            {entry.name || "—"}
          </span>
          <a
            className="font-mono text-xs text-[var(--dim)] underline hover:text-[var(--text)]"
            href={`https://bscscan.com/address/${entry.wallet}`}
            target="_blank"
            rel="noreferrer"
          >
            {shortAddress(entry.wallet)}
          </a>
        </span>
        <span className="text-right">
          <span className="block font-mono text-base font-bold">
            {entry.score.toLocaleString("en-US")}
          </span>
          <span className="block font-mono text-[11px] text-[var(--dim)]">
            {entry.depth.toLocaleString("en-US")} m · {entry.gems} gems
          </span>
        </span>
      </div>
    </li>
  );
}

function ScoresSection({ wallet }: { wallet: string }) {
  const scores = useQuery({
    queryKey: ["scores-onchain"],
    queryFn: fetchScoresData,
    refetchInterval: 60_000,
    enabled: SCOREBOARD_ADDRESS !== "",
  });
  const data = scores.data;
  const mineWallet = wallet.trim().toLowerCase();
  const mineRank =
    data && mineWallet
      ? data.entries.findIndex((e) => e.wallet === mineWallet) + 1
      : 0;
  const mine = mineRank > 0 && data ? (data.entries[mineRank - 1] ?? null) : null;
  const mineInTop = mineRank > 0 && mineRank <= 20;

  return (
    <section id="scores" className="scroll-mt-24 pt-20">
      <SectionHead
        kicker="Scores board"
        title="TOP SCORES — ON-CHAIN"
        intro="Player names and best scores, saved on BNB Chain by the divers themselves — no server, no sign-up. Only wallets holding a Kryntar Diver can save a score, and only each wallet's best is kept. Each save costs 0.0001 BNB, kept in the scores contract. Finish a dive, save it on-chain, and your name climbs. It refreshes every 60 s."
      />
      <div
        className="chunk mt-8 p-2 sm:p-6"
        style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}
      >
        {!SCOREBOARD_ADDRESS && (
          <p
            className="px-2 py-6 text-center font-mono text-sm text-[var(--dim)]"
            role="status"
          >
            The on-chain scores board is not deployed yet. Once it is live,
            holders will save their names and best scores here — this page
            will read them straight from BNB Chain.
          </p>
        )}

        {SCOREBOARD_ADDRESS && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2 pt-2 sm:px-0 sm:pt-0">
              <p className="font-mono text-xs text-[var(--dim)]">
                {data
                  ? `${data.totalPlayers} ${data.totalPlayers === 1 ? "player" : "players"} · ${formatBnb(data.collectedWei)} BNB collected · updated ${data.updatedAt.slice(11, 19)} UTC`
                  : "Loading the scores…"}
              </p>
              <button
                type="button"
                onClick={() => void scores.refetch()}
                disabled={scores.isFetching}
                className="chunk-sm bg-transparent px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[var(--text)] disabled:opacity-40"
                style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
              >
                {scores.isFetching ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {scores.isError && (
              <p className="px-2 font-mono text-xs text-[#FF8A3D]" role="alert">
                The scores could not be loaded. Press Refresh to try again.
              </p>
            )}

            {data && data.entries.length === 0 && (
              <p
                className="px-2 py-6 text-center font-mono text-sm text-[var(--dim)]"
                role="status"
              >
                No scores saved yet. Be the first name on the board — finish
                a dive and save it on-chain.
              </p>
            )}

            {data && data.entries.length > 0 && (
              <ol className="divide-y divide-[#201E1A] border-2 border-[#201E1A] bg-[#0B0B0C]">
                {data.entries.slice(0, 20).map((e, i) => (
                  <ScoreRow key={e.wallet} entry={e} rank={i + 1} isMine={mineRank === i + 1} />
                ))}
              </ol>
            )}

            {mine && !mineInTop && (
              <div className="mt-4">
                <p className="mb-2 px-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">
                  Your wallet — outside the top 20
                </p>
                <ol className="border-2 border-[#C97B2D] bg-[#0B0B0C]">
                  <ScoreRow entry={mine} rank={mineRank} isMine />
                </ol>
              </div>
            )}

            {data && !mine && mineWallet && (
              <p className="mt-4 px-2 font-mono text-xs text-[var(--dim)]">
                No score saved by “{wallet.trim()}” yet — finish a dive and
                save it on-chain to take your place on the board.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ claim section ---------------------------- */

type ClaimRowStatus =
  | { status: "idle" }
  | { status: "pending"; message: string }
  | { status: "error"; message: string }
  | { status: "success"; message: string; txHash: string };

/** $KRYN holder claim: connect, see every Diver the wallet holds with its
 *  claim state, and claim the fixed $KRYN reward per unclaimed Diver.
 *  Reward and fee are read live from the claim contract, never hardcoded. */
function ClaimSection() {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [owned, setOwned] = useState<OwnedDiver[] | null>(null);
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedError, setOwnedError] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<number, ClaimRowStatus>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const accountRef = useRef<string | null>(null);
  accountRef.current = account;

  const info = useQuery({
    queryKey: ["kryn-claim-info"],
    queryFn: fetchClaimInfo,
    refetchInterval: 60_000,
  });

  const loadOwned = async (wallet: string) => {
    setOwnedLoading(true);
    setOwnedError(false);
    try {
      setOwned(await fetchOwnedDivers(wallet));
    } catch {
      setOwnedError(true);
    } finally {
      setOwnedLoading(false);
    }
  };

  useEffect(() => {
    if (!account) {
      setOwned(null);
      return;
    }
    void loadOwned(account);
  }, [account]);

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

  const setRow = (id: number, next: ClaimRowStatus) =>
    setRowStatus((prev) => ({ ...prev, [id]: next }));

  const connect = async () => {
    const provider = getEthereum();
    if (!provider) {
      setConnectError(
        "No wallet found in this browser. Open this page inside a wallet browser (MetaMask, Trust Wallet, Binance Wallet…) — or claim with an agent using the prompt on an unclaimed Diver below.",
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
          ? "Wallet connection was rejected — approve it in your wallet to claim here."
          : "Could not connect the wallet. Check it is unlocked and on BNB Chain, then try again.",
      );
    } finally {
      setConnecting(false);
    }
  };

  const claim = async (id: number) => {
    const wallet = accountRef.current;
    if (!wallet || claimingId !== null) return;
    setClaimingId(id);
    setRow(id, { status: "pending", message: "Reading the claim fee…" });
    try {
      let feeHex: string;
      try {
        const feeRaw = await ethCallTo(KRYN_CLAIM_ADDRESS, CLAIM_SELECTORS.claimFee);
        feeHex = "0x" + BigInt(feeRaw).toString(16);
      } catch {
        setRow(id, {
          status: "error",
          message: "Could not read the claim fee from the contract. Try again in a moment.",
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
          setRow(id, {
            status: "error",
            message: "Switch your wallet to BNB Chain (chainId 56) and try again.",
          });
          return;
        }
      }
      setRow(id, { status: "pending", message: "Confirm the transaction in your wallet…" });
      const txHash = (await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: wallet,
            to: KRYN_CLAIM_ADDRESS,
            data: encodeUintCall(CLAIM_SELECTORS.claim, id),
            value: feeHex,
          },
        ],
      })) as string;
      setRow(id, {
        status: "success",
        message: "Claim sent — your $KRYN is on its way.",
        txHash,
      });
      setOwned((prev) =>
        prev ? prev.map((o) => (o.id === id ? { ...o, claimed: true } : o)) : prev,
      );
      void info.refetch();
      // Re-read claim states once the transaction has had time to confirm,
      // so a reverted claim shows as unclaimed again.
      setTimeout(() => {
        if (accountRef.current) void loadOwned(accountRef.current);
      }, 8000);
    } catch (err) {
      setRow(id, { status: "error", message: friendlyClaimError(err, id) });
    } finally {
      setClaimingId(null);
    }
  };

  const copyPrompt = async (id: number) => {
    const fee = info.data?.fee;
    if (fee === undefined) return;
    const text = claimPromptFor(id, fee);
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
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
  };

  const data = info.data;
  const unclaimedCount = owned ? owned.filter((o) => !o.claimed).length : 0;

  return (
    <section id="claim" className="scroll-mt-24 pt-20">
      <SectionHead
        kicker="The Token"
        title="CLAIM $KRYN — HOLDERS ONLY"
        intro="The $KRYN token is live on BNB Chain. Every Diver holds one claim: a fixed $KRYN reward per NFT, once, for whoever holds the Diver right now. Connect your wallet, see your Divers, and claim each one. The reward and the fee below are read live from the claim contract — the fee stays in the contract for the owner to withdraw."
      />
      <div
        className="chunk mt-8 p-2 sm:p-6"
        style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2 pt-2 sm:px-0 sm:pt-0">
          <p className="font-mono text-xs text-[var(--dim)]">
            {data
              ? `Reward ${formatKryn(data.reward)} $KRYN per Diver · fee ${formatBnb(data.fee)} BNB · ${data.claimedCount.toLocaleString("en-US")} / 2,222 claimed · ${formatKryn(data.pool)} $KRYN left in the pool · updated ${data.updatedAt.slice(11, 19)} UTC`
              : "Reading the claim contract…"}
          </p>
          <button
            type="button"
            onClick={() => {
              void info.refetch();
              if (account) void loadOwned(account);
            }}
            disabled={info.isFetching || ownedLoading}
            className="chunk-sm bg-transparent px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[var(--text)] disabled:opacity-40"
            style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
          >
            {info.isFetching || ownedLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {info.isError && (
          <p className="px-2 font-mono text-xs text-[#FF8A3D]" role="alert">
            The claim contract could not be read. Press Refresh to try again.
          </p>
        )}

        <div className="mx-2 mb-4 border-2 border-[#201E1A] bg-[#070708] p-3 sm:mx-0 sm:p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">
            $KRYN token — BNB Chain (chainId 56)
          </p>
          <p className="mt-1 break-all font-mono text-sm font-bold leading-relaxed">
            {KRYN_TOKEN_ADDRESS}{" "}
            <a
              className="font-normal text-[#FF8A3D] underline"
              href={`https://bscscan.com/address/${KRYN_TOKEN_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              BscScan ↗
            </a>
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">
            Claim contract
          </p>
          <p className="mt-1 break-all font-mono text-sm font-bold leading-relaxed">
            {KRYN_CLAIM_ADDRESS}{" "}
            <a
              className="font-normal text-[#FF8A3D] underline"
              href={`https://bscscan.com/address/${KRYN_CLAIM_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              BscScan ↗
            </a>
          </p>
        </div>

        {!account ? (
          <div className="mx-2 border-2 border-[#201E1A] bg-[#070708] p-3 sm:mx-0 sm:p-4">
            <button
              type="button"
              onClick={() => void connect()}
              disabled={connecting}
              aria-label="Connect your wallet to claim $KRYN"
              className="chunk-sm w-full bg-[#FF8A3D] px-5 py-3 font-mono text-sm font-bold uppercase tracking-[0.15em] text-[#070708] disabled:opacity-60 sm:w-auto"
              style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
            >
              {connecting ? "Connecting…" : "Connect wallet to claim"}
            </button>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--dim)]">
              Switches to BNB Chain (chainId 56) automatically
            </p>
            {connectError && (
              <p className="mt-3 font-mono text-xs font-bold leading-relaxed text-[#FF7A59]" role="alert">
                {connectError}
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="px-2 font-mono text-sm leading-relaxed sm:px-0">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--dim)]">
                Wallet connected{" "}
              </span>
              <strong className="break-all">{account}</strong>{" "}
              <span className="text-[var(--dim)]">(BNB Chain)</span>
            </p>

            {ownedLoading && !owned && (
              <p className="px-2 py-6 text-center font-mono text-sm text-[var(--dim)]" role="status" >
                Reading your Divers from the chain…
              </p>
            )}

            {ownedError && (
              <p className="px-2 py-4 font-mono text-xs text-[#FF8A3D]" role="alert">
                Your Divers could not be read. Press Refresh to try again.
              </p>
            )}

            {owned && owned.length === 0 && (
              <p className="px-2 py-6 text-center font-mono text-sm text-[var(--dim)]" role="status">
                No Divers in this wallet yet —{" "}
                <a href="#mint" className="font-bold text-[#FF8A3D] underline">
                  mint one
                </a>{" "}
                to claim $KRYN.
              </p>
            )}

            {owned && owned.length > 0 && unclaimedCount === 0 && (
              <p className="px-2 py-4 font-mono text-sm text-[var(--dim)]" role="status">
                All {owned.length} of your {owned.length === 1 ? "Diver has" : "Divers have"} already
                claimed — nothing left to claim.
              </p>
            )}

            {owned && owned.length > 0 && (
              <ol className="mt-4 divide-y divide-[#201E1A] border-2 border-[#201E1A] bg-[#0B0B0C]">
                {owned.map((o) => {
                  const st = rowStatus[o.id] ?? { status: "idle" };
                  return (
                    <li key={o.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="font-mono text-base font-bold">Diver #{o.id}</span>
                        {o.legendary && (
                          <span className="bg-[#FFC46B] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#070708]">
                            Legendary
                          </span>
                        )}
                        <span className="min-w-0 flex-1" />
                        {o.claimed ? (
                          <span className="font-mono text-xs font-bold text-[#9BE08A]">
                            CLAIMED ✓
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void claim(o.id)}
                              disabled={claimingId !== null || !data}
                              aria-label={`Claim $KRYN for Diver ${o.id}`}
                              className="chunk-sm bg-[#FF8A3D] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#070708] disabled:opacity-40"
                              style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
                            >
                              {claimingId === o.id
                                ? "Claiming…"
                                : data
                                  ? `Claim ${formatKryn(data.reward)} $KRYN`
                                  : "Claim $KRYN"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void copyPrompt(o.id)}
                              disabled={!data}
                              aria-label={`Copy the agent prompt to claim $KRYN for Diver ${o.id}`}
                              className="chunk-sm border-2 border-[#3D382E] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[var(--text)] disabled:opacity-40"
                              style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}
                            >
                              {copiedId === o.id ? "Copied ✓" : "Copy agent prompt"}
                            </button>
                          </>
                        )}
                      </div>
                      {st.status === "pending" && (
                        <p className="mt-2 font-mono text-xs leading-relaxed text-[var(--dim)]" role="status">
                          {st.message}
                        </p>
                      )}
                      {st.status === "error" && (
                        <p className="mt-2 font-mono text-xs font-bold leading-relaxed text-[#FF7A59]" role="alert">
                          {st.message}
                        </p>
                      )}
                      {st.status === "success" && (
                        <p className="mt-2 font-mono text-xs leading-relaxed text-[#9BE08A]" role="status">
                          {st.message}{" "}
                          <a
                            href={`https://bscscan.com/tx/${st.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-[#FFC46B] underline underline-offset-2"
                          >
                            Tx {shortAddress(st.txHash)} ↗
                          </a>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </>
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
  const [bestScore, setBestScore] = useState<number>(() => {
    const v = Number(localStorage.getItem("kryntar-dive-best") ?? 0);
    return Number.isFinite(v) ? v : 0;
  });
  const [localMode, setLocalMode] = useState(false);
  const [progress, setProgress] = useState<ProgressSnapshot>(loadProgress);
  const [justCompleted, setJustCompleted] = useState<string[]>([]);
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
    enabled: trimmedName.length > 0 && !localMode,
    retry: 1,
  });
  useEffect(() => {
    if (accessQuery.isError) setLocalMode(true);
  }, [accessQuery.isError]);
  // Static hosting (GitHub Pages) has no ./actions endpoint: a probe POST
  // 404s there, while the space server answers. Detect once on mount so
  // the game is playable even before a diver name is typed.
  useEffect(() => {
    let cancelled = false;
    fetch("./actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then((r) => {
        if (!cancelled && r.status === 404) setLocalMode(true);
      })
      .catch(() => {
        if (!cancelled) setLocalMode(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const access: PlayAccess | null = accessQuery.data
    ? {
        playsLeft: accessQuery.data.plays_left,
        playsLimit: accessQuery.data.plays_limit,
        canSubmit: accessQuery.data.can_submit,
        resetsAt: accessQuery.data.resets_at,
      }
    : null;

  const handleStartRequest = async (): Promise<StartVerdict> => {
    try {
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
    } catch {
      // No server reachable (static hosting): fall back to local mode and
      // let the dive start — it is saved on the device, not submitted.
      setLocalMode(true);
      return { allowed: true, access: LOCAL_ACCESS };
    }
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
            <a className={navLink} href="#scores">Scores</a>
            <a className={navLink} href="#claim">Claim</a>
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
            worth — and Diver holders claim the $KRYN token, one claim per
            Diver, in the Claim section below.
          </p>

          <dl className="chunk mt-8 grid grid-cols-2 gap-px bg-black font-mono lg:grid-cols-4" style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}>
            {[
              ["PLAY", "Unlimited practice dives"],
              ["ONE DIVE", "60 seconds · 3 oxygen"],
              ["GEMS", "4 types · deeper = rarer"],
              ["TOKEN", "$KRYN live — claim per Diver"],
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
            intro="One dive, 60 seconds. Gems rise past you as you sink — grab them, dodge the rocks, watch your oxygen. Your score is your depth plus your gems, and every gem is multiplied by the layer you are in: ×1 at the Surface, up to ×5 in the Heart. On this page dives run in local mode: unlimited practice, with gems, scores and missions saved on your device. Where a server is connected, legendary NFT holders play without limits, free-NFT holders get 3 plays a day, and guests get 1 practice play a day — plays reset at 00:00 UTC."
          />
          <div className="chunk mt-8 p-2 sm:p-6" style={{ "--chunk-shadow": "#C97B2D" } as CSSProperties}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="pixel-h text-xs sm:text-sm">DEEP DIVE — ONE RUN</h3>
              <span className="chunk-sm bg-[#FF8A3D] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#070708]" style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}>
                {localMode ? "Local mode — unlimited practice" : "Legendary: unlimited · Free NFT: 3/day"}
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
              localMode={localMode}
            />
            <p className="mb-4 max-w-3xl text-sm leading-relaxed text-[var(--dim)]">
              You have <strong className="text-[var(--text)]">60 seconds</strong> and{" "}
              <strong className="text-[var(--text)]">3 oxygen</strong>. Pale Kryn +10,
              Cracked +20, Ember +30, Heart +50 — times the layer multiplier. Oxygen
              drains faster the deeper you go, so grab the rising air bubbles. A
              falling rock costs 1 oxygen and 15 points; a jellyfish sting costs 1
              oxygen. Chain gems without a break for combo bonuses. Press SHIFT
              or the DASH button for a quick burst that makes you briefly
              untouchable. Mid-dive events shake things up: GEM RUSH floods the
              water with gems, JELLY SWARM doubles every gem while the
              jellyfish close in, and BUBBLE SURGE fills the water with air.
            </p>
            <DeepDive
              onFinish={(result) => {
                setLastRun(result);
                setSubmittedRank(null);
                const next = recordRun(result);
                setProgress(next.snapshot);
                setJustCompleted(next.newlyCompleted);
                setGemsTotal(next.snapshot.total);
                setBestScore(next.snapshot.best);
              }}
              access={localMode ? LOCAL_ACCESS : trimmedName ? access : null}
              accessLoading={localMode ? false : accessQuery.isFetching}
              onStartRequest={async (): Promise<StartVerdict> => {
                if (localMode) return { allowed: true, access: LOCAL_ACCESS };
                if (!trimmedName) return { allowed: false, access: null };
                return handleStartRequest();
              }}
              submittedRank={submittedRank}
              localMode={localMode}
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
              localMode={localMode}
            />
            <MissionsPanel progress={progress} justCompleted={justCompleted} />

            {/* my gems */}
            <div className="chunk-sm mt-6 bg-[#0B0B0C] p-4 sm:p-5" style={{ "--chunk-shadow": "#1B1813" } as CSSProperties}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 className="pixel-h text-xs sm:text-sm">MY GEMS</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--dim)]">
                    Gems from every dive you finished on this device — server
                    or not. They are counted here, under your name.
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
              <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
                {BANK_KINDS.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-2">
                    <span>
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5"
                        style={{ background: k.color }}
                        aria-hidden="true"
                      />
                      {k.label}
                    </span>
                    <span className="font-bold">× {progress.bank[k.id]}</span>
                  </li>
                ))}
              </ul>
              <div className="core-line mt-4 h-0.5 w-full opacity-70" aria-hidden="true" />
              <p className="mt-4 text-sm leading-relaxed text-[var(--dim)]">
                <strong className="text-[var(--text)]">Gems do not convert to the token.</strong>{" "}
                The $KRYN token is live, but gems saved on this device stay
                here — they are local and cannot be verified. $KRYN is
                claimed by holding a Diver, one claim per NFT, in the Claim
                section below; on-chain scores are planned to earn from
                seasonal reward pools later.
              </p>
            </div>
          </div>
        </section>

        <LeaderboardSection wallet={playerWallet} />
        <ScoresSection wallet={playerWallet} />
        <ClaimSection />

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

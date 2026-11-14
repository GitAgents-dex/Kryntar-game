# Data Plan

## Edit — ON-CHAIN SCORES BOARD, HOLDERS ONLY (2026-11-14, user: "On-chain, holder only")

Player names + scores now have a shared home that needs no server: a new
KryntarScores contract (`contract/KryntarScores.sol`). The user chose the
on-chain path over a free database or self-hosting, after asking why the
game's server was "replaced" — it was not: the server code is untouched,
but kryntar.xyz is static GitHub Pages with no server behind it, so the
game could never reach it. The scores contract is the shared store the
static site was missing.

- Contract: one best entry per wallet (name 1-24 bytes, score, depth,
  gems, updatedAt). `submitScore()` requires holding >=1 Kryntar Diver at
  submit time (balanceOf on 0xB77D...D9fe), gas only, no fees, no owner.
  A lower score keeps the best but still updates the name. Players are
  enumerable (`playerCount`/`playerAt`/`entryOf`/`isPlayer`) for
  Multicall3 reads. Tests: 19/19 pass (ganache + ethers,
  `test-scores.js`; MockRegistry reused as the holder mock, since all
  the contract reads from the NFT is balanceOf). NOTE: ganache's
  eth_estimateGas sees stale state after a reverted estimation, so the
  real submits in the tests use an explicit gas limit — the contract
  itself is fine (verified via eth_call + mined txs).
- Deploy: standalone deploy page (kryntar-scores-deploy.html, delivered
  to the user, NOT in the repo) embeds the compiled artifact byte-exact
  (solc 0.8.38, optimizer runs 200, evmVersion shanghai); NFT address
  prefilled + readonly; post-deploy checks `nft()` + `playerCount()`.
  The user deploys with their own wallet + BNB.
- Web (`client/src/App.tsx`): `SCOREBOARD_ADDRESS` is EMPTY until the
  contract deploys — no fake address. While empty, the new #scores
  section shows a "not deployed yet" note and no submit card appears.
  Once set: ScoresSection reads playerCount -> playerAt -> entryOf in
  two Multicall3 passes (same helpers as the holders board), ranks by
  score desc / earliest best / wallet, top 20 + own-wallet pin, 60 s
  refresh; OnChainSubmit (in SaveDiveForm, all three branches) connects
  the wallet, checks the real holder balance, and sends submitScore
  with a hand-rolled ABI encoder verified byte-identical to ethers'
  AbiCoder (5 cases incl. multibyte names) and a decoder verified
  against live ganache returndata. FAQ gained "What is the scores
  board?"; guest/wallet answers updated (on-chain submit checks the
  wallet, not the access-panel tier).
- Verified: `tsc --noEmit` clean (client + server, strict); encoder +
  decoder byte-checked against ethers/ganache; bundle contains the new
  strings (selectors 0x036e2294/0x302bcc57/0x8f828470/0x58bb388a) and
  the full-package strings; docs/ rebuilt (index-w0az8cax.js).

## Edit — DEEP DIVE FULL PACKAGE (2026-11-14, user: "Paket lengkap + aksi, event & suara")

The game was unplayable on the static site: START DIVE asked the server
(`startPlay` via `./actions`), which does not exist on GitHub Pages. The
game now detects the missing server and falls back to local mode, and
every dive leaves something behind on the device.

- Local mode: a `./actions` probe on mount (404 = no server), the access
  query failing, or `startPlay` throwing all switch the game to local
  mode — dives start immediately, unlimited, no diver name needed. The
  server path is untouched where a server answers. In local mode the
  access panel, game-over panel and save form say so honestly, and
  scores/gems are saved on the device only (Post to X without a rank).
- Gem bank + missions (`client/src/progress.ts`, localStorage only):
  every finished dive banks its gems per kind (`kryntar-gem-bank`),
  updates dive stats (`kryntar-dive-stats`: runs, best depth, best
  combo), and keeps the legacy totals (`kryntar-gems-total`,
  `kryntar-dive-best`). The MY GEMS panel shows the per-kind bank; the
  new MISSIONS panel tracks 5 derived missions (FIRST HAUL 25 gems,
  DEEP DELVER 1,800 m, HEART HUNTER 10 Heart Kryn, COMBO MASTER x6,
  CENTURY CLUB 500+ score). The old submit-only increment in
  SaveDiveForm was removed so gems are counted once, in `recordRun`.
- Action: SHIFT / DASH button fires a 0.45s burst (2.2x speed, brief
  invulnerability, 4s cooldown, HUD cell + trail sparks). Twice a dive a
  random 8s event bends the odds: GEM RUSH (fast gem-only spawns), JELLY
  SWARM (fast jellyfish, gems x2), BUBBLE SURGE (air floods, no rocks).
  Collect/hit/dash particle bursts, a tiny WebAudio synth (gem tones per
  kind, combo arpeggio, hit/air/dash/event/layer/game-over sounds, SOUND
  on/off button, no audio assets). `RunResult` gained `maxCombo`.
- Copy updated everywhere the game is described (hero stat, game intro,
  rules paragraph, FAQ answer): local mode, dash, events, missions.
- Verified: `tsc --noEmit` clean (client + server, strict); bundle
  contains the new strings and none of the removed ones; docs/ rebuilt
  (index-ye5pnbp3.js).

## Edit — BOARD GOES ON-CHAIN (2026-11-14, user: "Ubah board jadi data on-chain")

The leaderboard no longer depends on the server (`getLeaderboard` via
`./actions`), which cannot run on the static GitHub Pages site — the board
could never load there, and the game could not even start. The board now
reads holdings straight from BNB Chain with read-only calls:

- Minting is sequential from fixed pools, so the minted IDs are exactly
  `standardIdAt(0..S-1)` and `legendaryIdAt(0..L-1)`.
- Two batched Multicall3 `aggregate` passes (250 calls per chunk, parallel)
  read every minted ID, then the current owner of every ID.
- Ranking: Divers held desc, Legendary held desc, earliest mint in pool
  order, wallet address. The typed wallet in the access panel pins its own
  row below the top 20 when it ranks lower. Refreshes every 60 s.
- No event logs: the public BSC endpoints reject `eth_getLogs` ("limit
  exceeded" even for 10-block ranges), so the board uses `eth_call` only.
  Verified live: 989 minted / 987 holders, all 989 IDs match the pool order
  from the contract source, sums reconcile exactly.

The game itself (quotas, submits, scores) still needs the server and stays
as-is; only the board moved on-chain. The leaderboard FAQ answer was
rewritten to describe the on-chain board. Removed now-unused code:
`LbEntry`, `TierBadge`, `formatUtc`, and the `getLeaderboard` call.



## Edit — SOURCE SYNC TO LIVE CONTRACT (2026-11-14, user: "Perbaiki dan sinkronkan sourcenya")
- `client/src/App.tsx` in the repo still said the contract was not deployed (stale snapshot), while the published build in `docs/assets/index-kcdhbnw6.js` already mints against the live contract. Source now matches the live build, verified string-by-string against that bundle and re-checked on-chain (mintOpen=true, totalMinted 977/2,222 at sync time).
- Added: `CONTRACT_ADDRESS` 0xB77D3495d3ed4427dA78c9D0f7Cb76C21c23D9fe, 4 RPC endpoints, contract selectors, live counters (mintOpen/totalMinted/standardMinted/legendaryMinted, 15 s refresh), wallet connect (auto-switch to BNB Chain 56), and real mint buttons for all three lanes with cap + Agent-ID pre-checks and BscScan tx links. Agent prompts replaced with the live one-line prompts naming the contract; FAQ gained "Who can mint for free?" and the mint-open answers now state the mint is live. Deep Forge price corrected 0.001 → 0.0005 BNB everywhere (the 0.001 figure never existed on-chain).
- `server/src/actions.ts`: header comment only — holder status is still self-declared; on-chain verification is being connected, not active yet. No server behavior changed. `docs/` build output untouched by this sync.

## Edit — GEMS SECTION COMPACT REDESIGN (2026-11-14, user sent screenshots of the gem cards + "Bagysnya ini digimanai supaya bergubs")
User found the gem cards too tall/empty on phone (small thumbnail + long dashed TYPE/FOUND AT/SCORE/DROP RATE rows + big rarity boxes = very long scroll for just 4 gems). Section `#collection` (THE KRYN GEMS) rebuilt compact & visual, **all numbers unchanged** (Pale 10–99 / 0–300 m / +10 / ~45%; Cracked 100–299 / 300–900 m / +20 / ~27%; Ember 300–699 / 900–1,800 m / +30 / ~18%; Heart 700–999 / 900 m and deeper / +50 / ~10% deep only):
- **Cards**: grid 2 columns on phone, 4 in a row on desktop (`grid-cols-2 lg:grid-cols-4`). Each card top→bottom: full-width pixel gem image (the star, with a same-color drop-shadow glow), K-id + type label in the gem's accent color, name, POWER badge (orange numbers as before), 3 mini stat chips (▼ depth found / +N × layer score / ~N% drops), one short sentence. The long dashed trait rows are gone.
- **Per-gem accent frames**: Pale bone #E8E3D8, Cracked copper #C97B2D, Ember orange #FF8A3D, Heart gold #FFC46B — accent border + hard shadow in the accent color; Heart (Legendary) is the standout: gold frame, extra gold glow shadow, ★ LEGENDARY label.
- **Rarity**: the 4 big boxes replaced by ONE full-width stacked horizontal bar (45/27/18/10 segments in the accent colors, name + % inside) + a one-line legend row (color dot, name, tier, %) + the existing footnote (spawn odds; Heart only ≥900 m). Whole Gems section now fits ~1–1.5 phone screens. No other section, game size (720×600), leaderboard, access, or mint changed.

## Edit — PLAY ACCESS BY TIER + ONLINE LEADERBOARD + POST TO X (2026-11-14, user: "pemegang nft legendary bisa main game sepuasnya… leaderboard online 24 jam… bisa di post ke x")
- **Play quotas, server-counted** (new `plays` table + migration 0003; `scores` gains `depth` + `tier` columns): identity = diver name + optional wallet (matched case-insensitively), counted per UTC day, reset 00:00 UTC. **Legendary = unlimited plays; Free NFT = 3 plays/day; Guest = 1 practice play/day and CANNOT submit** (server rejects guest submits — `submitScore` now requires tier free|legendary). `startPlay` action spends one play before a dive begins (game Start is gated on the server verdict; Restart mid-run is free); `getAccess` returns plays used/left + reset instant.
- **HONESTY (per spec)**: contract still TBA → holder tier is SELF-DECLARED in the access panel; the panel carries the explicit note that on-chain NFT verification switches on automatically when the contract goes live. No fake on-chain check anywhere.
- **Leaderboard section is BACK as a new all-time online board** (nav link BOARD → `#board`, "TOP DIVERS — ALL TIME"): this supersedes the 2026-11-13 removal, which deleted the old WEEKLY board; the new board is all-time, permanent, Top 20 by score with rank / name / score / depth / gems / LEGENDARY-or-FREE badge / submit time in UTC, auto-refresh 30 s + Refresh button, and the player's own best entry pinned below when outside the Top 20. New `getLeaderboard` action; old `getBoard` action kept server-side for compatibility. **Still NO prize pool** — honor only, stated on the section and in FAQ.
- **Post to X**: after a successful submit, the Game Over panel shows the leaderboard rank + a "Post to X" button (x.com/intent/post, prefilled score/depth/gems/rank + #Kryntar); the player's own leaderboard row carries the same share button.
- **UI**: new "WHO IS DIVING?" access panel above the game (name + wallet inputs shared with the submit form, 3 tier radio cards, live "Plays left today: X/3" + reset note); Start disables at 0 plays with a clear blocked message naming the 00:00 UTC reset; guest game-over/submit area explains practice-only. Game size 720×600, 4 Legendary divers, mint prices (0 / 0.001 / 0.01 BNB), My Gems + planned gem→token swap all unchanged.

## Edit — ONLY 4 NFTS SHOWN, ALL LEGENDARY + LEGENDARY MINT 0.01 BNB (2026-11-14, user: "biarkan nft yang mucul 4 saja diweb yang legend semua" + "mint supaya dapet legend harus bayar 0.01 untuk langsung dapet nft legend")
- **Divers showcase cut to 4 cards, all Legendary**: `DIVER_MASTERS` in `client/src/App.tsx` now holds only Crystal Diver (#06), Royal Gold (#14), Ember Crystal (#26), and Dragon Diver (#21) — Dragon promoted from Epic to Legendary (gold/red dragon design, most iconic for the top tier), its card relabeled Legendary with the lit crystal frame + crown strip and Max Depth 1,200 M. Heading changed "26 MASTERS — EVERY STYLE" → "THE LEGENDARY FOUR"; grid now 4 columns on desktop. The 4-tier rarity summary boxes (Common 1,111 / Rare 667 / Epic 333 / Legendary 111 of 2,222) stay as collection info. The other 22 master image assets remain in `client/src/assets/` untouched — only their imports/renders were removed (imports had to go: `noUnusedLocals`). FAQ "What are the Kryntar Divers?" updated to say 4 Legendary master cards.
- **Legendary Mint lane added (official plan, contract still TBA)**: a featured full-width panel in `#mint` with the Legendary crystal frame + crown strip — "LEGENDARY MINT", exactly **0.01 BNB**, copy "GUARANTEED LEGENDARY — no luck, no random draw", one of the 4 Legendary masters, Max Depth 1,200 M, 111 of 2,222; button stays disabled "Waiting for the contract". Section title now "THREE LANES. ALL OPEN ON DAY ONE." Deep Forge lane + comparison table now state explicitly that no other lane ever gives a Legendary (Legendary Mint only). New agent prompt `AGENT_PROMPT_LEGENDARY` (0.01 BNB, STOP rules while contract not live) + PromptCard. New FAQ "How do I get a Legendary diver?" → Legendary Mint 0.01 BNB, guaranteed. Other lane prices unchanged (free 0 BNB, Deep Forge 0.001 BNB). Game size 720×600 unchanged; no board, no prize pool.

## Edit — GAME RESIZED TO MIDDLE SIZE (2026-11-14, user direction change mid-build: "Terlalu kebesaran itu gamenya perkecil")
The oversized arena was too big; user ordered it shrunk to a MIDDLE size — not back to the original 720×460. Final geometry: canvas **720×600** (~6:5, one third shorter than the 720×900 overshoot, still roomier than the original 720×460), sprite pixel PX **4** (diver ≈72 internal px), DIVER_Y 240. All dependent geometry rescaled to the middle: hitboxes (gems 48×44, rock 46×42, jelly 52×48), spawn ranges, diver clamps (44 / W−98), MAXV 480, popup offsets and font 15px, depth ruler 12px font with 120px strata spacing, layer banner 17px, overlay title 22px, HUD values back to text-lg, Start/Pause back to text-sm px-6 py-3, canvas full container width with no max-width cap. Phone panel padding stays p-2. On a phone the canvas now renders ≈350×292 CSS px — one compact panel, no long scroll just to pass it. Gameplay, scoring, save flow, My Gems unchanged. This supersedes the enlargement entry below.

## Edit — GAME ENLARGED AGAIN, RENDER-SCALE FIX (2026-11-14, user repeat: "Visual gamenya masih kecil dan layarnya juga terlalu kecil")
The previous enlargement raised only the canvas's internal resolution (720×900), so on a phone it still rendered at ~45% scale inside nested padding (main px-4 → panel p-4 → borders) and the diver stayed ~41 CSS px on screen. This pass fixes the *rendered* size: internal arena narrowed to **560×960** so the same phone width renders it at ~60% scale, sprite pixel PX 5 → **6** (diver ≈108 internal px ≈ 65 CSS px on a phone, ~1.6× the previous on-screen size), Heart gems at PX 7; all dependent geometry rescaled (hitboxes, spawn ranges, diver clamps, bubble origin, popup offsets, jelly glow, depth ruler font 14px + thicker ticks, popup font 19px, layer banner 22px, overlay title 30px). Canvas capped at `max-w-[900px]` centered (audit P0 fix: a 680px cap made the desktop arena narrower than the pre-edit full-width rendering; at 900px the desktop arena is larger than before in both sprite scale and height, and phones still render it full-width); game panel padding on phones p-4 → p-2 so the arena sits nearly edge-to-edge. HUD values text-xl, Start/Pause buttons text-base with bigger padding. Gameplay, scoring, save flow unchanged.

## Edit — 26 MASTERS SHOWCASE + GAME ENLARGED (2026-11-14, user: "Tambahkan 20 master lagi" + "Visual gamenya masih kecil dan layarnya juga terlalu kecil")
- **20 new masters added to `#divers`** (total 26 cards, heading now "26 MASTERS — EVERY STYLE", cards grouped Common → Rare → Epic → Legendary, each with tier frame, rarity chip, Max Depth by tier, and a "Master #NN" label). Source: 4 AI master sheets in `~/workspace/your_files/kryntar-nft/` (batch1 07–11, batch2 12–16, batch3 17–21, batch4 22–26), each sheet 5 characters in one row, cropped per character (one fifth of sheet width, left→right in the user's stated order) into `client/src/assets/diver-*.webp` at 640×640. Batches 1 & 4 sheets are 3520×704 (square fifths, direct crop). Batches 2 & 3 sheets are 2736×912 (portrait fifths 547×912): padded to square with a flat deep-navy sampled from each crop's own outer edge strips (whole-image average gave a beige cast; edge-stretch gave streaks — both rejected after visual checks) so every character stays fully visible. Rarities per user list: Common — Baby Big Tank 11, Cat 15, Frog 16, Bee 22, Medic 23 · Rare — Miner 07, Lantern Keeper 08, Octo Friend 09, Pirate 10, Knight 17, Sub Captain 25 · Epic — Shadow Abyss 12, Frost 13, Viking 18, Witch 19, Samurai 20, Dragon 21, Vampire 24 · Legendary — Royal Gold 14, Ember Crystal 26. FAQ updated ("26 master cards"). Collection/contract status unchanged: still TBA, nothing minted.
- **Deep Dive enlarged** (`client/src/game.tsx`): canvas internal size 720×460 → **720×900** (4:5 — near full phone width and far taller; on desktop it renders full container width and much taller than before). Everything scaled up proportionally: sprite pixel size PX 3 → 5 (diver ≈90px wide internal, ~2× the on-phone size), Heart gems at PX 6, air bubbles at PX 4/5, hitboxes, spawn ranges, item speeds (rise/fall/jelly drift/sway) and popup offsets rescaled for the taller arena; depth ruler font 10px → 13px with thicker ticks/marker; popup font 13px → 17px; layer banner 16px → 20px; overlay title 26px. DOM chrome enlarged too: HUD values text-lg, oxygen bars h-3.5, Start/Pause buttons text-sm with bigger padding, phone hold buttons px-7 py-3.5 text-2xl, game-over numbers text-2xl, legend text-[13px]. Gameplay, scoring, save flow (`submitScore`, My Gems) unchanged.

## Edit — DIVER RARITY + DEEP DIVE REWORK (2026-11-13, user: "Nah bagus buat ada raritynya dan gamenya harus diperbaiki juga")
User approved the AI chibi pixel diver style (hero-style masters) and ordered rarity + a better game:
- **Rarity added to Kryntar Divers (2,222)**: 4 tiers — Common 1,111 (50%) · Rare 667 (30%) · Epic 333 (15%) · Legendary 111 (5%). Stat per tier: Max Depth 300 m / 600 m / 900 m / 1,200 m. Rarity + Max Depth are stated as official metadata traits. Tier frames: Common plain bone-grey, Rare Pijar copper, Epic glowing pale-blue glass, Legendary lit crystal frame + crown accent strip.
- **Showcase**: new `#divers` section (nav link DIVERS) between Gems and Mint — 4 rarity summary boxes (count + % + Max Depth) + 6 master cards in tier frames. Masters are crops of the approved AI 2×3 sheet (`~/workspace/your_files/kryntar-nft/media-generation-kryntar-unique-divers-6-0-...webp`, 1920×1280 → six 640×640 crops in `client/src/assets/diver-*.webp`): Captain Brass = Rare, Pink Scuba = Common, Unit K-7 robot = Epic, Shark Hood Kid = Rare, Hollow Diver (skull in glass helmet) = Epic, Crystal Diver = Legendary. Copy states honestly: design showcase, full 2,222 collection + contract still TBA, nothing minted/for sale.
- **Game rework** (`client/src/game.tsx`, extracted from App.tsx): new chibi pixel diver sprite (big round copper helmet, glowing orange visor, tank, animated kicking fins, helmet bubble trail); velocity-based steering (accel/drag, pointer target with capped pull, keys override, hold buttons with pointercancel); depth ruler + strata scroll, water darkens per layer with a layer-change banner (name + multiplier); layer-based spawns (cheap gems up top, Heart only in Core/Heart); oxygen drains faster in deeper layers, air bubbles +0.5 O₂ as strategy; hazards = falling rocks (−1 O₂, −15 pts) + drifting jellyfish (sting −1 O₂), both with red flash + screen shake + popup text + invulnerability blink; floating score popups, combo counter (every 3rd chained gem +5, HUD COMBO cell); Game Over panel shows depth reached, per-type gem counts, total gems, total + best score. Save flow unchanged: `submitScore` still receives score + total gems; SaveDiveForm now also shows the per-type haul. Still NO prize pool, NO Top-10 board.

## Edit — BOARD SECTION REMOVED (2026-11-13, user order "Hapus bagian ini" + screenshot)
User pointed at the whole Board section in a phone screenshot and ordered it deleted. Removed completely from `client/src/App.tsx`:
- Section `#board` / TOP DIVERS: "WEEK ENDS IN" countdown panel (incl. "This week opened Monday…" + "Dives saved this week"), "LAST WEEK'S TOP 3" panel, "THIS WEEK — TOP 10" panel with REFRESH button and the "A name is enough / Wallets stay short" notes.
- Nav link BOARD, hero fact-strip cell BOARD / Weekly Top 10 (strip now 4 cells), `useCountdown` hook, `BoardRows` component, `getBoard` query and Board types.
- All other board/Top-10 references cleaned: hero paragraph now "save your gems", SaveDiveForm no longer mentions board/rank (success = gems counted in My Gems), My Gems copy no longer says "board record", FAQ answers for "What is Kryntar?", "Is there a prize pool?", and "Do I need a wallet?" rewritten without board language.
- KEPT: Deep Dive game itself, SaveDiveForm (still calls `submitScore` so saved gems feed My Gems), My Gems panel (local saved-gem total + best score + planned gem→token swap copy), and all other sections (World, Gems, Mint, FAQ). Server `getBoard` action remains in `server/src/actions.ts` unused by the client; stored scores are untouched.

## Edit — SIMPLE COPY + PIXEL ART + DEEP DIVE FOCUS + GEM→TOKEN LATER (2026-11-13, user order)
User rejected the "bahasa pahatan" style bible as too convoluted ("terlalu berbelit-belit") and ordered a Riftera-pattern rewrite (patterns only — hero fact strip, clean trait cards, rarity boxes, lane comparison table, short FAQ; NOT Riftera's text, theme, names, or numbers):
- **Copy**: all poetic lexicon removed (Pahatan Pertama, Ukiran Dalam, Bahasa Batu, Pintu Batu, Lapisan Waktu, Tanya Dari Permukaan, Tanda Dalam…). Page is now simple, direct English. Kept terms only: Kryn (the gem), Diver, depth/layer names (Surface/Fracture/Core/Heart). Sections: Hero (1 clear sentence + fact strip: free play / 60s·3 oxygen / 4 gem types / token not launched / weekly Top 10) → The Game (DEEP DIVE, centerpiece right after hero) → Leaderboard (TOP DIVERS) → World of Kryntar (4 layer cards) → The Kryn Gems (4 trait cards + rarity boxes with drop % and Power ranges — these are the game's own spawn odds/score design, not collection supply claims) → Mint (status panel, 2 lane cards, comparison table, short agent prompts with STOP rules) → FAQ (short answers).
- **Pixel art**: 5 new generated pixel illustrations replace all smooth artwork (hero diver+cluster 228 KB, 4 gem sprites 29–70 KB — small files, user's stated reason: easy upload). Old painted webps deleted from `client/src/assets/`. Everything renders with `image-rendering: pixelated`; the game canvas draws pixel sprite maps (diver, 4 gem types, rock, bubbles) as plain squares with smoothing off. Type: Press Start 2P headlines + Space Mono body. Panels: chunky black frames + hard offset shadows. Kryntar palette kept (Kryn Black / bone / Pijar Inti copper).
- **Game focus**: DEEP DIVE — dive as deep as possible in 60 s with 3 oxygen; score = depth points (1 per 10 m) + gem points; gems Pale +10 / Cracked +20 / Ember +30 / Heart +50 (Heart spawns only ≥900 m), each × layer multiplier ×1–×5; rocks −1 oxygen −15 pts; air +0.5 oxygen. Server actions/schema unchanged in shape (`pearls` = gems collected per dive); action descriptions renamed to the simple terms.
- **Gem → token (PLANNED, honest)**: hero, My Gems panel, save form, and FAQ all state the same thing: gems saved with a score are planned to be exchangeable for the Kryntar token AFTER it launches; the token is NOT launched, the swap is NOT active, NO rate is set. **MY GEMS panel** shows the player's saved-gem total on this device (localStorage sum of gems from dives saved via submitScore) + best score. NO prize pool anywhere (previous order still in force). Mint facts unchanged: contract TBA/not deployed, free lane 0 BNB Surface-only, paid lane exactly 0.001 BNB, both lanes parallel from day one.

## Edit — NO PRIZE POOL + KRYNTAR STYLE BIBLE (2026-11-13, user orders)
- **"Jangan ada pol hadiah"**: prize pool removed TOTAL — no 0.01 BNB pool, no 0.005/0.003/0.002 Top-3 split, no manual dev payment, no BNB prize claims anywhere (game section, Depth Record, FAQ, save form). The leaderboard stays as **UKIRAN DALAM**: a pure depth/proof record — names engraved as the deepest of the season, honor only. The Top-3 prize rows became honor rows (TERDALAM / KEDUA / KETIGA TERDALAM). The wallet field is now explicitly optional ("Wallet BNB (opsional)"), a record marker only; scores save with name alone. Weekly Mon 00:00 UTC seasons remain as recording periods. Server actions/schema unchanged in shape.
- **Style Bible Kryntar** applied across the whole page, replacing the prism/serif identity:
  - **Color**: Kryn Hitam #070708 base, Tulang Pucat #E8E3D8 text, abu tekanan #8A867E secondary, sole accent **Pijar Inti** #C97B2D → #FF8A3D (copper ember). All violet/blue/green prism colors removed (UI, canvas game, logo mark, gradients → `.core-line` / `.core-text`).
  - **Background**: `.depth-bg` — obsidian facet-line texture + vertical gradient that darkens as the page descends; fixed left **depth ruler** (xl screens) with metre marks 0/300/900/1.800/2.310 M and the vertical inscription "KRYNTAR — DITEMPA, BUKAN DIBUAT".
  - **Type**: Cinzel (carved inscriptional display, uppercase tight headlines via `.carved`) + Space Mono (data/labels, wide tracking). Fraunces + IBM Plex Mono removed.
  - **Voice**: "bahasa pahatan" — short, declarative, heavy Indonesian; no hype words. Headline: "Yang di permukaan, gratis. Yang di dalam, ditempa."
  - **Lexicon** (with an on-page "Bahasa Batu — Leksikon Kryntar" glossary in the manifesto): Manifesto → PAHATAN PERTAMA, The Principle → TIGA PAHATAN (Tekanan/Waktu/Bukti), Kryn Index → UKURAN DALAM, Specimens → CATATAN BATU, Pressure Trial → UJIAN TEKANAN, Depth Record → UKIRAN DALAM, Enter the Vault → PINTU BATU, Chronicle → LAPISAN WAKTU, FAQ → TANYA DARI PERMUKAAN; orang permukaan = "Permukaan", diver = "Pendalam", skor = "Tanda Dalam", free mint = "Ambil Permukaan", paid mint = "Tempa Inti". Applied in nav, section labels, game HUD/canvas overlays, save form, agent prompts, FAQ, chronicle, footer, and server action descriptions. Layer names (Surface/Fracture/Core/Heart) and Pressure Rating kept as proper terms. Artwork images unchanged (their alt texts reworded to copper ember).

## Total overhaul — "FORGED UNDER PRESSURE" (2026-11-13, user order)
User rejected the first identity (The Deep That Glows / ocean trench / teal glassy / KRYN DIVE) as not distinctive enough: "Rombak total … bergaya sendiri punya nilai tersendiri tentang kryntar." New identity authored from the parent brief:
- **Core value / manifesto**: "Nilai tidak lahir di permukaan. Nilai lahir di bawah tekanan, dalam waktu yang lama, dan hanya dimiliki yang berani turun paling dalam." Kryn = crystal formed only under extreme pressure over millions of years — cannot be accelerated, cannot be faked. Headline: "SURFACE IS FREE. DEPTH HAS VALUE."
- **Visual**: obsidian luxury / museum-vault brutalist editorial — matte black #0A0A0B, bone white/raw silver, one prism refraction accent (violet→blue→green) used sparingly; Fraunces display serif + IBM Plex Mono labels; angular facet clip-paths; a K mark built from cut planes. No teal, no glass, no pixel, no cute.
- **Structure** (old hero/world/factions/collection/mint/game/FAQ order fully replaced): 00 Manifesto · 01 The Principle (PRESSURE / TIME / PROOF) · 02 The Kryn Index (layers Surface / Fracture / Core / Heart with Pressure Rating, replacing generic rarity) · 03 Specimens (museum catalogue K-0001/K-0147/K-0802/K-0009 with Formation/Cut/Pressure Rating/Depth data) · 04 The Pressure Trial at #game (descent game: pressure rises per second, fragments score × layer multiplier ×1–×5, oxygen drains faster the deeper you go, 60s, 3 oxygen, fracture rocks) · 05 Depth Record (shared Top 10, renamed from leaderboard; weekly prize pool unchanged: 0.01 BNB split 0.005/0.003/0.002, Mon 00:00 UTC reset, paid manually within 24h) · 06 Enter The Vault (Surface Claim free vs Core Forging 0.001 BNB, parallel from day one; contract honestly TBA / not deployed; copy-ready agent prompts with STOP rules) · 07 Chronicle (geological-era timeline) · 08 FAQ.
- **Server**: actions/schema unchanged in shape (seasons, Top 10 + last-season Top 3, masked wallets). The `scores.pearls` column keeps its original name; it now counts Kryn fragments recovered per descent (noted in code comments). Action descriptions updated to the new terms.
- **Artwork**: 5 new generated illustrations (dark editorial painted style, obsidian + prism): vault hero monolith + 4 specimens (Surface cluster, Fracture crystal, Core spectrum crystal, Heart octahedron). A first literal heart-shaped gem was rejected and regenerated as an octahedron. Old ocean artwork deleted from `client/src/assets/`.

## Context provenance (original build)
- `Buat web bergaya seperti ini https://riftera.net/#game tapi jangan buat sama persis temanya dan gayanya buat untuk web kryntar` (verbatim user request; the reference site's structure — dark game landing page with a playable arcade game, weekly leaderboard, prize/podium panels — informs the layout, while theme, name, palette, game, and copy must be original for Kryntar)
- Reference screenshots captured via `web_artifacts.view_reference` on https://riftera.net/#game (7 screens, stored under audits/references/2026-11-13T15-58-01Z-799770492/): dark navy background, chunky bordered panels, pixel display type, a 60-second catch-the-shards canvas game with hearts/score HUD, weekly prize podium (0.005/0.003/0.002 BNB), season countdown, weekly board, and mint-lane panels. Kryntar borrows only this page rhythm, not its facts: Kryntar has NO contract, NO mint, and NO BNB prize pool in any source given, so none of Riftera's on-chain numbers, addresses, prices, or prize claims will appear; Kryntar's podium shows season glory (titles/medals), not money.
- No parent-conversation facts beyond the request itself were applied; Kryntar is a new name with no prior lore in memory, so all world-building (deep-sea abyss theme, Tidecallers, Lumin pearls) is original creative content authored for this page, presented as the project's own fiction — not as real-world facts.

## Tested sources
### Reference site (design only)
**Used by**: layout/design decisions in the client (no runtime fetch)
**Test command**: `web_artifacts.view_reference https://riftera.net/#game` + reading the 7 captured screenshots
**Sample output**: dark game landing page; sections: collection hero, playable canvas game with HUD (score/time/hearts), prize podium cards, season countdown, weekly leaderboard, mint lanes
**Processing**: structure studied, then re-themed: abyssal deep-sea world, teal/coral bioluminescent palette, rounded deep-sea panels instead of pixel frames, a new game (Pearl Dive) with different mechanics presentation, Indonesian copy

### Generated artwork (build-time)
**Used by**: hero visual + 4 Tidecaller character cards in the collection section
**Test command**: `media.generate_image` calls during Build into `client/src/assets/` (hero abyss scene + 4 diver characters, illustrated non-photographic style)
**Sample output**: verified visually with `muse.read` per image before acceptance; rejected/regenerated if off-theme or containing baked-in text
**Processing**: imported as build-time assets by the client; no remote image URLs at runtime

## Long-term data behavior
- **Refresh policy**: none — no external live data; leaderboard is user-generated and read fresh from the DB on every load.
- **Growth**: one row per submitted run score (name, score, pearls caught, optional wallet, season week, timestamp); rows accumulate across seasons.
- **Ordering**: leaderboard = current ISO week's scores, score DESC, earliest submission wins ties; Top 10 shown, plus last week's champions (Top 3).
- **Time semantics**: seasons are Monday 00:00 UTC → next Monday 00:00 UTC (same rhythm as the reference); season key computed server-side from UTC date; countdown rendered client-side to the next Monday 00:00 UTC.

## Rejected approaches
- **Copying Riftera's mint/contract/prize content for Kryntar**: Kryntar has no contract address, prices, or funded prize pool in any source; inventing them would fabricate on-chain facts. Kryntar instead presents its collection as an upcoming drop (no address, no prices, no fake minted counters) and its podium as season titles.
- **Wallet-gated game**: the reference gates play behind a paid-holder on-chain check; Kryntar has no contract to check against, so the game is open to everyone and the leaderboard takes an optional wallet string purely as a display/prize-contact field the player types in.

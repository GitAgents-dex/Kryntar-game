// Restores the binary assets (pixel art .webp files) from their .b64 snapshots.
// Run once after cloning:  node scripts/decode-assets.mjs
import { readdirSync, readFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let n = 0;
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== "node_modules") walk(p); continue; }
    if (e.endsWith(".b64")) {
      writeFileSync(p.slice(0, -4), Buffer.from(readFileSync(p, "utf8").replace(/\s+/g, ""), "base64"));
      rmSync(p); n++;
    }
  }
})(root);
console.log(`Decoded ${n} asset files.`);

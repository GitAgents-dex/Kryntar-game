// Generates kryntar-token-deploy.html embedding the EXACT compiled artifacts.
// Run: node gen-token-deploy-page.js  (from contract/ dir); output goes to docs/
// Then verify: node verify-deploy-page.js
const { ethers } = require('ethers');
const fs = require('fs');
const tokenArt = JSON.parse(fs.readFileSync('KrynToken.json', 'utf8'));
const claimArt = JSON.parse(fs.readFileSync('KrynClaim.json', 'utf8'));

function sel(sig) { return ethers.id(sig).slice(0, 10); }
const SEL = {
  name: sel('name()'),
  symbol: sel('symbol()'),
  totalSupply: sel('totalSupply()'),
  balanceOf: sel('balanceOf(address)'),
  transfer: sel('transfer(address,uint256)'),
  nft: sel('nft()'),
  token: sel('token()'),
  REWARD: sel('REWARD()'),
  CLAIM_FEE: sel('CLAIM_FEE()'),
  claimedCount: sel('claimedCount()'),
};
console.log('selectors:', JSON.stringify(SEL, null, 1));

const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Deploy Token $KRYN</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #070708; color: #E8E3D8; font-family: monospace; padding: 20px 16px 40px; }
  h1 { font-size: 20px; color: #FF8A3D; letter-spacing: .05em; }
  h2 { font-size: 14px; color: #FFC46B; margin-top: 28px; }
  p, li { font-size: 14px; line-height: 1.6; color: #B9B2A4; }
  .card { background: #0B0B0C; border: 3px solid #000; box-shadow: 4px 4px 0 #262019; padding: 16px; margin-top: 16px; }
  .addr { word-break: break-all; color: #E8E3D8; font-size: 13px; }
  button { display: block; width: 100%; margin-top: 12px; padding: 15px; font-family: monospace; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: .1em; border: 3px solid #000; cursor: pointer; }
  button:disabled { opacity: .4; cursor: default; }
  #connectBtn { background: #E8E3D8; color: #070708; }
  #deployBtn { background: #FF8A3D; color: #070708; }
  .copyBtn { background: #262019; color: #E8E3D8; }
  input { width: 100%; padding: 12px; margin-top: 8px; background: #070708; border: 2px solid #3D382E; color: #E8E3D8; font-family: monospace; font-size: 13px; }
  label { font-size: 11px; text-transform: uppercase; letter-spacing: .15em; color: #9B968B; }
  #status { white-space: pre-wrap; word-break: break-all; font-size: 13px; line-height: 1.7; }
  .ok { color: #7BD88A; } .err { color: #FF7A6B; } .warn { color: #FFC46B; }
  a { color: #FF8A3D; }
  .step { color: #E8E3D8; }
</style>
</head>
<body>
<h1>DEPLOY TOKEN $KRYN</h1>
<p>Token game Kryntar Divers — <b class="step">Kryn ($KRYN)</b>, supply tetap <b class="step">222.222.222</b>. Deploy ini mengirim <b class="step">3 transaksi</b>: (1) deploy token, (2) deploy kontrak klaim, (3) isi kontrak klaim dengan <b class="step">55.550.000 $KRYN</b> (25.000 x 2.222 Diver). Sisanya (likuiditas, musim skor, owner) tetap di wallet kamu.</p>

<div class="card">
  <h2>1. CONNECT WALLET</h2>
  <p>Buka halaman ini di <b class="step">browser dalam aplikasi wallet</b> (bukan Chrome biasa). Wallet harus di BNB Chain.</p>
  <button id="connectBtn" type="button">Connect Wallet</button>
  <p id="walletLine">Belum connect.</p>
</div>

<div class="card">
  <h2>2. PERIKSA PARAMETER</h2>
  <label>Alamat NFT Kryntar Divers (tidak bisa diubah)</label>
  <input id="nftInput" type="text" readonly value="0xB77D3495d3ed4427dA78c9D0f7Cb76C21c23D9fe">
  <p>Chain: <b class="step">BNB Chain (56)</b> &middot; Klaim: 25.000 $KRYN per Diver, sekali per NFT, fee 0,0001 BNB &middot; Token: tanpa pajak, tanpa mint tambahan.</p>
</div>

<div class="card">
  <h2>3. DEPLOY (3 TRANSAKSI)</h2>
  <p>Setiap transaksi minta konfirmasi di wallet kamu. Gas ditanggung kamu. Jangan tutup halaman sampai selesai.</p>
  <button id="deployBtn" type="button" disabled>Deploy $KRYN + Klaim</button>
  <p id="status">Menunggu connect&hellip;</p>
</div>

<div class="card" id="resultCard" style="display:none">
  <h2>SELESAI</h2>
  <p>Alamat token $KRYN:</p>
  <p class="addr" id="tokenAddr"></p>
  <button class="copyBtn" id="copyTokenBtn" type="button">Salin Alamat Token</button>
  <p>Alamat kontrak klaim:</p>
  <p class="addr" id="claimAddr"></p>
  <button class="copyBtn" id="copyClaimBtn" type="button">Salin Alamat Klaim</button>
  <p id="checks"></p>
  <p>Langkah terakhir: <b class="step">kirim kedua alamat ini ke Muse</b> — saya verifikasi kontraknya dan sambungkan klaim ke kryntar.xyz.</p>
</div>

<div class="card">
  <h2>DETAIL KOMPILASI (UNTUK VERIFIKASI)</h2>
  <p>Compiler: solc 0.8.38 &middot; Optimizer: aktif, runs 200 &middot; EVM: shanghai &middot; Source: <span class="addr">contract/KrynToken.sol</span> + <span class="addr">contract/KrynClaim.sol</span> (repo Kryntar-game) &middot; Constructor klaim: 2 argumen = alamat NFT di atas + alamat token yang baru di-deploy.</p>
</div>

<script>
const TOKEN_ART = ${JSON.stringify(tokenArt)};
const CLAIM_ART = ${JSON.stringify(claimArt)};
const SEL = ${JSON.stringify(SEL)};
const NFT = "0xB77D3495d3ed4427dA78c9D0f7Cb76C21c23D9fe";
const CHAIN_ID = "0x38";
const FUND = 55550000n * (10n ** 18n);
const SUPPLY = 222222222n * (10n ** 18n);
const REWARD = 25000n * (10n ** 18n);
const FEE = 100000000000000n;
const statusEl = document.getElementById("status");
const walletLine = document.getElementById("walletLine");
const deployBtn = document.getElementById("deployBtn");
let account = null;

function log(msg, cls) {
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = msg;
  statusEl.appendChild(line);
}
function setStatus(msg) { statusEl.textContent = msg; }
function eth() {
  if (!window.ethereum) throw new Error("Wallet tidak ditemukan. Buka halaman ini di browser dalam aplikasi wallet (Trust Wallet / MetaMask / OKX).");
  return window.ethereum;
}
async function ensureChain() {
  const id = await eth().request({ method: "eth_chainId" });
  if (id === CHAIN_ID) return;
  try {
    await eth().request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID }] });
  } catch (e) {
    if (e && e.code === 4902) {
      await eth().request({ method: "wallet_addEthereumChain", params: [{ chainId: CHAIN_ID, chainName: "BNB Chain", nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: ["https://bsc-dataseed.binance.org"], blockExplorerUrls: ["https://bscscan.com"] }] });
    } else throw e;
  }
}
document.getElementById("connectBtn").addEventListener("click", async () => {
  try {
    setStatus("Menghubungkan wallet\\u2026");
    const accounts = await eth().request({ method: "eth_requestAccounts" });
    account = accounts[0];
    await ensureChain();
    walletLine.innerHTML = "Connect: <span class='addr'>" + account + "</span> (BNB Chain)";
    deployBtn.disabled = false;
    setStatus("Wallet connect. Siap deploy.");
  } catch (e) {
    setStatus("Gagal connect: " + (e && e.message ? e.message : e));
  }
});
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function waitReceipt(hash) {
  for (let i = 0; i < 40; i++) {
    const r = await eth().request({ method: "eth_getTransactionReceipt", params: [hash] });
    if (r) return r;
    await sleep(3000);
  }
  throw new Error("Receipt tidak ketemu setelah 2 menit. Cek hash di BscScan.");
}
async function ethCall(to, data) {
  return await eth().request({ method: "eth_call", params: [{ from: account, to: to, data: data }, "latest"] });
}
function pad32(hex) { return hex.replace(/^0x/, "").toLowerCase().padStart(64, "0"); }
function decodeString(hex) {
  const raw = hex.slice(2);
  const len = parseInt(raw.slice(64, 128), 16);
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = parseInt(raw.slice(128 + i * 2, 130 + i * 2), 16);
  return new TextDecoder().decode(bytes);
}
function setupCopy(btnId, getText) {
  document.getElementById(btnId).addEventListener("click", async (ev) => {
    try { await navigator.clipboard.writeText(getText()); ev.target.textContent = "Tersalin!"; }
    catch (e) { ev.target.textContent = "Gagal salin — salin manual dari atas."; }
  });
}
deployBtn.addEventListener("click", async () => {
  try {
    if (!account) throw new Error("Connect wallet dulu.");
    deployBtn.disabled = true;
    setStatus("");
    // TX 1: deploy token
    log("Transaksi 1/3: deploy token $KRYN\\u2026 konfirmasi di wallet.");
    const hash1 = await eth().request({ method: "eth_sendTransaction", params: [{ from: account, data: TOKEN_ART.bytecode, value: "0x0" }] });
    log("TX 1 terkirim: " + hash1, "warn");
    const rc1 = await waitReceipt(hash1);
    if (!rc1.contractAddress) throw new Error("Receipt TX 1 tidak berisi alamat kontrak.");
    const tokenAddr = rc1.contractAddress;
    log("Token ter-deploy di: " + tokenAddr, "ok");
    // TX 2: deploy claim (nft, token)
    log("Transaksi 2/3: deploy kontrak klaim\\u2026 konfirmasi di wallet.");
    const claimData = CLAIM_ART.bytecode + pad32(NFT) + pad32(tokenAddr);
    const hash2 = await eth().request({ method: "eth_sendTransaction", params: [{ from: account, data: claimData, value: "0x0" }] });
    log("TX 2 terkirim: " + hash2, "warn");
    const rc2 = await waitReceipt(hash2);
    if (!rc2.contractAddress) throw new Error("Receipt TX 2 tidak berisi alamat kontrak.");
    const claimAddr = rc2.contractAddress;
    log("Klaim ter-deploy di: " + claimAddr, "ok");
    // TX 3: fund claim with 55,550,000 KRYN
    log("Transaksi 3/3: isi kontrak klaim dengan 55.550.000 $KRYN\\u2026 konfirmasi di wallet.");
    const fundData = SEL.transfer + pad32(claimAddr) + FUND.toString(16).padStart(64, "0");
    const hash3 = await eth().request({ method: "eth_sendTransaction", params: [{ from: account, to: tokenAddr, data: fundData, value: "0x0" }] });
    log("TX 3 terkirim: " + hash3, "warn");
    await waitReceipt(hash3);
    log("Kontrak klaim terisi.", "ok");
    // checks
    log("Memeriksa kontrak\\u2026");
    const name = decodeString(await ethCall(tokenAddr, SEL.name));
    const symbol = decodeString(await ethCall(tokenAddr, SEL.symbol));
    const supply = BigInt(await ethCall(tokenAddr, SEL.totalSupply));
    const claimBal = BigInt(await ethCall(tokenAddr, SEL.balanceOf + pad32(claimAddr)));
    const nftGot = "0x" + (await ethCall(claimAddr, SEL.nft)).slice(-40).toLowerCase();
    const tokenGot = "0x" + (await ethCall(claimAddr, SEL.token)).slice(-40).toLowerCase();
    const reward = BigInt(await ethCall(claimAddr, SEL.REWARD));
    const fee = BigInt(await ethCall(claimAddr, SEL.CLAIM_FEE));
    const cc = BigInt(await ethCall(claimAddr, SEL.claimedCount));
    const row = (label, val, good) => label + " " + val + (good ? " <span class='ok'>COCOK</span>" : " <span class='err'>TIDAK COCOK</span>") + "<br>";
    document.getElementById("checks").innerHTML =
      row("name():", name, name === "Kryn") +
      row("symbol():", symbol, symbol === "KRYN") +
      row("totalSupply():", "222.222.222", supply === SUPPLY) +
      row("saldo klaim:", "55.550.000 $KRYN", claimBal === FUND) +
      row("claim.nft():", nftGot, nftGot === NFT.toLowerCase()) +
      row("claim.token():", tokenGot, tokenGot === tokenAddr.toLowerCase()) +
      row("REWARD:", "25.000 $KRYN", reward === REWARD) +
      row("CLAIM_FEE:", "0,0001 BNB", fee === FEE) +
      row("claimedCount():", "0", cc === 0n) +
      "TX: <a target='_blank' rel='noreferrer' href='https://bscscan.com/tx/" + hash1 + "'>1</a> <a target='_blank' rel='noreferrer' href='https://bscscan.com/tx/" + hash2 + "'>2</a> <a target='_blank' rel='noreferrer' href='https://bscscan.com/tx/" + hash3 + "'>3</a>";
    document.getElementById("tokenAddr").textContent = tokenAddr;
    document.getElementById("claimAddr").textContent = claimAddr;
    document.getElementById("resultCard").style.display = "block";
    setupCopy("copyTokenBtn", () => tokenAddr);
    setupCopy("copyClaimBtn", () => claimAddr);
    log("Selesai. Kirim kedua alamat ke Muse.", "ok");
  } catch (e) {
    log("Gagal: " + (e && e.message ? e.message : e), "err");
    deployBtn.disabled = false;
  }
});
</script>
</body>
</html>
`;
fs.writeFileSync('kryntar-token-deploy.html', html);
console.log('wrote kryntar-token-deploy.html', html.length, 'bytes');

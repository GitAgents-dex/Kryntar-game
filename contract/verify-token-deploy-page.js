// Verifies kryntar-token-deploy.html embeds the EXACT compiled artifacts.
// Exact-equality on parsed values only — substring checks miss 0x0x bugs.
const { ethers } = require('ethers');
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync('kryntar-token-deploy.html', 'utf8');
const tokenArt = JSON.parse(fs.readFileSync('KrynToken.json', 'utf8'));
const claimArt = JSON.parse(fs.readFileSync('KrynClaim.json', 'utf8'));

function extract(name) {
  const m = html.match(new RegExp('const ' + name + ' = (\\{.*?\\});\\n'));
  assert(m, name + ' not found');
  return JSON.parse(m[1]);
}
const t = extract('TOKEN_ART');
const c = extract('CLAIM_ART');
assert.deepStrictEqual(t, tokenArt, 'TOKEN_ART != KrynToken.json');
assert.deepStrictEqual(c, claimArt, 'CLAIM_ART != KrynClaim.json');
console.log('OK: embedded artifacts exactly equal compiled artifacts');

assert(!html.includes('0x0x'), '0x0x prefix bug present');
console.log('OK: no 0x0x');

assert(t.bytecode.startsWith('0x') && !t.bytecode.startsWith('0x0x'), 'token bytecode prefix');
assert(c.bytecode.startsWith('0x') && !c.bytecode.startsWith('0x0x'), 'claim bytecode prefix');
console.log('OK: bytecode prefixes clean');

// Selectors embedded must match recomputation from signatures.
const selM = html.match(/const SEL = (\{.*?\});\n/);
assert(selM, 'SEL not found');
const SEL = JSON.parse(selM[1]);
const expect = {};
for (const [k, sig] of Object.entries({
  name: 'name()', symbol: 'symbol()', totalSupply: 'totalSupply()',
  balanceOf: 'balanceOf(address)', transfer: 'transfer(address,uint256)',
  nft: 'nft()', token: 'token()', REWARD: 'REWARD()',
  CLAIM_FEE: 'CLAIM_FEE()', claimedCount: 'claimedCount()',
})) expect[k] = ethers.id(sig).slice(0, 10);
assert.deepStrictEqual(SEL, expect, 'SEL mismatch');
console.log('OK: selectors match', JSON.stringify(SEL));

// ABI must contain every function the page calls.
for (const fn of ['name', 'symbol', 'totalSupply', 'balanceOf', 'transfer'])
  assert(t.abi.some((e) => e.name === fn), 'token ABI missing ' + fn);
for (const fn of ['nft', 'token', 'REWARD', 'CLAIM_FEE', 'claimedCount', 'claim', 'withdraw'])
  assert(c.abi.some((e) => e.name === fn), 'claim ABI missing ' + fn);
console.log('OK: ABIs cover all page calls');
console.log('ALL DEPLOY PAGE CHECKS PASSED');

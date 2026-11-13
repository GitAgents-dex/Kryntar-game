const ganache = require('ganache');
const { ethers } = require('ethers');
const fs = require('fs');
const { abi, bytecode } = JSON.parse(fs.readFileSync('Kryntar.json', 'utf8'));
const assignment = JSON.parse(fs.readFileSync('../nft-production/assignment.json', 'utf8'));
const rarityOf = id => assignment.find(t => t.id === id).rarity;
let pass = 0, fail = 0;
function ok(cond, label) { cond ? (pass++, console.log('PASS', label)) : (fail++, console.log('FAIL', label)); }
async function reverts(p, label) { try { await (await p).wait(); ok(false, label); } catch { ok(true, label); } }
(async () => {
  const server = ganache.server({ logging: { quiet: true } });
  await server.listen(7545);
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
  const [owner, alice, bob] = await Promise.all([0, 1, 2].map(i => provider.getSigner(i)));
  const c = await new ethers.ContractFactory(abi, bytecode, owner).deploy();
  await c.waitForDeployment();
  ok((await c.mintOpen()) === false, 'mint CLOSED at deploy');
  ok((await c.deepPrice()) === ethers.parseEther('0.0005'), 'deep price 0.0005');
  ok((await c.legendaryPrice()) === ethers.parseEther('0.01'), 'legendary price 0.01');
  await reverts(c.connect(alice).mintFree(), 'free mint reverts while closed');
  await reverts(c.connect(alice).setMintOpen(true), 'non-owner cannot open mint');
  await (await c.setMintOpen(true)).wait();
  // free lane
  await (await c.connect(alice).mintFree()).wait();
  const aliceId = Number(await c.tokenOfOwnerByIndex ? 0 : 0); // not enumerable; read via event instead below
  ok((await c.balanceOf(alice.address)) === 1n, 'alice has 1 after free mint');
  await reverts(c.connect(alice).mintFree(), 'second free mint reverts (cap 1)');
  // deep lane
  await reverts(c.connect(bob).mintDeep({ value: ethers.parseEther('0.001') }), 'deep wrong price reverts');
  for (let i = 0; i < 5; i++) await (await c.connect(bob).mintDeep({ value: ethers.parseEther('0.0005') })).wait();
  ok((await c.balanceOf(bob.address)) === 5n, 'bob has 5 after deep x5');
  await reverts(c.connect(bob).mintDeep({ value: ethers.parseEther('0.0005') }), 'sixth deep reverts (cap 5)');
  // legendary lane — guaranteed legendary IDs
  await reverts(c.connect(alice).mintLegendary({ value: ethers.parseEther('0.0005') }), 'legendary wrong price reverts');
  await (await c.connect(alice).mintLegendary({ value: ethers.parseEther('0.01') })).wait();
  // read minted IDs from Mint events
  const evs = await c.queryFilter(c.filters.Mint());
  const byLane = { 0: [], 1: [], 2: [] };
  for (const e of evs) byLane[Number(e.args[2])].push(Number(e.args[1]));
  ok(byLane[0].length === 1 && byLane[1].length === 5 && byLane[2].length === 1, 'mint events per lane 1/5/1');
  ok(byLane[0].concat(byLane[1]).every(id => rarityOf(id) !== 'Legendary'), 'free+deep never yield Legendary');
  ok(byLane[2].every(id => rarityOf(id) === 'Legendary'), 'legendary lane yields Legendary (guaranteed)');
  const uri = await c.tokenURI(byLane[2][0]);
  ok(uri === `https://kryntar.xyz/nft/metadata/${byLane[2][0]}.json`, 'tokenURI format: ' + uri);
  ok((await c.totalMinted()) === 7n, 'totalMinted 7');
  // withdraw
  const before = await provider.getBalance(owner.address);
  await (await c.withdraw()).wait();
  const after = await provider.getBalance(owner.address);
  ok(after > before, 'withdraw pays owner');
  await server.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

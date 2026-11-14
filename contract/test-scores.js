// KryntarScores tests (ganache + ethers, same harness as test.js).
// Run first: node compile.js && node compile-scores.js
//   (compile.js produces MockRegistry.json, reused here as the holder mock,
//   because all the scores contract reads from the NFT is balanceOf.)
// Then: node test-scores.js
const ganache = require('ganache');
const { ethers } = require('ethers');
const fs = require('fs');
const { abi, bytecode } = JSON.parse(fs.readFileSync('KryntarScores.json', 'utf8'));
const mockArt = JSON.parse(fs.readFileSync('MockRegistry.json', 'utf8'));
const FEE = ethers.parseEther('0.0001');
let pass = 0, fail = 0;
function ok(cond, label) { cond ? (pass++, console.log('PASS', label)) : (fail++, console.log('FAIL', label)); }
async function reverts(p, label) { try { await (await p).wait(); ok(false, label); } catch { ok(true, label); } }
async function revertsDeploy(make, label) { try { const d = await make(); await d.waitForDeployment(); ok(false, label); } catch { ok(true, label); } }
// NOTE: ganache's eth_estimateGas sees stale state after a reverted estimation
// (it reverts with the pre-give balance), while eth_call and real txs see the
// correct state. Real submits below therefore use an explicit gas limit so
// estimation is skipped; the mined state is what the assertions check.
(async () => {
  const server = ganache.server({ logging: { quiet: true } });
  await server.listen(7546);
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7546');
  const [owner, alice, bob] = await Promise.all([0, 1, 2].map(i => provider.getSigner(i)));
  const mock = await new ethers.ContractFactory(mockArt.abi, mockArt.bytecode, owner).deploy();
  await mock.waitForDeployment();
  const nftAddr = await mock.getAddress();
  await revertsDeploy(() => new ethers.ContractFactory(abi, bytecode, owner).deploy(ethers.ZeroAddress), 'deploy reverts with NFT 0');
  const c = await new ethers.ContractFactory(abi, bytecode, owner).deploy(nftAddr);
  await c.waitForDeployment();
  const cAddr = await c.getAddress();
  ok((await c.nft()) === nftAddr, 'nft() is the mock registry');
  ok((await c.owner()) === owner.address, 'owner() is the deployer');
  ok((await c.SUBMIT_FEE()) === FEE, 'SUBMIT_FEE is 0.0001 BNB');
  ok((await c.playerCount()) === 0n, 'playerCount 0 at deploy');
  // withdraw gates
  await reverts(c.withdraw({ gasLimit: 100000 }), 'withdraw reverts when balance is 0');
  await reverts(c.connect(alice).withdraw({ gasLimit: 100000 }), 'non-owner withdraw reverts');
  // holder gate (fee paid, so it reverts for the holder reason)
  await reverts(c.connect(alice).submitScore('ALICE', 100, 500, 10, { value: FEE }), 'non-holder submit reverts');
  await (await mock.give(alice.address)).wait();
  await reverts(c.connect(alice).submitScore('', 100, 500, 10, { value: FEE }), 'empty name reverts');
  await reverts(c.connect(alice).submitScore('A'.repeat(25), 100, 500, 10, { value: FEE }), '25-byte name reverts');
  await reverts(c.connect(alice).submitScore('ALICE', 0, 500, 10, { value: FEE }), 'score 0 reverts');
  // exact fee
  await reverts(c.connect(alice).submitScore('ALICE', 100, 500, 10), 'submit with 0 fee reverts');
  await reverts(c.connect(alice).submitScore('ALICE', 100, 500, 10, { value: FEE / 2n }), 'submit with half fee reverts');
  await reverts(c.connect(alice).submitScore('ALICE', 100, 500, 10, { value: FEE * 2n }), 'submit with double fee reverts');
  await (await c.connect(alice).submitScore('ALICE', 100, 500, 10, { value: FEE, gasLimit: 300000 })).wait();
  let e = await c.entryOf(alice.address);
  ok(e[0] === 'ALICE' && e[1] === 100n && e[2] === 500n && e[3] === 10n && e[4] > 0n, 'entry stored: name/score/depth/gems/updatedAt');
  ok((await c.playerCount()) === 1n, 'playerCount 1 after first submit');
  ok((await c.playerAt(0)) === alice.address, 'playerAt(0) is alice');
  ok((await c.isPlayer(alice.address)) === true && (await c.isPlayer(bob.address)) === false, 'isPlayer flags');
  // lower score: best kept, name updated, fee still charged
  await (await c.connect(alice).submitScore('ALICE2', 50, 900, 20, { value: FEE, gasLimit: 300000 })).wait();
  e = await c.entryOf(alice.address);
  ok(e[0] === 'ALICE2' && e[1] === 100n && e[2] === 500n && e[3] === 10n, 'lower score keeps best, name updates');
  ok((await c.playerCount()) === 1n, 'playerCount still 1 (no duplicate)');
  // higher score: best replaced
  await (await c.connect(alice).submitScore('ALICE2', 250, 1200, 30, { value: FEE, gasLimit: 300000 })).wait();
  e = await c.entryOf(alice.address);
  ok(e[1] === 250n && e[2] === 1200n && e[3] === 30n, 'higher score replaces best');
  // 24-byte name ok
  await (await c.connect(alice).submitScore('B'.repeat(24), 260, 1300, 31, { value: FEE, gasLimit: 300000 })).wait();
  e = await c.entryOf(alice.address);
  ok(e[0] === 'B'.repeat(24) && e[1] === 260n, '24-byte name accepted');
  // second player enumerated
  await (await mock.give(bob.address)).wait();
  await (await c.connect(bob).submitScore('BOB', 80, 300, 5, { value: FEE, gasLimit: 300000 })).wait();
  ok((await c.playerCount()) === 2n, 'playerCount 2');
  ok((await c.playerAt(1)) === bob.address, 'playerAt(1) is bob');
  // event carries best values
  const evs = await c.queryFilter(c.filters.ScoreSubmitted());
  const last = evs[evs.length - 1];
  ok(last.args[0] === bob.address && last.args[1] === 'BOB' && last.args[2] === 80n, 'ScoreSubmitted event for bob');
  // fees accumulate in the contract: 5 submits x 0.0001
  ok((await provider.getBalance(cAddr)) === FEE * 5n, 'contract holds 5 x fee (0.0005 BNB)');
  // unknown player: empty entry, no revert
  const stranger = await c.entryOf('0x0000000000000000000000000000000000000001');
  ok(stranger[0] === '' && stranger[1] === 0n, 'unknown player returns empty entry');
  // withdraw pays the owner and empties the contract
  const before = await provider.getBalance(owner.address);
  await (await c.withdraw({ gasLimit: 100000 })).wait();
  // Ganache quirk: a balance read immediately after .wait() can return the
  // pre-tx value. Settle briefly before asserting post-withdraw balances.
  await new Promise((r) => setTimeout(r, 1000));
  const after = await provider.getBalance(owner.address);
  ok((await provider.getBalance(cAddr)) === 0n, 'contract empty after withdraw');
  ok(after > before, 'withdraw pays owner');
  const wevs = await c.queryFilter(c.filters.Withdrawn());
  ok(wevs.length === 1 && wevs[0].args[0] === owner.address && wevs[0].args[1] === FEE * 5n, 'Withdrawn event: owner + 0.0005 BNB');
  await server.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

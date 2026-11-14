// KrynToken + KrynClaim tests (ganache + ethers, same harness as test-scores.js).
// Run first: node compile-token.js
// Then: node test.js
const ganache = require('ganache');
const { ethers } = require('ethers');
const fs = require('fs');
const tokenArt = JSON.parse(fs.readFileSync('KrynToken.json', 'utf8'));
const claimArt = JSON.parse(fs.readFileSync('KrynClaim.json', 'utf8'));
const mockArt = JSON.parse(fs.readFileSync('MockERC721.json', 'utf8'));
const FEE = ethers.parseEther('0.0001');
const REWARD = ethers.parseEther('25000');
const SUPPLY = ethers.parseEther('222222222');
const FUND = ethers.parseEther('55550000');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(cond, label) { cond ? (pass++, console.log('PASS', label)) : (fail++, console.log('FAIL', label)); }
async function reverts(p, label) { try { await (await p).wait(); ok(false, label); } catch { ok(true, label); } }
async function revertsDeploy(make, label) { try { const d = await make(); await d.waitForDeployment(); ok(false, label); } catch { ok(true, label); } }
(async () => {
  const server = ganache.server({ logging: { quiet: true } });
  await server.listen(7547);
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7547');
  const [owner, alice, bob] = await Promise.all([0, 1, 2].map((i) => provider.getSigner(i)));

  // ---- token ----
  const token = await new ethers.ContractFactory(tokenArt.abi, tokenArt.bytecode, owner).deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  ok((await token.name()) === 'Kryn', 'name is Kryn');
  ok((await token.symbol()) === 'KRYN', 'symbol is KRYN');
  ok((await token.decimals()) === 18n, 'decimals 18');
  ok((await token.totalSupply()) === SUPPLY, 'totalSupply 222,222,222');
  ok((await token.balanceOf(owner.address)) === SUPPLY, 'full supply to deployer');
  ok((await token.balanceOf(alice.address)) === 0n, 'alice starts at 0');
  // transfer + transferFrom + allowance
  await (await token.transfer(alice.address, ethers.parseEther('100'))).wait();
  ok((await token.balanceOf(alice.address)) === ethers.parseEther('100'), 'transfer moves balance');
  await reverts(token.connect(alice).transfer(bob.address, ethers.parseEther('101'), { gasLimit: 100000 }), 'transfer over balance reverts');
  await (await token.connect(alice).approve(bob.address, ethers.parseEther('40'))).wait();
  ok((await token.allowance(alice.address, bob.address)) === ethers.parseEther('40'), 'allowance set');
  await (await token.connect(bob).transferFrom(alice.address, bob.address, ethers.parseEther('40'), { gasLimit: 100000 })).wait();
  ok((await token.balanceOf(bob.address)) === ethers.parseEther('40'), 'transferFrom moves balance');
  await reverts(token.connect(bob).transferFrom(alice.address, bob.address, 1n, { gasLimit: 100000 }), 'transferFrom over allowance reverts');

  // ---- claim ----
  const nft = await new ethers.ContractFactory(mockArt.abi, mockArt.bytecode, owner).deploy();
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();
  await revertsDeploy(() => new ethers.ContractFactory(claimArt.abi, claimArt.bytecode, owner).deploy(ethers.ZeroAddress, tokenAddr), 'claim deploy reverts with NFT 0');
  await revertsDeploy(() => new ethers.ContractFactory(claimArt.abi, claimArt.bytecode, owner).deploy(nftAddr, ethers.ZeroAddress), 'claim deploy reverts with token 0');
  const claim = await new ethers.ContractFactory(claimArt.abi, claimArt.bytecode, owner).deploy(nftAddr, tokenAddr);
  await claim.waitForDeployment();
  const claimAddr = await claim.getAddress();
  ok((await claim.nft()) === nftAddr, 'nft() is the mock NFT');
  ok((await claim.token()) === tokenAddr, 'token() is KrynToken');
  ok((await claim.owner()) === owner.address, 'owner() is the deployer');
  ok((await claim.REWARD()) === REWARD, 'REWARD is 25,000 KRYN');
  ok((await claim.CLAIM_FEE()) === FEE, 'CLAIM_FEE is 0.0001 BNB');
  ok((await claim.claimedCount()) === 0n, 'claimedCount 0 at deploy');
  // fund the claim contract with the exact holder allocation
  await (await token.transfer(claimAddr, FUND)).wait();
  ok((await token.balanceOf(claimAddr)) === FUND, 'claim contract funded with 55,550,000');

  await (await nft.mint(alice.address, 1)).wait();
  await (await nft.mint(alice.address, 2)).wait();
  await (await nft.mint(bob.address, 3)).wait();
  // gates
  await reverts(claim.connect(bob).claim(1, { value: FEE, gasLimit: 100000 }), 'non-holder claim reverts');
  await reverts(claim.connect(alice).claim(1, { gasLimit: 100000 }), 'claim with 0 fee reverts');
  await reverts(claim.connect(alice).claim(1, { value: FEE / 2n, gasLimit: 100000 }), 'claim with half fee reverts');
  await reverts(claim.connect(alice).claim(1, { value: FEE * 2n, gasLimit: 100000 }), 'claim with double fee reverts');
  await reverts(claim.connect(alice).claim(999, { value: FEE, gasLimit: 100000 }), 'claim of nonexistent token reverts');
  // happy path
  const balBefore = await token.balanceOf(alice.address);
  await (await claim.connect(alice).claim(1, { value: FEE, gasLimit: 200000 })).wait();
  ok((await token.balanceOf(alice.address)) - balBefore === REWARD, 'claim pays exactly 25,000 KRYN');
  ok((await claim.claimed(1)) === true, 'claimed(1) true after claim');
  ok((await claim.claimedCount()) === 1n, 'claimedCount 1');
  await reverts(claim.connect(alice).claim(1, { value: FEE, gasLimit: 100000 }), 'second claim of same ID reverts');
  // second NFT, same wallet: allowed (once per token ID)
  await (await claim.connect(alice).claim(2, { value: FEE, gasLimit: 200000 })).wait();
  ok((await claim.claimedCount()) === 2n, 'second NFT claims fine');
  // bob claims his own
  await (await claim.connect(bob).claim(3, { value: FEE, gasLimit: 200000 })).wait();
  ok((await claim.claimedCount()) === 3n, 'third claim counted');
  // fee accumulation + withdraw
  await sleep(1000);
  ok((await provider.getBalance(claimAddr)) === FEE * 3n, 'fees accumulate: 3 x 0.0001 BNB');
  await reverts(claim.connect(alice).withdraw({ gasLimit: 100000 }), 'non-owner withdraw reverts');
  const ownerBalBefore = await provider.getBalance(owner.address);
  const wtx = await claim.withdraw({ gasLimit: 100000 });
  const wrc = await wtx.wait();
  await sleep(1000);
  ok((await provider.getBalance(claimAddr)) === 0n, 'withdraw drains contract');
  const ownerBalAfter = await provider.getBalance(owner.address);
  const gasCost = wrc.gasUsed * (wrc.gasPrice ?? 0n);
  ok(ownerBalAfter - ownerBalBefore + gasCost === FEE * 3n, 'owner receives all fees');
  // unfunded claim reverts (fresh claim contract with no KRYN)
  const claim2 = await new ethers.ContractFactory(claimArt.abi, claimArt.bytecode, owner).deploy(nftAddr, tokenAddr);
  await claim2.waitForDeployment();
  await reverts(claim2.connect(bob).claim(3, { value: FEE, gasLimit: 100000 }), 'claim reverts when contract holds no KRYN');

  console.log(`\n${pass} passed, ${fail} failed`);
  await server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

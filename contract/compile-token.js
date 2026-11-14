const solc = require('solc');
const fs = require('fs');
const files = ['KrynToken.sol', 'KrynClaim.sol', 'MockERC721.sol'];
const sources = {};
for (const f of files) sources[f] = { content: fs.readFileSync(f, 'utf8') };
const input = { language: 'Solidity', sources,
  settings: { evmVersion: 'shanghai', optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } };
const out = JSON.parse(solc.compile(JSON.stringify(input)));
if (out.errors) for (const e of out.errors) console.log(e.severity.toUpperCase(), e.formattedMessage.split('\n')[0]);
for (const f of files) {
  const name = f.replace('.sol', '');
  const c = out.contracts[f][name];
  fs.writeFileSync(name + '.json', JSON.stringify({ abi: c.abi, bytecode: '0x' + c.evm.bytecode.object }, null, 1));
  console.log(name, 'bytecode bytes:', c.evm.bytecode.object.length / 2);
}

const solc = require('solc');
const fs = require('fs');
const src = fs.readFileSync('KryntarScores.sol', 'utf8');
const input = { language: 'Solidity', sources: { 'KryntarScores.sol': { content: src } },
  settings: { evmVersion: 'shanghai', optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } };
const out = JSON.parse(solc.compile(JSON.stringify(input)));
if (out.errors) for (const e of out.errors) console.log(e.severity.toUpperCase(), e.formattedMessage.split('\n')[0]);
const c = out.contracts['KryntarScores.sol']['KryntarScores'];
fs.writeFileSync('KryntarScores.json', JSON.stringify({ abi: c.abi, bytecode: '0x' + c.evm.bytecode.object }, null, 1));
console.log('bytecode bytes:', c.evm.bytecode.object.length / 2);

#!/usr/bin/env node
import hre from 'hardhat';

import util from 'util';
import path from 'path';
import fs from 'fs';

const exec = util.promisify(require("child_process").exec);
const verifyCMD = 'npx hardhat verify';

const pathLogs = `../../logs/contracts/`;

const skipContracts = [
  // Test Contracts
  "OLToken",
  "TestToken1",
  "TestToken2",
  "TestFairShareCalc",
  "PixelNFT",
  "ERC20Minter",
  "ERC1155TestToken",
  // Already Verified
  "Multicall",
];

const network = hre.network.name;

const { contracts } = require(`../deployment/${network}.config`);
console.log(`Selected Network: ${network}`);

const verify = async (contract) => {
  if (!contract || !contract.contractName || !contract.contractAddress)
    return Promise.resolve({ stderr: "missing contract name and address" });

  console.log(`Contract: ${contract.contractName}@${contract.contractAddress}`);
  try {
    let output;
    if (!fs.existsSync(`./scripts/args/${contract.contractName}.js`)) {
      output = await exec(
        `${verifyCMD} --network ${network} --contract ${contract.contractPath}:${contract.contractName} ${contract.contractAddress}`
      );
    } else {
      output = await exec(
        `${verifyCMD} --network ${network} --constructor-args ./scripts/args/${contract.contractName}.js --contract ${contract.contractPath}:${contract.contractName} ${contract.contractAddress}`
      );
    }
    return Promise.resolve();
  } catch (err) {
    console.warn(err.stderr);
    return Promise.resolve();
  }
};

const matchAddress = (input, contractPath, regex) => {
  let matches = new RegExp(regex, "g").exec(input);
  let output = {};
  if (matches) {
    output = {
      contractName: matches[1],
      contractAddress: matches[2],
      contractPath: `${contractPath.replace(/^.{3}/, '')}.sol`
    };
  }
  return output;
};

const main = async () => {
  const files = fs.readdirSync(pathLogs);
  const filteredFiles = files.filter(file => file.includes(network));
  const deployLog = path.resolve(`${pathLogs}${filteredFiles.pop()}`);

  const { stdout } = await exec(
    `cat ${deployLog}`
  );
  const verifyContracts = contracts.filter(
    (c) => !skipContracts.includes(c.name)
  );


  // Verify all the deployed addresses first (including the identity/proxy contracts)
  // When the identity/proxy contracts are verified, the verification gets propagated
  // to the cloned ones because they have the exact same code.
  return verifyContracts
    .map((contract) =>
      matchAddress(
        stdout,
        contract.path,
        `(${contract.name}):+\\s(.+)`
      )
    )
    .reduce((p, c) => p.then(() => verify(c)), Promise.resolve());
};

main()
  .then(() => console.log("Verification process completed with success"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

/**
MIT License

Copyright (c) 2020 Openlaw

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
import {
  unitPrice,
  numberOfUnits,
  maximumChunks,
  ETH_TOKEN,
  UNITS,
  maxAmount,
  maxUnits,
  toBN
} from './contract-util';

import { deployDao } from './deployment-util';

import { ContractType } from "../deployment/contracts.config";

import { contracts } from "../deployment/test.config";

/* New imports */
import hre, { artifacts } from 'hardhat';

export const deployFunction = async (contractInterface, args, from) => {
  if (!contractInterface) throw Error("undefined contract interface");

  const contractConfig = contracts.find(
    (c) => c.name === contractInterface.contractName
  );

  const accounts = await hre.web3.eth.getAccounts();
  const f = from ? from : accounts[0];

  let instance;
  if (contractConfig.type === ContractType.FACTORY) {
    const identity = await args[0].new({ from: f });
    instance = await contractInterface.new(
      ...[identity.address].concat(args.filter(arg => arg).slice(1)),
      { from: f }
    );
  } else {
    if (args) {
      instance = await contractInterface.new(...args, { from: f });
    } else {
      instance = await contractInterface.new({ from: f });
    }
  }
  return { ...instance, configs: contractConfig };
};

export const getContractByName = (c: string) => {
  return artifacts.require(c);
};

const getContract = (name: string) => {
  return artifacts.require(name);
};

const getHardhatContracts = (contracts) => {
  return contracts
    .filter((c: any) => c.enabled)
    .reduce((previousValue: any, contract: any) => {
      previousValue[contract.name] = getContract(contract.name);
      previousValue[contract.name].contractName = contract.name;
      return previousValue;
    }, {});
};

const getDefaultOptions = (options) => {
  return {
    unitPrice: unitPrice,
    nbUnits: numberOfUnits,
    votingPeriod: 600,
    gracePeriod: 600,
    tokenAddr: ETH_TOKEN,
    maxChunks: maximumChunks,
    maxAmount,
    maxUnits,
    chainId: 1,
    maxExternalTokens: 100,
    couponCreatorAddress: "0x7D8cad0bbD68deb352C33e80fccd4D8e88b4aBb8",
    kycMaxMembers: 1000,
    kycSignerAddress: "0x7D8cad0bbD68deb352C33e80fccd4D8e88b4aBb8",
    kycFundTargetAddress: "0x823A19521A76f80EC49670BE32950900E8Cd0ED3",
    deployTestTokens: true,
    erc20TokenName: "Test Token",
    erc20TokenSymbol: "TTK",
    erc20TokenDecimals: Number(0),
    erc20TokenAddress: UNITS,
    supplyTestToken1: 1000000,
    supplyTestToken2: 1000000,
    supplyPixelNFT: 100,
    supplyOLToken: toBN("1000000000000000000000000"),
    erc1155TestTokenUri: "1155 test token",
    maintainerTokenAddress: UNITS,
    finalize: options.finalize === undefined || !!options.finalize,
    gasPriceLimit: "2000000000000",
    spendLimitPeriod: "259200",
    spendLimitEth: "2000000000000000000000",
    feePercent: "110",
    gasFixed: "50000",
    gelato: "0x1000000000000000000000000000000000000000",
    daiTokenAddr: "0x6b175474e89094c44da98b954eedeac495271d0f",
    ...options,
  };
};

export const advanceTime = async (time) => {
  await new Promise((resolve, reject) => {
    hre.network.provider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    );
  });

  await new Promise((resolve, reject) => {
    hre.network.provider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_mine",
        params: [],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    );
  });

  return true;
};

export const takeChainSnapshot = async () => {
  return await new Promise((resolve, reject) =>
    hre.network.provider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_snapshot",
        params: [],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        let snapshotId = result.result; // {"id":X,"jsonrpc":"2.0","result":"0x..."}
        return resolve(snapshotId);
      }
    )
  );
};

export const revertChainSnapshot = async (snapshotId) => {
  return await new Promise((resolve, reject) =>
    hre.network.provider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_revert",
        params: [snapshotId],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    )
  ).catch((e) => console.error(e));
};

export const proposalIdGenerator = () => {
  var idCounter = 0;
  return {
    *generator() {
      idCounter++;
      const str = "" + idCounter;

      return `0x${str.padStart(64, "0")}`;
    },
  };
};

export const hardhatContracts = getHardhatContracts(contracts);


export const deployDefaultDao = async (options) => {
  return await deployDao({
    ...getDefaultOptions(options),
    ...hardhatContracts,
    contractConfigs: contracts,
    deployFunction,
  });
};

export const deployDefaultNFTDao = async (options) => {
  const { dao, adapters, extensions, testContracts } = await deployDao({
    ...getDefaultOptions(options),
    deployTestTokens: true,
    finalize: false,
    contractConfigs: contracts,
    ...hardhatContracts,
    deployFunction,
  });

  await dao.finalizeDao({ from: options.owner });

  return {
    dao: dao,
    adapters: adapters,
    extensions: extensions,
    testContracts: contracts,
  };
};

export const deployDaoWithOffchainVoting = async ({ owner, newMember }) => {
  const {
    dao,
    adapters,
    extensions,
    testContracts,
    votingHelpers,
  } = await deployDao({
    ...getDefaultOptions({ owner }),
    offchainVoting: true,
    deployTestTokens: true,
    offchainAdmin: owner,
    finalize: false,
    contractConfigs: contracts,
    ...hardhatContracts,
    deployFunction,
  });

  await dao.potentialNewMember(newMember, {
    from: owner,
  });

  await extensions.bankExt.addToBalance(newMember, UNITS, 1, {
    from: owner,
  });

  await dao.finalizeDao({ from: owner });

  adapters["voting"] = votingHelpers.offchainVoting;

  return {
    dao: dao,
    adapters: adapters,
    extensions: extensions,
    testContracts: testContracts,
    votingHelpers: votingHelpers,
  };
};

export default {
  deployFunction,
  getContractFromOpenZeppelin: getContract,
  getContractFromOpenZeppelinByName: getContractByName,
}

/* Plugins */
import dotenv from 'dotenv';

import '@nomiclabs/hardhat-waffle';
import 'hardhat-contract-sizer';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-truffle5'
import '@nomiclabs/hardhat-web3';
import "hardhat-gas-reporter";

import { HardhatUserConfig } from "hardhat/config";

/**
 * @type import('hardhat/config').HardhatUserConfig
*/
dotenv.config({ path: '../../.env' });

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      accounts: {
        accountsBalance: "10000000000000000000000"
      },
      // forking: {
      //   url: "https://mainnet.infura.io/v3/" + process.env.INFURA_KEY || ""
      // },
      // hardfork: "london"
    },
    mainnet: {
      url: "https://mainnet.infura.io/v3/" + process.env.INFURA_KEY || "",
      gasPrice: 990000000,
      accounts: {
        mnemonic: process.env.WALLET_MNEMONIC || ""
      }
    },
    rinkeby: {
      url: "http://174.138.11.147:8545",
      gasPrice: 4000000000,
      accounts: {
        mnemonic: process.env.WALLET_MNEMONIC || ""
      }
    },
    ropsten: {
      url: "https://ropsten.infura.io/v3/" + process.env.INFURA_KEY || "",
      gasPrice: 4000000000,
      accounts: {
        mnemonic: process.env.WALLET_MNEMONIC || ""
      }
    },
    kovan: {
      url: "https://kovan.optimism.io",
      gasPrice: 15000000,
      accounts: {
        mnemonic: process.env.WALLET_MNEMONIC || ""
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  gasReporter: {
    enabled: true
  },
  paths: {
    sources: "./build/sources"
  },
  mocha: {
    require: ["ts-node/register"],
    timeout: 2000000
  }
};

export default config;

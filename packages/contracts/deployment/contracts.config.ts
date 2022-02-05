// Matches the DaoArtifacts.sol ArtifactType enum
import {
  daoAccessFlagsMap,
  bankExtensionAclFlagsMap,
  erc721ExtensionAclFlagsMap,
  erc1155ExtensionAclFlagsMap,
  erc1271ExtensionAclFlagsMap,
  entryBank,
  entryERC20,
  entryERC721,
  entryERC1155,
  entryERC1271,
  entryExecutor
} from '../utils/access-control-util';

import { extensionsIdsMap, adaptersIdsMap } from '../utils/dao-ids-util';

export enum ContractType {
  CORE,
  FACTORY,
  EXTENSION,
  ADAPTER,
  UTIL,
  TEST,
};

export const contracts = [
  // Test Util build/sources
  {
    id: "ol-token",
    name: "OLToken",
    path: "../build/sources/test/OLToken",
    enabled: true,
    version: "1.0.0",
    type: ContractType.TEST,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: ["supplyOLToken"],
  },
  {
    id: "test-token-1",
    name: "TestToken1",
    alias: "testToken1",
    path: "../build/sources/test/TestToken1",
    enabled: true,
    version: "1.0.0",
    type: ContractType.TEST,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: ["supplyTestToken1"],
  },
  {
    id: "test-token-2",
    name: "TestToken2",
    alias: "testToken2",
    path: "../build/sources/test/TestToken2",
    enabled: true,
    version: "1.0.0",
    type: ContractType.TEST,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: ["supplyTestToken2"],
  },
  {
    id: "test-fairshare-calc",
    name: "TestFairShareCalc",
    path: "../build/sources/test/TestFairShareCalc",
    enabled: true,
    version: "1.0.0",
    type: ContractType.TEST,
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: "pixel-nft",
    name: "PixelNFT",
    alias: "pixelNFT",
    path: "../build/sources/test/PixelNFT",
    enabled: true,
    version: "1.0.0",
    type: ContractType.TEST,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: ["supplyPixelNFT"],
  },
  {
    id: "prox-token",
    name: "ProxTokenContract",
    alias: "proxToken",
    path: "../build/sources/test/ProxToken",
    enabled: true,
    version: "1.0.0",
    type: ContractType.TEST,
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: "erc20-minter",
    name: "ERC20MinterContract",
    path: "../build/sources/test/ERC20Minter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.TEST,
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: "erc1155-test-token",
    name: "ERC1155TestToken",
    alias: "erc1155TestToken",
    path: "../build/sources/test/ERC1155TestToken",
    enabled: true,
    version: "1.0.0",
    type: ContractType.TEST,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: ["erc1155TestTokenUri"],
  },

  // DAO Factories build/sources
  {
    id: "dao-factory",
    name: "DaoFactory",
    path: "../build/sources/core/DaoFactory",
    enabled: true,
    skipAutoDeploy: true,
    version: "1.0.0",
    type: ContractType.FACTORY,
    acls: {
      dao: [],
      extensions: {},
    },
    generatesExtensionId: "dao-registry",
  },
  {
    id: "dao-registry",
    name: "DaoRegistry",
    path: "../build/sources/core/DaoRegistry",
    enabled: true,
    version: "1.0.0",
    type: ContractType.CORE,
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: "bank-factory",
    name: "BankFactory",
    alias: "bankExtFactory",
    path: "../build/sources/extensions/bank/BankFactory",
    enabled: true,
    version: "1.0.0",
    type: ContractType.FACTORY,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: ["daoAddress", "maxExternalTokens"],
    generatesExtensionId: extensionsIdsMap.BANK_EXT,
  },
  {
    id: "endowment-factory",
    name: "EndowmentFactory",
    alias: "endowmnetExtFactory",
    path: "../build/sources/extensions/endowment/EndowmentFactory",
    enabled: true,
    version: "1.0.0",
    type: ContractType.FACTORY,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: ["daoAddress"],
    generatesExtensionId: extensionsIdsMap.ENDOWMENT_EXT,
  },
  {
    id: "erc20-extension-factory",
    name: "ERC20TokenExtensionFactory",
    alias: "erc20ExtFactory",
    path: "../build/sources/extensions/token/erc20/ERC20TokenExtensionFactory",
    enabled: true,
    version: "1.0.0",
    type: ContractType.FACTORY,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: [
      "daoAddress",
      "erc20TokenName",
      "erc20TokenAddress",
      "erc20TokenSymbol",
      "erc20TokenDecimals",
    ],
    generatesExtensionId: extensionsIdsMap.ERC20_EXT,
  },
  {
    id: "erc1155-extension-factory",
    name: "ERC1155TokenExtensionFactory",
    alias: "erc1155ExtFactory",
    path: "../build/sources/extensions/erc1155/ERC1155TokenExtensionFactory",
    enabled: true,
    version: "1.0.0",
    type: ContractType.FACTORY,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: ["daoAddress"],
    generatesExtensionId: extensionsIdsMap.ERC1155_EXT,
  },
  {
    id: "erc1271-extension-factory",
    name: "ERC1271ExtensionFactory",
    alias: "erc1271ExtFactory",
    path: "../build/sources/extensions/erc1271/ERC1271Factory",
    enabled: true,
    version: "1.0.0",
    type: ContractType.FACTORY,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: ["daoAddress"],
    generatesExtensionId: extensionsIdsMap.ERC1271_EXT,
  },
  {
    id: "nft-collection-factory",
    name: "NFTCollectionFactory",
    alias: "erc721ExtFactory",
    path: "../build/sources/extensions/nft/NFTCollectionFactory",
    enabled: true,
    version: "1.0.0",
    type: ContractType.FACTORY,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: ["daoAddress"],
    generatesExtensionId: extensionsIdsMap.ERC721_EXT,
  },
  {
    id: "executor-extension-factory",
    name: "ExecutorExtensionFactory",
    alias: "executorExtFactory",
    path: "../build/sources/extensions/executor/ExecutorFactory",
    enabled: true,
    version: "1.0.0",
    type: ContractType.FACTORY,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: ["daoAddress"],
    generatesExtensionId: extensionsIdsMap.EXECUTOR_EXT,
  },
  {
    id: "bonding-curve-factory",
    name: "BondingCurveFactory",
    alias: "bondingCurveFactory",
    path: "../build/sources/extensions/bondingcurve/BondingCurveFactory",
    enabled: true,
    version: "1.0.0",
    type: ContractType.FACTORY,
    acls: {
      dao: [],
      extensions: {},
    },
    deploymentArgs: ["daoAddress"],
    generatesExtensionId: extensionsIdsMap.BONDING_CURVE_EXT,
  },

  // Extensions
  {
    id: extensionsIdsMap.ERC721_EXT,
    name: "NFTExtension",
    alias: "erc721Ext",
    path: "../build/sources/extensions/nft/NFT",
    enabled: true,
    version: "1.0.0",
    type: ContractType.EXTENSION,
    buildAclFlag: entryERC721,
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: extensionsIdsMap.BANK_EXT,
    name: "BankExtension",
    alias: "bankExt",
    path: "../build/sources/extensions/bank/Bank",
    enabled: true,
    version: "1.0.0",
    type: ContractType.EXTENSION,
    buildAclFlag: entryBank,
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: extensionsIdsMap.ERC20_EXT,
    name: "ERC20Extension",
    alias: "erc20Ext",
    path: "../build/sources/extensions/token/erc20/ERC20TokenExtension",
    enabled: true,
    version: "1.0.0",
    type: ContractType.EXTENSION,
    buildAclFlag: entryERC20,
    acls: {
      dao: [daoAccessFlagsMap.NEW_MEMBER],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.INTERNAL_TRANSFER,
        ],
      },
    },
  },
  {
    id: extensionsIdsMap.ERC1271_EXT,
    name: "ERC1271Extension",
    alias: "erc1271Ext",
    path: "../build/sources/extensions/erc1271/ERC1271",
    enabled: true,
    version: "1.0.0",
    type: ContractType.EXTENSION,
    buildAclFlag: entryERC1271,
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: extensionsIdsMap.EXECUTOR_EXT,
    name: "ExecutorExtension",
    alias: "executorExt",
    path: "../build/sources/extensions/executor/Executor",
    enabled: true,
    version: "1.0.0",
    type: ContractType.EXTENSION,
    buildAclFlag: entryExecutor,
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: extensionsIdsMap.ERC1155_EXT,
    name: "ERC1155TokenExtension",
    alias: "erc1155Ext",
    path: "../build/sources/extensions/erc1155/ERC1155TokenExtension",
    enabled: true,
    version: "1.0.0",
    type: ContractType.EXTENSION,
    buildAclFlag: entryERC1155,
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: extensionsIdsMap.BONDING_CURVE_EXT,
    name: "BondingCurve",
    alias: "bondingCurve",
    path: "../build/sources/extensions/bondingcurve/BondingCurve",
    enabled: true,
    version: "1.0.0",
    type: ContractType.EXTENSION,
    buildAclFlag: () => { },
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: extensionsIdsMap.BANCOR_EXT,
    name: "BancorFormula",
    alias: "bancorFormula",
    path: "../build/sources/extensions/bondingcurve/BancorFormula",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    buildAclFlag: () => { },
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: extensionsIdsMap.ENDOWMENT_EXT,
    name: "Endowment",
    alias: "endowment-bank",
    path: "../build/sources/extensions/endowment/Endowment",
    enabled: true,
    version: "1.0.0",
    type: ContractType.EXTENSION,
    buildAclFlag: () => { },
    acls: {
      dao: [],
      extensions: {},
    },
  },

  // Config Adapters
  {
    id: adaptersIdsMap.UNISWAP_ADD_POOL_V3_ADAPTER,
    name: "UniswapV3AddPoolAdapter",
    alias: "uniswapV3AddPoolAdapter",
    path: "../build/sources/adapters/UniswapV3AddPoolAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {},
    },
  },
  {
    id: adaptersIdsMap.UNISWAP_SUB_POOL_V3_ADAPTER,
    name: "UniswapV3SubPoolAdapter",
    alias: "uniswapV3SubPoolAdapter",
    path: "../build/sources/adapters/UniswapV3SubPoolAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {},
    },
  },
  {
    id: adaptersIdsMap.UNISWAP_ADD_POOL_ADAPTER,
    name: "UniswapAddPoolAdapter",
    alias: "uniswapAddPoolAdapter",
    path: "../build/sources/adapters/UniswapAddPoolAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {},
    },
  },
  {
    id: adaptersIdsMap.UNISWAP_SUB_POOL_ADAPTER,
    name: "UniswapSubPoolAdapter",
    alias: "uniswapSubPoolAdapter",
    path: "../build/sources/adapters/UniswapSubPoolAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {},
    },
  },
  {
    id: adaptersIdsMap.SUSHISWAP_ADD_POOL_ADAPTER,
    name: "SushiswapAddPoolAdapter",
    alias: "sushiswapAddPoolAdapter",
    path: "../build/sources/adapters/SushiswapAddPoolAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {},
    },
  },
  {
    id: adaptersIdsMap.SUSHISWAP_SUB_POOL_ADAPTER,
    name: "SushiswapSubPoolAdapter",
    alias: "sushiswapSubPoolAdapter",
    path: "../build/sources/adapters/SushiswapSubPoolAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {},
    },
  },
  {
    id: adaptersIdsMap.DAO_REGISTRY_ADAPTER,
    name: "DaoRegistryAdapterContract",
    alias: "daoRegistryAdapter",
    path: "../build/sources/adapters/DaoRegistryAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.UPDATE_DELEGATE_KEY],
      extensions: {},
    },
  },
  {
    id: adaptersIdsMap.BANK_ADAPTER,
    name: "BankAdapterContract",
    alias: "bankAdapter",
    path: "../build/sources/adapters/BankAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.WITHDRAW,
          bankExtensionAclFlagsMap.SUB_FROM_BALANCE,
          bankExtensionAclFlagsMap.ADD_TO_BALANCE,
          bankExtensionAclFlagsMap.UPDATE_TOKEN,
        ],
      },
    },
  },
  {
    id: adaptersIdsMap.CONFIGURATION_ADAPTER,
    name: "ConfigurationContract",
    alias: "configuration",
    path: "../build/sources/adapters/Configuration",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [
        daoAccessFlagsMap.SUBMIT_PROPOSAL,
        daoAccessFlagsMap.SET_CONFIGURATION,
      ],
      extensions: {},
    },
  },
  {
    id: adaptersIdsMap.ERC1155_ADAPTER,
    name: "ERC1155AdapterContract",
    alias: "erc1155Adapter",
    path: "../build/sources/adapters/ERC1155Adapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [],
      extensions: {
        [extensionsIdsMap.ERC721_EXT]: [
          erc721ExtensionAclFlagsMap.COLLECT_NFT,
          erc721ExtensionAclFlagsMap.WITHDRAW_NFT,
          erc721ExtensionAclFlagsMap.INTERNAL_TRANSFER,
        ],
        [extensionsIdsMap.ERC1155_EXT]: [
          erc1155ExtensionAclFlagsMap.COLLECT_NFT,
          erc1155ExtensionAclFlagsMap.WITHDRAW_NFT,
          erc1155ExtensionAclFlagsMap.INTERNAL_TRANSFER,
        ],
      },
    },
  },
  {
    id: adaptersIdsMap.MANAGING_ADAPTER,
    name: "ManagingContract",
    alias: "managing",
    path: "../build/sources/adapters/Managing",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [
        daoAccessFlagsMap.SUBMIT_PROPOSAL,
        daoAccessFlagsMap.REPLACE_ADAPTER,
        daoAccessFlagsMap.ADD_EXTENSION,
        daoAccessFlagsMap.REMOVE_EXTENSION,
        daoAccessFlagsMap.SET_CONFIGURATION,
      ],
      extensions: {},
    }
  },
  {
    id: adaptersIdsMap.NFT_ADAPTER,
    name: "NFTAdapterContract",
    alias: "nftAdapter",
    path: "../ybuild/sources/adapters/NFTAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL, daoAccessFlagsMap.NEW_MEMBER],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.SUB_FROM_BALANCE,
          bankExtensionAclFlagsMap.ADD_TO_BALANCE,
        ],
        [extensionsIdsMap.ERC721_EXT]: [
          erc721ExtensionAclFlagsMap.COLLECT_NFT,
          erc721ExtensionAclFlagsMap.WITHDRAW_NFT,
        ],
        [extensionsIdsMap.ERC1155_EXT]: [
          erc1155ExtensionAclFlagsMap.COLLECT_NFT,
          erc1155ExtensionAclFlagsMap.WITHDRAW_NFT,
        ]
      },
    }
  },
  // Signature Adapters
  {
    id: adaptersIdsMap.ERC1271_ADAPTER,
    name: "SignaturesContract",
    alias: "signatures",
    path: "../build/sources/adapters/Signatures",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {
        [extensionsIdsMap.ERC1271_EXT]: [erc1271ExtensionAclFlagsMap.SIGN],
      },
    },
  },
  // Voting Adapters
  {
    id: adaptersIdsMap.VOTING_ADAPTER,
    name: "VotingContract",
    alias: "voting",
    path: "../build/sources/adapters/voting/Voting",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [],
      extensions: {},
    },
    daoConfigs: [["daoAddress", "votingPeriod", "gracePeriod"]],
  },
  {
    id: adaptersIdsMap.SNAPSHOT_PROPOSAL_ADAPTER,
    name: "SnapshotProposalContract",
    alias: "snapshotProposalAdapter",
    path: "../build/sources/adapters/voting/SnapshotProposalContract",
    enabled: true,
    skipAutoDeploy: true,
    version: "1.0.0",
    type: ContractType.UTIL,
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: adaptersIdsMap.VOTING_ADAPTER,
    name: "OffchainVotingContract",
    alias: "voting",
    path: "../build/sources/adapters/voting/OffchainVoting",
    // Disabled because it is not deployed with all the other contracts
    enabled: true,
    skipAutoDeploy: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.ADD_TO_BALANCE,
          bankExtensionAclFlagsMap.SUB_FROM_BALANCE,
          bankExtensionAclFlagsMap.INTERNAL_TRANSFER,
        ],
      },
    },
  },
  {
    id: adaptersIdsMap.VOTING_HASH_ADAPTER,
    name: "OffchainVotingHashContract",
    alias: "offchainVotingHashAdapter",
    path: "../build/sources/adapters/voting/OffchainVotingHash",
    // Disabled because it is not deployed with all the other contracts
    enabled: true,
    skipAutoDeploy: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: adaptersIdsMap.KICK_BAD_REPORTER_ADAPTER,
    name: "KickBadReporterAdapter",
    alias: "kickBadReporterAdapter",
    path: "../build/sources/adapters/voting/KickBadReporterAdapter",
    // Disabled because it is not deployed with all the other contracts
    enabled: true,
    skipAutoDeploy: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [],
      extensions: {},
    },
  },


  // Withdraw / Kick Adapters
  {
    id: adaptersIdsMap.RAGEQUIT_ADAPTER,
    name: "RagequitContract",
    alias: "ragequit",
    path: "../build/sources/adapters/Ragequit",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.INTERNAL_TRANSFER,
          bankExtensionAclFlagsMap.SUB_FROM_BALANCE,
          bankExtensionAclFlagsMap.ADD_TO_BALANCE,
        ],
      },
    },
  },
  {
    id: adaptersIdsMap.GUILDKICK_ADAPTER,
    name: "GuildKickContract",
    alias: "guildkick",
    path: "../build/sources/adapters/GuildKick",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.INTERNAL_TRANSFER,
          bankExtensionAclFlagsMap.SUB_FROM_BALANCE,
          bankExtensionAclFlagsMap.ADD_TO_BALANCE,
          bankExtensionAclFlagsMap.REGISTER_NEW_TOKEN,
        ],
      },
    },
  },
  {
    id: adaptersIdsMap.DISTRIBUTE_ADAPTER,
    name: "DistributeContract",
    alias: "distribute",
    path: "../build/sources/adapters/Distribute",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.INTERNAL_TRANSFER,
        ],
      },
    },
  },

  // Funding/Onboarding Adapters
  {
    id: adaptersIdsMap.FINANCING_ADAPTER,
    name: "FinancingContract",
    alias: "financing",
    path: "../build/sources/adapters/Financing",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.INTERNAL_TRANSFER,
          bankExtensionAclFlagsMap.SUB_FROM_BALANCE,
          bankExtensionAclFlagsMap.ADD_TO_BALANCE,
        ],
      },
    },
  },
  {
    id: adaptersIdsMap.ONBOARDING_ADAPTER,
    name: "OnboardingContract",
    alias: "onboarding",
    path: "../build/sources/adapters/Onboarding",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [
        daoAccessFlagsMap.SUBMIT_PROPOSAL,
        daoAccessFlagsMap.UPDATE_DELEGATE_KEY,
        daoAccessFlagsMap.NEW_MEMBER,
      ],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.ADD_TO_BALANCE,
          bankExtensionAclFlagsMap.INTERNAL_TRANSFER,
        ],
      },
    },
    daoConfigs: [
      //config to mint UNITS
      [
        "daoAddress",
        "unitTokenToMint",
        "unitPrice",
        "nbUnits",
        "maxChunks",
        "tokenAddr",
      ],
      //config to mint LOOT
      [
        "daoAddress",
        "lootTokenToMint",
        "unitPrice",
        "nbUnits",
        "maxChunks",
        "tokenAddr",
      ],
    ],
  },
  {
    id: adaptersIdsMap.COUPON_ONBOARDING_ADAPTER,
    name: "CouponOnboardingContract",
    alias: "couponOnboarding",
    path: "../build/sources/adapters/CouponOnboarding",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.NEW_MEMBER],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.INTERNAL_TRANSFER,
          bankExtensionAclFlagsMap.ADD_TO_BALANCE,
        ],
      },
    },
    daoConfigs: [
      //config to mint coupons
      [
        "daoAddress",
        "couponCreatorAddress",
        extensionsIdsMap.ERC20_EXT
      ],
    ],
    deploymentArgs: ["chainId"]
  },
  {
    id: adaptersIdsMap.TRIBUTE_ADAPTER,
    name: "TributeContract",
    alias: "tribute",
    path: "../build/sources/adapters/Tribute",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL, daoAccessFlagsMap.NEW_MEMBER],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.ADD_TO_BALANCE,
          bankExtensionAclFlagsMap.REGISTER_NEW_TOKEN,
        ],
      },
    },
    daoConfigs: [
      //config to mint UNITS
      ["daoAddress", "unitTokenToMint"],
      //config to mint LOOT
      ["daoAddress", "lootTokenToMint"],
    ],
  },
  {
    id: adaptersIdsMap.TRIBUTE_NFT_ADAPTER,
    name: "TributeNFTContract",
    alias: "tributeNFT",
    path: "../build/sources/adapters/TributeNFT",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL, daoAccessFlagsMap.NEW_MEMBER],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [bankExtensionAclFlagsMap.ADD_TO_BALANCE],
        [extensionsIdsMap.ERC721_EXT]: [erc721ExtensionAclFlagsMap.COLLECT_NFT],
      },
    },
    daoConfigs: [
      //config to mint UNITS
      ["daoAddress"],
    ],
  },
  {
    id: adaptersIdsMap.UNAGII_VAULT_DEPOSIT_ADAPTER,
    alias: "unagiiVaultDepositAdapter",
    name: "UnagiiVaultDepositAdapter",
    path: "../build/sources/adapters/UnagiiVaultDepositAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.ADD_TO_BALANCE,
          bankExtensionAclFlagsMap.SUB_FROM_BALANCE,
          bankExtensionAclFlagsMap.WITHDRAW,
          bankExtensionAclFlagsMap.REGISTER_NEW_TOKEN
        ],
      }
    }
  },
  {
    id: adaptersIdsMap.UNAGII_VAULT_WITHDRAW_ADAPTER,
    alias: "unagiiVaultWithdrawAdapter",
    name: "UnagiiVaultWithdrawAdapter",
    path: "../build/sources/adapters/UnagiiVaultWithdrawAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.ADD_TO_BALANCE,
          bankExtensionAclFlagsMap.SUB_FROM_BALANCE,
          bankExtensionAclFlagsMap.WITHDRAW,
          bankExtensionAclFlagsMap.REGISTER_NEW_TOKEN
        ],
      }
    }
  },
  {
    id: adaptersIdsMap.MOVEMENT_ADAPTER,
    alias: "movementAdapter",
    name: "MovementAdapter",
    path: "../build/sources/adapters/MovementAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL, daoAccessFlagsMap.ADD_MOVEMENT],
      extensions: {}
    }
  },
  {
    id: adaptersIdsMap.INTIATIVE_ADAPTER,
    alias: "intiativeAdapter",
    name: "IntiativeAdapter",
    path: "../build/sources/adapters/IntiativeAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL],
      extensions: {
        [extensionsIdsMap.BANK_EXT]: [
          bankExtensionAclFlagsMap.ADD_TO_BALANCE,
          bankExtensionAclFlagsMap.SUB_FROM_BALANCE,
          bankExtensionAclFlagsMap.WITHDRAW,
          bankExtensionAclFlagsMap.REGISTER_NEW_TOKEN
        ],
      }
    }
  },
  {
    id: adaptersIdsMap.VETOER_ADAPTER,
    alias: "vetoerAdapter",
    name: "VetoerAdapter",
    path: "../build/sources/adapters/VetoerAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL, daoAccessFlagsMap.ADD_VETOER, daoAccessFlagsMap.REMOVE_VETOER],
      extensions: {}
    }
  },
  {
    id: adaptersIdsMap.SERVICE_PROVIDER_ADAPTER,
    alias: "serviceProviderAdapter",
    name: "ServiceProviderAdapter",
    path: "../build/sources/adapters/ServiceProviderAdapter",
    enabled: true,
    version: "1.0.0",
    type: ContractType.ADAPTER,
    acls: {
      dao: [
        daoAccessFlagsMap.SUBMIT_PROPOSAL,
        daoAccessFlagsMap.ADD_SERVICE_PROVIDER,
        daoAccessFlagsMap.REMOVE_SERVICE_PROVIDER
      ],
      extensions: {}
    }
  },

  // Utils
  {
    id: "dao-artifacts",
    name: "DaoArtifacts",
    path: "../build/sources/utils/DaoArtifacts",
    enabled: true,
    skipAutoDeploy: true,
    version: "1.0.0",
    type: ContractType.UTIL,
    acls: {
      dao: [],
      extensions: {},
    },
  },
  {
    id: "multicall",
    name: "Multicall",
    path: "../build/sources/utils/Multicall",
    enabled: true,
    version: "1.0.0",
    type: ContractType.UTIL,
    acls: {
      dao: [],
      extensions: {},
    },
  },
];

export const getConfig = (name: string) => {
  return contracts.find((c) => c.name === name);
};

export const isDeployable = (name: string) => {
  const c = getConfig(name);
  return c && c.enabled;
};

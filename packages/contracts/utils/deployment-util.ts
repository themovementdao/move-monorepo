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

import { entryDao, entryBank } from './access-control-util';
import { adaptersIdsMap, extensionsIdsMap } from './dao-ids-util';

import { UNITS, LOOT, sha3, embedConfigs, web3Instance } from './contract-util';
import { ContractType } from "../deployment/contracts.config";
import { utils } from "ethers";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const isDebug = process.env.DEBUG === "true";
const log = (...data) => {
  if (isDebug) console.log(data.join(""));
};
const error = (...data) => {
  console.error(data.join(""));
};

/**
 * Deploys a contract based on the contract name defined in the config parameter.
 * If the contract is not found in the options object the deployment reverts with an error.
 */
const deployContract = ({ config, options }) => {
  const contract = options[config.name];
  if (!contract)
    throw new Error(`Contract ${config.name} not found in environment options`);

  if (config.deploymentArgs && config.deploymentArgs.length > 0) {
    const args = config.deploymentArgs.map((argName) => {
      const arg = options[argName];
      if (arg !== null && arg !== undefined) return arg;
      throw new Error(
        `Missing deployment argument <${argName}> for ${config.name}`
      );
    });
    return options.deployFunction(contract, args, options.owner);
  }
  return options.deployFunction(contract, null, options.owner);
};

/**
 * Deploys all the contracts defined with Factory type.
 * The contracts must be enabled in the migrations/configs/*.config.ts,
 * and should not be skipped in the auto deploy process.
 * The factory contract must be provided in the options object.
 * If the contract is not found in the options object the deployment reverts with an error.
 */
export const createFactories = async ({ dao, options }) => {
  const factories = {};
  const factoryList = Object.values(options.contractConfigs)
    .filter((config: any) => config.type === ContractType.FACTORY)
    .filter((config: any) => config.enabled)
    .filter((config: any) => !config.skipAutoDeploy);
  log("deploying or reusing ", factoryList.length, " factories...");
  await factoryList.reduce((p: any, config: any) => {
    return p
      .then((_) => {
        const factoryContract = options[config.name];
        if (!factoryContract)
          throw new Error(`Missing factory contract ${config.name}`);

        const extensionConfig = options.contractConfigs.find(
          (c) => c.id === config.generatesExtensionId
        );
        if (!extensionConfig)
          throw new Error(
            `Missing extension config ${config.generatesExtensionId}`
          );

        const extensionContract = options[extensionConfig.name];
        if (!extensionContract)
          throw new Error(`Missing extension contract ${extensionConfig.name}`);

        return options
          .deployFunction(factoryContract, [
            extensionContract,
            extensionConfig.name === 'BondingCurve' ? options.daiTokenAddr : undefined
          ], options.owner)
          .catch((e) => {
            error(`Failed factory deployment [${config.name}].`, e);
            throw e;
          });
      })
      .then(async (factory) => {
        await dao.addFactory(sha3(factory.configs.id), factory.address);;
        return factories[factory.configs.alias] = factory;
      });
  }, Promise.resolve());

  return factories;
};

/**
 * Deploys all the contracts defined with Extension type.
 * The contracts must be enabled in the migrations/configs/*.config.ts,
 * and should not be skipped in the auto deploy process.
 * The extension contract must be provided in the options object.
 * If the contract is not found in the options object the deployment reverts with an error.
 * In order to deploy the extension it uses the factory contract of each extension,
 * so the factories must be deployed first.
 */
export const createExtensions = async ({ dao, factories, options }) => {
  const extensions = {};
  log("create extensions ...");
  const createExtension = async ({ dao, factory, options }) => {
    log("create extension ", factory.configs.alias);
    const factoryConfigs = factory.configs;
    const extensionConfigs = options.contractConfigs.find(
      (c) => c.id === factoryConfigs.generatesExtensionId
    );
    if (!extensionConfigs)
      throw new Error(
        `Missing extension configuration <generatesExtensionId> for in ${factoryConfigs.name} configs`
      );

    if (
      factoryConfigs.deploymentArgs &&
      factoryConfigs.deploymentArgs.length > 0
    ) {
      const args = factoryConfigs.deploymentArgs.map((argName) => {
        const arg = options[argName];
        if (arg !== null && arg !== undefined) return arg;
        throw new Error(
          `Missing deployment argument <${argName}> in ${factoryConfigs.name}.create`
        );
      });
      await factory.create(...args);
    } else {
      await factory.create();
    }

    const extensionAddress = await factory.getExtensionAddress(
      options.daoAddress
    );
    const extensionContract = options[extensionConfigs.name];
    if (!extensionContract)
      throw new Error(
        `Extension contract not found for ${extensionConfigs.name}`
      );

    const newExtension = embedConfigs(
      await extensionContract.at(extensionAddress),
      extensionContract.contractName,
      options.contractConfigs
    );

    if (!newExtension || !newExtension.configs)
      throw new Error(
        `Unable to embed extension configs for ${extensionConfigs.name}`
      );

    await dao.addExtension(
      sha3(newExtension.configs.id),
      newExtension.address,
      options.owner,
      {
        from: options.owner,
      }
    );

    return newExtension;
  };

  await Object.values(factories).reduce(
    (p: any, factory: any) =>
      p
        .then(() =>
          createExtension({
            dao,
            factory,
            options,
          })
        )
        .then((extension) => {
          extensions[extension.configs.alias] = extension;
        })
        .catch((e) => {
          error(`Failed extension deployment ${factory.configs.name}`, e);
          throw e;
        }),
    Promise.resolve()
  );
  return extensions;
};

/**
 * Deploys all the contracts defined with Adapter type.
 * The contracts must be enabled in the migrations/configs/*.config.ts,
 * and should not be skipped in the auto deploy process.
 * The adapter contract must be provided in the options object.
 * If the contract is not found in the options object the deployment reverts with an error.
 */
export const createAdapters = async ({ options }) => {
  const adapters = {};
  const adapterList = Object.values(options.contractConfigs)
    .filter((config: any) => config.type === ContractType.ADAPTER)
    .filter((config: any) => config.enabled)
    .filter((config: any) => !config.skipAutoDeploy);
  log("deploying or re-using ", adapterList.length, " adapters...");
  await adapterList.reduce(
    (p: any, config: any) =>
      p
        .then(() => deployContract({ config, options }))
        .then((adapter) => {
          adapters[adapter.configs.alias] = adapter;
        })
        .catch((e) => {
          error(`Error while creating adapter ${config.name}.`, e);
          throw e;
        }),
    Promise.resolve()
  );

  return adapters;
};

/**
 * Deploys all the utility contracts defined with Util type.
 * The contracts must be enabled in the migrations/configs/*.config.ts,
 * and should not be skipped in the auto deploy process.
 * The util contract must be provided in the options object.
 * If the contract is not found in the options object the deployment reverts with an error.
 */
const createUtilContracts = async ({ options }) => {
  const utilContracts = {};

  await Object.values(options.contractConfigs)
    .filter((config: any) => config.type === ContractType.UTIL)
    .filter((config: any) => config.enabled)
    .filter((config: any) => !config.skipAutoDeploy)
    .reduce(
      (p: any, config: any) =>
        p
          .then(() => deployContract({ config, options }))
          .then((utilContract) => {
            utilContracts[utilContract.configs.alias] = utilContract;
          })
          .catch((e) => {
            error(`Error while creating util contract ${config.name}`, e);
            throw e;
          }),
      Promise.resolve()
    );
  return utilContracts;
};

/**
 * Deploys all the test contracts defined with Test type if flag `deployTestTokens`
 * is enabled in the options. The contracts must be enabled in the migrations/configs/*.config.ts,
 * and should not be skipped in the auto deploy process.
 * The test contract must be provided in the options object.
 * If the contract is not found in the options object the deployment reverts with an error.
 */
const createTestContracts = async ({ options }) => {
  const testContracts = {};

  if (!options.deployTestTokens) return testContracts;

  await Object.values(options.contractConfigs)
    .filter((config: any) => config.type === ContractType.TEST)
    .filter((config: any) => config.enabled)
    .filter((config: any) => !config.skipAutoDeploy)
    .reduce(
      (p: any, config: any) =>
        p
          .then(() => deployContract({ config, options }))
          .then((testContract) => {
            testContracts[testContract.configs.alias] = testContract;
          })
          .catch((e) => {
            error(`Error while creating test contract ${config.name}`, e);
            throw e;
          }),
      Promise.resolve()
    );
  return testContracts;
};

/**
 * Creates the governance config roles in the DAO Registry based on the contract configs.governanceRoles.
 */
const createGovernanceRoles = async ({ options, dao, adapters }) => {
  const readConfigValue = (configName, contractName) => {
    const configValue = options[configName];
    if (!configValue)
      throw new Error(
        `Error while creating governance role [${configName}] for ${contractName}`
      );
    return configValue;
  };

  await Object.values(options.contractConfigs)
    .filter((c: any) => c.enabled)
    .filter((c: any) => c.governanceRoles)
    .reduce((p: any, c: any) => {
      const roles = Object.keys(c.governanceRoles);
      return p.then(() =>
        roles.reduce(
          (q, role) =>
            q.then(async () => {
              const adapter: any = Object.values(adapters).find(
                (a: any) => a.configs.name === c.name
              );
              const configKey = sha3(
                web3Instance.utils.encodePacked(
                  role.replace("$contractAddress", ""),
                  utils.getAddress(adapter.address)
                )
              );
              const configValue = utils.getAddress(
                readConfigValue(c.governanceRoles[role], c.name)
              );
              return await dao.setAddressConfiguration(configKey, configValue, {
                from: options.owner,
              });
            }),
          Promise.resolve()
        )
      );
    }, Promise.resolve());

  if (options.defaultMemberGovernanceToken) {
    const configKey = sha3(web3Instance.utils.encodePacked("governance.role.default"));
    await dao.setAddressConfiguration(
      configKey,
      utils.getAddress(options.defaultMemberGovernanceToken),
      {
        from: options.owner,
      }
    );
  }
};

const validateContractConfigs = (contractConfigs) => {
  if (!contractConfigs) throw Error(`Missing contract configs`);

  const found = new Map();
  Object.values(contractConfigs)
    .filter(
      (c: any) =>
        c.type === ContractType.ADAPTER &&
        c.id !== adaptersIdsMap.VOTING_ADAPTER
    )
    .forEach((c: any) => {
      const current = found.get(c.id);
      if (current) {
        throw Error(`Duplicate contract Id detected: ${c.id}`);
      }
      found.set(c.id, true);
    });
};

/**
 * Deploys all the contracts defined in the migrations/configs/*.config.ts.
 * The contracts must be enabled in the migrations/configs/*.config.ts,
 * and should not be skipped in the auto deploy process.
 * Each one of the contracts must be provided in the options object.
 * If the contract is not found in the options object the deployment reverts with an error.
 * It also configures the DAO with the proper access, and configuration parameters for all
 * adapters and extensions.
 *
 * The Offchain voting is deployed only if it is required via options.offchainVoting parameter.
 *
 * All the deployed contracts will be returned in a map with the aliases defined in the
 * migrations/configs/*.config.ts.
 */
export const deployDao = async (options) => {
  validateContractConfigs(options.contractConfigs);

  const { dao, daoFactory } = await cloneDao({
    ...options,
    name: options.daoName || "test-dao",
  });

  options = {
    ...options,
    daoAddress: dao.address,
    unitTokenToMint: UNITS,
    lootTokenToMint: LOOT,
  };

  const factories: any = await createFactories({ dao, options });
  const extensions: any = await createExtensions({ dao, factories, options });
  const adapters: any = await createAdapters({
    options
  });

  await createGovernanceRoles({ options, dao, adapters });

  await configureDao({
    owner: options.owner,
    dao,
    daoFactory,
    extensions,
    adapters,
    options,
  });

  const votingHelpers: any = await configureOffchainVoting({
    ...options,
    dao,
    daoFactory,
    extensions,
  });

  // If the offchain contract was created, set it to the adapters map using the alias
  if (votingHelpers.offchainVoting) {
    adapters[votingHelpers.offchainVoting.configs.alias] =
      votingHelpers.offchainVoting;
  }

  // deploy utility contracts
  const utilContracts: any = await createUtilContracts({ options });

  // deploy test token contracts for testing convenience
  const testContracts: any = await createTestContracts({ options });

  if (options.finalize) {
    await dao.finalizeDao({ from: options.owner });
  }

  return {
    dao: dao,
    adapters: adapters,
    extensions: extensions,
    testContracts: testContracts,
    utilContracts: utilContracts,
    votingHelpers: votingHelpers,
    factories: { ...factories, daoFactory },
  };
};

/**
 * Creates an instance of the DAO based of the DaoFactory contract.
 * Returns the new DAO instance, and dao name.
 */
export const cloneDao = async ({
  owner,
  creator,
  deployFunction,
  DaoRegistry,
  DaoFactory,
  name,
}) => {
  let daoFactory = await deployFunction(DaoFactory, [DaoRegistry], owner);

  await daoFactory.createDao(name, creator ? creator : owner, { from: owner });

  let _address = await daoFactory.getDaoAddress(name);
  let newDao = await DaoRegistry.at(_address);
  await newDao.addFactory(sha3('dao-factory'), daoFactory.address);
  return { dao: newDao, daoFactory, daoName: name };
};

/**
 * Configures an instance of the DAO to work with the provided factories, extension, and adapters.
 * It ensures that every extension and adapter has the correct ACL Flags enabled to be able to communicate
 * with the DAO instance.
 * Adapters can communicate with the DAO registry, with different extensions or even other adapters.
 * Extensions can communicate with the DAO registry, other extensions and adapters.
 */
const configureDao = async ({
  owner,
  dao,
  daoFactory,
  extensions,
  adapters,
  options,
}) => {
  log("configure new dao ...");
  const configureAdaptersWithDAOAccess = async () => {
    log("configure adapters with access");
    const adaptersWithAccess = Object.values(adapters)
      .filter((a: any) => a.configs.enabled)
      .filter((a: any) => !a.configs.skipAutoDeploy)
      .filter((a: any) => a.configs.acls.dao)
      .reduce((withAccess: any, a: any) => {
        const configs = a.configs;
        withAccess.push(entryDao(configs.id, a.address, configs.acls));
        return withAccess;
      }, []);

    // If an extension needs access to other extension,
    // the extension needs to be added as an adapter to the DAO,
    // but without any ACL flag enabled.
    const contractsWithAccess = Object.values(extensions)
      .filter((e: any) => e.configs.enabled)
      .filter((a: any) => !a.configs.skipAutoDeploy)
      .filter((e: any) => Object.keys(e.configs.acls.extensions).length > 0)
      .reduce((withAccess: any, e: any) => {
        const configs = e.configs;
        const v = entryDao(configs.id, e.address, configs.acls);
        withAccess.push(v);
        return withAccess;
      }, adaptersWithAccess);
    await sleep(10000);
    await daoFactory.addAdapters(dao.address, contractsWithAccess, {
      from: owner
    });
  };

  const configureAdaptersWithDAOParameters = async () => {
    log("configure adapters ...");
    const readConfigValue = (configName, contractName) => {
      // 1st check for configs that are using extension addresses
      if (Object.values(extensionsIdsMap).includes(configName)) {
        const extension: any = Object.values(extensions).find(
          (e: any) => e.configs.id === configName
        );
        if (!extension || !extension.address)
          throw new Error(
            `Error while configuring dao parameter [${configName}] for ${contractName}`
          );
        return extension.address;
      }
      // 2nd lookup for configs in the options object
      const configValue = options[configName];
      if (!configValue)
        throw new Error(
          `Error while configuring dao parameter [${configName}] for ${contractName}`
        );
      return configValue;
    };

    const adapterList = Object.values(adapters)
      .filter((a: any) => a.configs.enabled)
      .filter((a: any) => !a.configs.skipAutoDeploy)
      .filter((a: any) => a.configs.daoConfigs && a.configs.daoConfigs.length > 0)
      .reduce((p: any, adapter: any) => {
        const contractConfigs = adapter.configs;
        return p.then(() =>
          contractConfigs.daoConfigs.reduce(
            (q, configEntry) =>
              q.then(async () => {
                const configValues = configEntry.map((configName) =>
                  readConfigValue(configName, contractConfigs.name)
                );
                try {
                  await sleep(10000);
                  await adapter.configureDao(...configValues);
                } catch (e) {
                  error(
                    `Error while configuring dao with contract ${contractConfigs.name}`,
                    e
                  );
                  throw e;
                }
              }),
            Promise.resolve()
          )
        );
      }, Promise.resolve());
  };

  const configureExtensionAccess = async (contracts, extension) => {
    log("configure extension access for ", extension.configs.alias);
    const withAccess: any = Object.values(contracts).reduce((accessRequired: any, c: any) => {
      const configs = c.configs;
      accessRequired.push(
        extension.configs.buildAclFlag(c.address, configs.acls)
      );
      return accessRequired;
    }, []);
    if (withAccess.length > 0) {
      await sleep(10000);
      await daoFactory.configureExtension(
        dao.address,
        extension.address,
        withAccess,
        { from: owner }
      );
      await sleep(20000);
    }
  };

  /**
   * Configures all the adapters that need access to the DAO and each enabled extension
   */
  const configureAdapters = async () => {
    log("configure adapters ...");
    await sleep(10000);
    await configureAdaptersWithDAOAccess();
    await sleep(10000);
    await configureAdaptersWithDAOParameters();
    await sleep(10000);
    await Object.values(extensions)
      .filter((targetExtension: any) => targetExtension.configs.enabled)
      .filter((targetExtension: any) => !targetExtension.configs.skipAutoDeploy)
      .reduce((p: any, targetExtension: any) => {
        // Filters the enabled adapters that have access to the targetExtension
        const contracts = Object.values(adapters)
          .filter((a: any) => a.configs.enabled)
          .filter((a: any) => !a.configs.skipAutoDeploy)
          .filter((a: any) =>
            // The adapters must have at least 1 ACL flag defined to access the targetExtension
            Object.keys(a.configs.acls.extensions).some(
              (extId) => extId === targetExtension.configs.id
            )
          );

        return p
          .then(() => configureExtensionAccess(contracts, targetExtension))
          .catch((e) => {
            error(
              `Error while configuring adapters access to extension ${targetExtension.configs.name}`,
              e
            );
            throw e;
          });
      }, Promise.resolve());
  };

  /**
   * Configures all the extensions that need access to
   * other enabled extensions
   */
  const configureExtensions = async () => {
    log("configure extensions ...");
    await Object.values(extensions)
      .filter((targetExtension: any) => targetExtension.configs.enabled)
      .reduce((p: any, targetExtension: any) => {
        // Filters the enabled extensions that have access to the targetExtension
        const contracts = Object.values(extensions)
          .filter((e: any) => e.configs.enabled)
          .filter((e: any) => e.configs.id !== targetExtension.configs.id)
          .filter((e: any) =>
            // The other extensions must have at least 1 ACL flag defined to access the targetExtension
            Object.keys(e.configs.acls.extensions).some(
              (extId) => extId === targetExtension.configs.id
            )
          );

        return p
          .then(() => configureExtensionAccess(contracts, targetExtension))
          .catch((e) => {
            error(
              `Error while configuring extensions access to extension ${targetExtension.configs.name}`
            );
            throw e;
          });
      }, Promise.resolve());
  };
  await sleep(10000);
  await configureAdapters();
  await sleep(10000);
  await configureExtensions();
};

/**
 * If the flag `flag options.offchainVoting` is enabled, it deploys and configures all the
 * contracts required to enable the Offchain voting adapter.
 */
const configureOffchainVoting = async ({
  dao,
  daoFactory,
  offchainVoting,
  owner,
  offchainAdmin,
  votingPeriod,
  gracePeriod,
  SnapshotProposalContract,
  KickBadReporterAdapter,
  OffchainVotingContract,
  OffchainVotingHashContract,
  OffchainVotingHelperContract,
  deployFunction,
  extensions,
  chainId
}) => {
  const votingHelpers = {
    snapshotProposalContract: null,
    handleBadReporterAdapter: null,
    offchainVoting: null,
  };

  // Offchain voting is disabled
  if (!offchainVoting) return votingHelpers;

  const currentVotingAdapterAddress = await dao.getAdapterAddress(
    sha3(adaptersIdsMap.VOTING_ADAPTER)
  );

  const snapshotProposalContract = await deployFunction(
    SnapshotProposalContract, [chainId], owner
  );

  const offchainVotingHashContract = await deployFunction(
    OffchainVotingHashContract,
    [snapshotProposalContract.address],
    owner
  );

  const handleBadReporterAdapter = await deployFunction(KickBadReporterAdapter, null, owner);
  const offchainVotingContract = await deployFunction(OffchainVotingContract, [
    currentVotingAdapterAddress,
    offchainVotingHashContract.address,
    snapshotProposalContract.address,
    handleBadReporterAdapter.address,
    offchainAdmin,
  ], owner);

  await daoFactory.updateAdapter(
    dao.address,
    entryDao(
      offchainVotingContract.configs.id,
      offchainVotingContract.address,
      offchainVotingContract.configs.acls
    ),
    {
      from: owner,
    }
  );

  await dao.setAclToExtensionForAdapter(
    extensions.bankExt.address,
    offchainVotingContract.address,
    entryBank(
      offchainVotingContract.address,
      offchainVotingContract.configs.acls
    ).flags,
    { from: owner }
  );

  await offchainVotingContract.configureDao(
    dao.address,
    votingPeriod,
    gracePeriod,
    10,
    { from: owner }
  );

  votingHelpers.offchainVoting = offchainVotingContract;
  votingHelpers.handleBadReporterAdapter = handleBadReporterAdapter;
  votingHelpers.snapshotProposalContract = snapshotProposalContract;

  return votingHelpers;
};

const networks = [
  {
    name: "localhost",
    chainId: 1337,
  },
  {
    name: "rinkeby",
    chainId: 4,
  },
  {
    name: "rinkeby-fork",
    chainId: 4,
  },
  {
    name: "goerli",
    chainId: 5,
  },
  {
    name: "test",
    chainId: 1,
  },
  {
    name: "coverage",
    chainId: 1,
  },
  {
    name: "mainnet",
    chainId: 1,
  },
  {
    name: "harmony",
    chainId: 1666600000,
  },
  {
    name: "harmonytest",
    chainId: 1666700000,
  },
];

export const getNetworkDetails = (name) => {
  return networks.find((n) => n.name === name);
};

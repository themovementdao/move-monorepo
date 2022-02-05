const log = console.log;
import fs from "fs";
import path from "path";

import {
    toBN,
    toWei,
    ETH_TOKEN,
    maximumChunks,
    unitPrice,
    numberOfUnits,
    maxAmount,
    UNITS
} from '../utils/contract-util';

import { deployDao, getNetworkDetails } from '../utils/deployment-util';
import deployConfigs from "../deploy-config";
import hardHatContractImports from '../utils/hardhat-utill';

export const deployTask = async (taskArgs, hre) => {
    const network = hre.hardhatArguments.network;
    log(`Deployment started at: ${new Date().toISOString()}`);
    log(`Deploying tribute-contracts to ${network} network`);

    const { contracts: contractConfigs } = require(`../deployment/${network}.config`);
    const hardHatImports = hardHatContractImports(contractConfigs);
    const daoArtifacts = await getOrCreateDaoArtifacts(hardHatImports);
    const accounts = await hre.ethers.getSigners();

    const deployFunction = hardHatImports.deployFunctionFactory(
        hre,
        daoArtifacts
    );

    const result = await deploy({
        network,
        contractConfigs,
        deployFunction,
        hardHatImports,
        accounts,
    });
    const { dao, factories, extensions, adapters, testContracts, utilContracts } =
        result;
    if (dao) {
        await dao.finalizeDao();
        log("************************************************");
        log(`DaoOwner: ${process.env.DAO_OWNER_ADDR}`);
        log(`DaoRegistry: ${dao.address}`);
        const addresses = {};
        Object.values(factories)
            .concat(Object.values(extensions))
            .concat(Object.values(adapters))
            .concat(Object.values(testContracts))
            .concat(Object.values(utilContracts))
            .forEach((c: any) => {
                log(`${c.configs.name}: ${c.address}`);
                addresses[c.configs.name] = c.address;
            });
        saveDeployedContracts(network, addresses);
    } else {
        log("************************************************");
        log(`"no migration for network "${network}`);
        log("************************************************");
    }
    log(`Deployment completed at: ${new Date().toISOString()}`);
};

const deployRinkebyDao = async ({
    deployFunction,
    contractConfigs,
    network,
    hardHatImports
}) => {
    return await deployDao({
        ...hardHatImports,
        contractConfigs,
        deployFunction,
        unitPrice: toBN(toWei("50", "finney")).toString(),
        nbUnits: toBN("100000").toString(),
        tokenAddr: ETH_TOKEN,
        erc20TokenName: getEnvVar("ERC20_TOKEN_NAME"),
        erc20TokenSymbol: getEnvVar("ERC20_TOKEN_SYMBOL"),
        erc20TokenDecimals: getEnvVar("ERC20_TOKEN_DECIMALS"),
        erc20TokenAddress: UNITS,
        maxChunks: 100000,
        votingPeriod: 600, // 600 secs = 10 mins
        gracePeriod: 600, // 600 secs = 10 mins
        offchainVoting: true,
        chainId: getNetworkDetails(network).chainId,
        deployTestTokens: false,
        finalize: false,
        maxExternalTokens: 100,
        daiTokenAddr: getEnvVar("DAI_TOKEN"),
        couponCreatorAddress: getOptionalEnvVar(
            "COUPON_CREATOR_ADDR",
            getEnvVar("DAO_OWNER_ADDR")
        ),
        daoName: getEnvVar("DAO_NAME"),
        owner: getEnvVar("DAO_OWNER_ADDR"),
        offchainAdmin: getEnvVar("OFFCHAIN_ADMIN_ADDR"),
    });
};

const deployMainnetDao = async ({
    deployFunction,
    contractConfigs,
    network,
    hardHatImports
}) => {
    return await deployDao({
        ...hardHatImports,
        contractConfigs,
        deployFunction,
        unitPrice: toBN(toWei("100", "finney")),
        nbUnits: toBN("100000"),
        tokenAddr: ETH_TOKEN,
        erc20TokenName: getEnvVar("ERC20_TOKEN_NAME"),
        erc20TokenSymbol: getEnvVar("ERC20_TOKEN_SYMBOL"),
        erc20TokenDecimals: getEnvVar("ERC20_TOKEN_DECIMALS"),
        erc20TokenAddress: UNITS,
        maxChunks: toBN("100000"),
        votingPeriod: parseInt(getEnvVar("VOTING_PERIOD_SECONDS")),
        gracePeriod: parseInt(getEnvVar("GRACE_PERIOD_SECONDS")),
        offchainVoting: true,
        chainId: getNetworkDetails(network).chainId,
        deployTestTokens: false,
        daiTokenAddr: getEnvVar("DAI_TOKEN"),
        finalize: false,
        maxExternalTokens: 100,
        couponCreatorAddress: getEnvVar("COUPON_CREATOR_ADDR"),
        daoName: getEnvVar("DAO_NAME"),
        owner: getEnvVar("DAO_OWNER_ADDR"),
        offchainAdmin: getEnvVar("OFFCHAIN_ADMIN_ADDR"),
    });
};

const deployKovanDao = async ({
    deployFunction,
    contractConfigs,
    network,
    hardHatImports
}) => {
    return await deployDao({
        ...hardHatImports,
        contractConfigs,
        deployFunction,
        unitPrice: toBN(toWei("100", "finney")),
        nbUnits: toBN("100000"),
        tokenAddr: ETH_TOKEN,
        erc20TokenName: getEnvVar("ERC20_TOKEN_NAME"),
        erc20TokenSymbol: getEnvVar("ERC20_TOKEN_SYMBOL"),
        erc20TokenDecimals: getEnvVar("ERC20_TOKEN_DECIMALS"),
        erc20TokenAddress: UNITS,
        maxChunks: toBN("100000"),
        votingPeriod: parseInt(getEnvVar("VOTING_PERIOD_SECONDS")),
        gracePeriod: parseInt(getEnvVar("GRACE_PERIOD_SECONDS")),
        offchainVoting: true,
        chainId: getNetworkDetails(network).chainId,
        deployTestTokens: false,
        daiTokenAddr: getEnvVar("DAI_TOKEN"),
        finalize: false,
        maxExternalTokens: 100,
        couponCreatorAddress: getEnvVar("COUPON_CREATOR_ADDR"),
        daoName: getEnvVar("DAO_NAME"),
        owner: getEnvVar("DAO_OWNER_ADDR"),
        offchainAdmin: getEnvVar("OFFCHAIN_ADMIN_ADDR"),
    });
};

const deployHardHatDao = async ({
    deployFunction,
    contractConfigs,
    network,
    accounts,
    hardHatImports
}) => {
    const daoOwnerAddress = accounts[0].address;
    return await deployDao({
        ...hardHatImports,
        contractConfigs,
        deployFunction,
        maxAmount: getOptionalEnvVar("MAX_AMOUNT", maxAmount),
        unitPrice: toBN(toWei("100", "finney")).toString(),
        nbUnits: toBN("100000").toString(),
        tokenAddr: ETH_TOKEN,
        erc20TokenName: getEnvVar("ERC20_TOKEN_NAME"),
        erc20TokenSymbol: getEnvVar("ERC20_TOKEN_SYMBOL"),
        erc20TokenDecimals: getEnvVar("ERC20_TOKEN_DECIMALS"),
        erc20TokenAddress: UNITS,
        maxChunks: toBN("100000").toString(),
        votingPeriod: 120, // 120 secs = 2 mins
        gracePeriod: 60, // 60 secs = 1 min
        offchainVoting: true,
        chainId: getNetworkDetails(network).chainId,
        deployTestTokens: true,
        finalize: false,
        maxExternalTokens: 100,
        erc1155TestTokenUri: "1241 test",
        daiTokenAddr: getEnvVar("DAI_TOKEN"),
        couponCreatorAddress: getOptionalEnvVar(
            "COUPON_CREATOR_ADDR",
            daoOwnerAddress
        ),
        daoName: getEnvVar("DAO_NAME"),
        owner: daoOwnerAddress,
        offchainAdmin: getOptionalEnvVar("OFFCHAIN_ADMIN_ADDR", daoOwnerAddress),
    });
};

const deployTestDao = async ({
    deployFunction,
    contractConfigs,
    network,
    hardHatImports
}) => {
    return await deployDao({
        ...hardHatImports,
        contractConfigs,
        deployFunction,
        unitPrice: unitPrice.toString(),
        nbUnits: numberOfUnits.toString(),
        tokenAddr: ETH_TOKEN,
        erc20TokenName: getEnvVar("ERC20_TOKEN_NAME"),
        erc20TokenSymbol: getEnvVar("ERC20_TOKEN_SYMBOL"),
        erc20TokenDecimals: getEnvVar("ERC20_TOKEN_DECIMALS"),
        erc20TokenAddress: UNITS,
        maxChunks: maximumChunks.toString(),
        votingPeriod: 10, // 10 secs
        gracePeriod: 1, // 1 sec
        offchainVoting: true,
        chainId: getNetworkDetails(network).chainId,
        deployTestTokens: false,
        daiTokenAddr: getEnvVar("DAI_TOKEN"),
        finalize: false,
        maxExternalTokens: 100,
        couponCreatorAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        daoName: getEnvVar("DAO_NAME"),
        owner: getEnvVar("DAO_OWNER_ADDR"),
        offchainAdmin: getEnvVar("OFFCHAIN_ADMIN_ADDR"),
    });
};

const deploy = async (opts) => {
    let res;
    switch (opts.network) {
        case "mainnet":
            res = await deployMainnetDao(opts);
            break;
        case "rinkeby":
            res = await deployRinkebyDao(opts);
            break;
        case "test":
        case "coverage":
            res = await deployTestDao(opts);
            break;
        case "hardhat":
            res = await deployHardHatDao(opts);
            break;
        case "kovan":
            res = await deployKovanDao(opts);
            break;
        default:
            throw new Error(`Unsupported operation ${opts.network}`);
    }
    return res;
};

const getEnvVar = (name) => {
    if (!process.env[name]) throw Error(`Missing env var: ${name}`);
    return process.env[name];
};

const getOptionalEnvVar = (name, defaultValue) => {
    const envVar = process.env[name];
    return envVar ? envVar : defaultValue;
};

const getOrCreateDaoArtifacts = async (hardHatImports) => {
    const DaoArtifacts = hardHatImports.DaoArtifacts;
    let daoArtifacts;
    if (process.env.DAO_ARTIFACTS_CONTRACT_ADDR) {
        console.log(`Attach to existing DaoArtifacts contract`);
        daoArtifacts = await (await DaoArtifacts).attach(
            process.env.DAO_ARTIFACTS_CONTRACT_ADDR
        );
    } else {
        console.log(`Creating new DaoArtifacts contract`);
        const daoArtifact = await (await DaoArtifacts).deploy();
        daoArtifacts = await daoArtifact.deployed();
    }
    log(`DaoArtifacts: ${daoArtifacts.address}`);
    return daoArtifacts;
};

const saveDeployedContracts = (network, addresses) => {
    const now = new Date().toISOString();
    const dir = path.resolve(deployConfigs.deployedContractsDir);
    const file = `${dir}/contracts-${network}-${now}.json`;
    fs.writeFileSync(`${file}`, JSON.stringify(addresses), "utf8");
    log("************************************************");
    log(`\nDeployed contracts: ${file}\n`);
};
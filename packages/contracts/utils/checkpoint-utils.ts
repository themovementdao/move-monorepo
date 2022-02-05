import fs from 'fs';
import path from 'path';

import {
    ContractType
} from '../deployment/contracts.config';

import deployConfigs from '../deploy-config';

const checkpointDir = path.resolve(deployConfigs.checkpointDir);
const checkpointPath = path.resolve(`${checkpointDir}/checkpoints.json`);

const log = (msg) => {
    if (process.env.DEBUG === "true") console.log(msg);
};

const save = (checkpoints) => {
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoints), "utf-8");
};

const load = () => {
    try {
        return JSON.parse(fs.readFileSync(checkpointPath, "utf-8"));
    } catch (e) {
        return {};
    }
};

export const checkpoint = async (contract) => {
    try {
        if (
            contract.configs.type === ContractType.CORE ||
            contract.configs.type === ContractType.FACTORY ||
            contract.configs.type === ContractType.EXTENSION
        ) {
            return contract;
        }

        if (!fs.existsSync(checkpointDir)) {
            fs.mkdirSync(checkpointDir);
        }
        const checkpoints = load();
        checkpoints[contract.configs.name] = {
            address: contract.address,
            ts: new Date().getTime(),
        };
        save(checkpoints);
        log(`Checkpoint: ${contract.configs.name}:${contract.address}`);
    } catch (e) {
        console.error(e);
    }
    return contract;
};

export const restore = async (
    contractInterface,
    contractConfigs
) => {
    const checkpoints = load();
    const checkpoint = checkpoints[contractConfigs.name];
    if (checkpoint) {
        log(`Restored: ${contractConfigs.name}:${checkpoint.address}`);
        return contractInterface.at(checkpoint.address);
    }
    return null;
};
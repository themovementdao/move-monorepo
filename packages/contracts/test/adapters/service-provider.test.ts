import { toBN, sha3, web3Instance } from '../../utils/contract-util';

import { expect } from "chai";

import {
    deployDefaultDao,
    proposalIdGenerator,
    advanceTime
} from '../../utils/hardhat-test-util';

import {
    prepareVoteProposalData,
    SigUtilSigner,
} from '../../utils/offchain-voting-utils';

const proposalCounter = proposalIdGenerator().generator;

function getProposalCounter() {
    return proposalCounter().next().value;
}

describe("Adapter - ServiceProvider", () => {
    const generateMembers = (amount: number) => {
        let newAccounts = [];
        for (let i = 0; i < amount; i++) {
            const account = web3Instance.eth.accounts.create();
            newAccounts.push(account);
        }
        return newAccounts;
    };

    let dao: any;
    let adapters: any;
    let members: any;
    let extensions: any;
    let accounts: any;
    let owner: any;

    before("deployDao", async () => {
        accounts = await web3Instance.eth.getAccounts();
        owner = accounts[1];

        members = generateMembers(5).sort((a, b) =>
            a.address.toLowerCase() < b.address.toLowerCase()
                ? -1
                : a.address.toLowerCase() > b.address.toLowerCase()
                    ? 1
                    : 0
        );

        const deployDao = await deployDefaultDao({
            owner: owner
        });

        dao = deployDao.dao;
        console.log(await dao.getFactoryAddress(sha3('dao-factory')));
        adapters = deployDao.adapters;
        extensions = deployDao.extensions;

        const nameAdapters = Object.keys(adapters);
        expect(nameAdapters.includes('serviceProviderAdapter')).equal(true);
    });

    it("should be possible to submit proposal on to appoint serviceProvider", async () => {
        const serviceProviderAdapter = adapters.serviceProviderAdapter;
        const voting = adapters.voting;
        const blockNumber = await web3Instance.eth.getBlockNumber();

        const action = 1; // 1 - addVetoer 0 - removeVetuer

        const proposalPayload = {
            name: "Add serviceProvider",
            body: `Add fake serviceProvider`,
            choices: ["yes", "no"],
            start: Math.floor(new Date().getTime() / 1000),
            end: Math.floor(new Date().getTime() / 1000) + 10000,
            snapshot: blockNumber.toString(),
        };

        let isServiceProvider = await dao.isServiceProvider(owner);

        expect(isServiceProvider).equal(false);

        const space = "tribute";
        const chainId = 1;

        const proposalData = {
            type: "proposal",
            timestamp: Math.floor(new Date().getTime() / 1000),
            space,
            payload: proposalPayload,
            submitter: members[0].address,
        };

        const proposalId = getProposalCounter();

        //signer for myAccount (its private key)
        const signer = SigUtilSigner(members[0].privateKey);
        // @ts-ignore
        proposalData.sig = await signer(
            proposalData,
            dao.address,
            serviceProviderAdapter.address,
            chainId
        );

        // Submit Proposal

        await serviceProviderAdapter.submitProposal(
            dao.address,
            proposalId,
            owner,
            action,
            prepareVoteProposalData(proposalData, web3Instance),
            {
                from: owner,

            }
        );

        await voting.submitVote(dao.address, proposalId, 1, {
            from: owner,

        });

        console.log("Process proposal before timeout");

        await expect(serviceProviderAdapter.processProposal(dao.address, proposalId, {
            from: owner
        })).to.be.revertedWith("proposal has not been voted on yet");

        await advanceTime(10000);

        // should be able to process before the voting period has ended

        console.log("Process proposal after timeout");

        await serviceProviderAdapter.processProposal(dao.address, proposalId, {
            from: owner,

        });

        isServiceProvider = await dao.isServiceProvider(owner);

        expect(isServiceProvider).equal(true);
    });

    it("should be possible to submit proposal on to remove serviceProvider", async () => {
        const serviceProviderAdapter = adapters.serviceProviderAdapter;
        const onboarding = adapters.onboarding;
        const voting = adapters.voting;
        const blockNumber = await web3Instance.eth.getBlockNumber();

        const action = 0; // 1 - addVetoer 0 - removeVetuer

        const proposalPayload = {
            name: "Remove serviceProvider",
            body: `Add fake serviceProvider`,
            choices: ["yes", "no"],
            start: Math.floor(new Date().getTime() / 1000),
            end: Math.floor(new Date().getTime() / 1000) + 10000,
            snapshot: blockNumber.toString(),
        };

        let isServiceProvider = await dao.isServiceProvider(owner);

        expect(isServiceProvider).equal(true);

        const space = "tribute";
        const chainId = 1;

        const proposalData = {
            type: "proposal",
            timestamp: Math.floor(new Date().getTime() / 1000),
            space,
            payload: proposalPayload,
            submitter: members[0].address,
        };

        const proposalId = getProposalCounter();

        //signer for myAccount (its private key)
        const signer = SigUtilSigner(members[0].privateKey);
        // @ts-ignore
        proposalData.sig = await signer(
            proposalData,
            dao.address,
            onboarding.address,
            chainId
        );

        // Submit Proposal

        await serviceProviderAdapter.submitProposal(
            dao.address,
            proposalId,
            owner,
            action,
            prepareVoteProposalData(proposalData, web3Instance),
            {
                from: owner,

            }
        );

        await voting.submitVote(dao.address, proposalId, 1, {
            from: owner,

        });

        console.log("Process proposal before timeout");

        await expect(serviceProviderAdapter.processProposal(dao.address, proposalId, {
            from: owner
        })).to.be.revertedWith("proposal has not been voted on yet");

        await advanceTime(10000);

        // should be able to process before the voting period has ended

        console.log("Process proposal after timeout");

        await serviceProviderAdapter.processProposal(dao.address, proposalId, {
            from: owner
        });

        isServiceProvider = await dao.isServiceProvider(owner);

        expect(isServiceProvider).equal(false);
    });
});
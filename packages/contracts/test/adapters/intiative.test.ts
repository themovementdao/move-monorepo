import { toBN, GUILD, web3Instance } from '../../utils/contract-util';

import { expect } from "chai";

import {
    deployDefaultDao,
    proposalIdGenerator,
    advanceTime,
    hardhatContracts
} from '../../utils/hardhat-test-util';

import {
    prepareVoteProposalData,
    SigUtilSigner,
} from '../../utils/offchain-voting-utils';

const { OLToken } = hardhatContracts;

const proposalCounter = proposalIdGenerator().generator;

function getProposalCounter() {
    return proposalCounter().next().value;
}

function createFakeMilestones(count: number, amount: number): { date: number, amount: number }[] {
    const fakeMilestones = [];
    for (let i = 0; i < count; i++) {
        fakeMilestones.push({
            date: Math.floor(Date.now() / 1000) + 10000 * count,
            amount
        });
    }
    return fakeMilestones;
}

describe("Adapter - Intiative", () => {
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
    let oltContract: any;
    let accounts: any;
    let owner: any;
    let accRecive: any;

    before("deployDao", async () => {
        accounts = await web3Instance.eth.getAccounts();
        owner = accounts[1];
        accRecive = accounts[2];

        members = generateMembers(5).sort((a, b) =>
            a.address.toLowerCase() < b.address.toLowerCase()
                ? -1
                : a.address.toLowerCase() > b.address.toLowerCase()
                    ? 1
                    : 0
        );

        const supply = toBN("2").pow(toBN("180")).toString();
        oltContract = await OLToken.new(supply, { from: owner });
        const nbOfERC20Units = 100000000;
        const erc20UnitPrice = toBN("10");

        const deployDao = await deployDefaultDao({
            owner: owner,
            unitPrice: erc20UnitPrice,
            nbUnits: nbOfERC20Units,
            tokenAddr: oltContract.address,
        });

        dao = deployDao.dao;

        adapters = deployDao.adapters;
        extensions = deployDao.extensions;

        const nameAdapters = Object.keys(adapters);
        expect(nameAdapters.includes('intiativeAdapter')).equal(true);
    });

    it("if not milestones then revert", async () => {
        const intiativeAdapter = adapters.intiativeAdapter;
        let proposalId = getProposalCounter();
        expect(
            intiativeAdapter.getMilestone(proposalId, 0)
        ).to.be.revertedWith('not found milestones');
    });

    it("should be possible to submit proposal on create intiative", async () => {
        const fakeNameInitiative = "Fake-name-intiative";
        const fakeMilestones = createFakeMilestones(1, 10);

        const fakeSumMilestonesBalance = fakeMilestones.reduce((acc, obj) => { return acc + obj.amount }, 0);

        const initialTokenBalance = 1000;

        const intiativeAdapter = adapters.intiativeAdapter;
        const onboarding = adapters.onboarding;
        const voting = adapters.voting;
        const bank = extensions.bankExt;

        const blockNumber = await web3Instance.eth.getBlockNumber();

        await oltContract.transfer(bank.address, initialTokenBalance, {
            from: owner,
        });

        const proposalPayload = {
            name: fakeNameInitiative,
            body: `Create ${fakeNameInitiative}`,
            choices: ["yes", "no"],
            start: Math.floor(new Date().getTime() / 1000),
            end: Math.floor(new Date().getTime() / 1000) + 10000,
            snapshot: blockNumber.toString(),
        };

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

        await intiativeAdapter.submitProposal(
            dao.address,
            proposalId,
            oltContract.address,
            accRecive,
            fakeMilestones,
            prepareVoteProposalData(proposalData, web3Instance),
            {
                from: owner,

            }
        );

        await voting.submitVote(dao.address, proposalId, 1, {
            from: owner,

        });

        console.log("Process proposal before timeout");

        await expect(intiativeAdapter.processProposal(dao.address, proposalId, {
            from: owner
        })).to.be.revertedWith("proposal has not been voted on yet");

        await advanceTime(10000);

        // should be able to process before the voting period has ended

        console.log("Process proposal after timeout");

        await intiativeAdapter.processProposal(dao.address, proposalId, {
            from: owner,

        });

        const balanceIntiativeAdapter = await bank.balanceOf(intiativeAdapter.address, oltContract.address);

        expect(balanceIntiativeAdapter.toNumber()).to.equal(0);

        const balanceBank = await bank.balanceOf(GUILD, oltContract.address);

        expect(balanceBank.toNumber()).to.equal(0);
    });

    it('should be possible get all milestones counts', async () => {
        const fakeNameInitiative = "Fake-name-intiative";
        const fakeMilestones = createFakeMilestones(1, 10);

        const initialTokenBalance = 1000;

        const intiativeAdapter = adapters.intiativeAdapter;
        const onboarding = adapters.onboarding;
        const voting = adapters.voting;
        const bank = extensions.bankExt;

        const blockNumber = await web3Instance.eth.getBlockNumber();

        await oltContract.transfer(bank.address, initialTokenBalance, {
            from: owner,
        });

        const proposalPayload = {
            name: fakeNameInitiative,
            body: `Create ${fakeNameInitiative}`,
            choices: ["yes", "no"],
            start: Math.floor(new Date().getTime() / 1000),
            end: Math.floor(new Date().getTime() / 1000) + 10000,
            snapshot: blockNumber.toString(),
        };

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

        await intiativeAdapter.submitProposal(
            dao.address,
            proposalId,
            oltContract.address,
            accRecive,
            fakeMilestones,
            prepareVoteProposalData(proposalData, web3Instance),
            {
                from: owner,

            }
        );

        await voting.submitVote(dao.address, proposalId, 1, {
            from: owner,

        });

        console.log("Process proposal before timeout");

        await expect(intiativeAdapter.processProposal(dao.address, proposalId, {
            from: owner
        })).to.be.revertedWith("proposal has not been voted on yet");

        await advanceTime(10000);

        // should be able to process before the voting period has ended

        console.log("Process proposal after timeout");

        await intiativeAdapter.processProposal(dao.address, proposalId, {
            from: owner,

        });

        const countMilestones = await intiativeAdapter.getCountMilestone(proposalId);
        expect(countMilestones.toNumber()).to.equal(1);
    });

    it('should be possible get all milestones', async () => {
        const fakeNameInitiative = "Fake-name-intiative";
        const fakeMilestones = createFakeMilestones(1, 10);

        const initialTokenBalance = 1000;

        const intiativeAdapter = adapters.intiativeAdapter;
        const onboarding = adapters.onboarding;
        const voting = adapters.voting;
        const bank = extensions.bankExt;

        const blockNumber = await web3Instance.eth.getBlockNumber();

        await oltContract.transfer(bank.address, initialTokenBalance, {
            from: owner,
        });

        const proposalPayload = {
            name: fakeNameInitiative,
            body: `Create ${fakeNameInitiative}`,
            choices: ["yes", "no"],
            start: Math.floor(new Date().getTime() / 1000),
            end: Math.floor(new Date().getTime() / 1000) + 10000,
            snapshot: blockNumber.toString(),
        };

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

        await intiativeAdapter.submitProposal(
            dao.address,
            proposalId,
            oltContract.address,
            accRecive,
            fakeMilestones,
            prepareVoteProposalData(proposalData, web3Instance),
            {
                from: owner,

            }
        );

        await voting.submitVote(dao.address, proposalId, 1, {
            from: owner,

        });

        console.log("Process proposal before timeout");

        await expect(intiativeAdapter.processProposal(dao.address, proposalId, {
            from: owner
        })).to.be.revertedWith("proposal has not been voted on yet");

        await advanceTime(10000);

        // should be able to process before the voting period has ended

        console.log("Process proposal after timeout");

        await intiativeAdapter.processProposal(dao.address, proposalId, {
            from: owner,

        });

        const result = await intiativeAdapter.getMilestone(proposalId, 0);
        expect(result).to.be.not.empty;
    });

    it('should not be possible in submit proposal have empty milestones', async () => {
        const fakeNameInitiative = "Fake-name-intiative";

        const intiativeAdapter = adapters.intiativeAdapter;
        const onboarding = adapters.onboarding;

        const blockNumber = await web3Instance.eth.getBlockNumber();

        const proposalPayload = {
            name: fakeNameInitiative,
            body: `Create ${fakeNameInitiative}`,
            choices: ["yes", "no"],
            start: Math.floor(new Date().getTime() / 1000),
            end: Math.floor(new Date().getTime() / 1000) + 10000,
            snapshot: blockNumber.toString(),
        };

        const space = "tribute";
        const chainId = 1;

        const proposalData = {
            type: "proposal",
            timestamp: Math.floor(new Date().getTime() / 1000),
            space,
            payload: proposalPayload,
            submitter: members[0].address,
        };

        let proposalId = getProposalCounter();

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
        expect(intiativeAdapter.submitProposal(
            dao.address,
            proposalId,
            oltContract.address,
            accRecive,
            [],
            prepareVoteProposalData(proposalData, web3Instance),
            {
                from: owner,

            }
        )).to.be.revertedWith("milestones must be non empty");

    });


    it('should not be possible to execute milestone ahead a time', async () => {
        const fakeNameInitiative = "Fake-name-intiative";
        const fakeMilestones = createFakeMilestones(1, 10);

        const initialTokenBalance = 1000;

        const intiativeAdapter = adapters.intiativeAdapter;
        const onboarding = adapters.onboarding;
        const voting = adapters.voting;
        const bank = extensions.bankExt;

        const blockNumber = await web3Instance.eth.getBlockNumber();

        await oltContract.transfer(bank.address, initialTokenBalance, {
            from: owner,
        });

        const proposalPayload = {
            name: fakeNameInitiative,
            body: `Create ${fakeNameInitiative}`,
            choices: ["yes", "no"],
            start: Math.floor(new Date().getTime() / 1000),
            end: Math.floor(new Date().getTime() / 1000) + 10000,
            snapshot: blockNumber.toString(),
        };

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

        await intiativeAdapter.submitProposal(
            dao.address,
            proposalId,
            oltContract.address,
            accRecive,
            fakeMilestones,
            prepareVoteProposalData(proposalData, web3Instance),
            {
                from: owner,

            }
        );

        await voting.submitVote(dao.address, proposalId, 1, {
            from: owner,

        });

        console.log("Process proposal before timeout");

        await expect(intiativeAdapter.processProposal(dao.address, proposalId, {
            from: owner
        })).to.be.revertedWith("proposal has not been voted on yet");

        await advanceTime(10000);

        // should be able to process before the voting period has ended

        console.log("Process proposal after timeout");

        await intiativeAdapter.processProposal(dao.address, proposalId, {
            from: owner,

        });

        await expect(
            intiativeAdapter.executeMilestone(dao.address, proposalId, 0)
        ).to.be.revertedWith('revert');
    });
});
import { web3 } from 'hardhat';
import { expect } from "chai";

import {
    deployDefaultDao,
    proposalIdGenerator,
    advanceTime
} from '../../utils/hardhat-test-util';

const ETH_TOKEN = "0x0000000000000000000000000000000000000000";

const proposalCounter = proposalIdGenerator().generator;

function getProposalCounter() {
    return proposalCounter().next().value;
}

describe("Adapter - Movement", () => {
    let dao: any;
    let adapters: any;
    let accounts: any;
    let myAccount: any;

    before("deployDao", async () => {
        accounts = await web3.eth.getAccounts();
        myAccount = accounts[0];

        const deployDao = await deployDefaultDao({
            owner: myAccount,
            daiTokenAddr: ETH_TOKEN
        });
        dao = deployDao.dao;
        adapters = deployDao.adapters;

        const nameAdapters = Object.keys(adapters);
        expect(nameAdapters.includes('movementAdapter')).equal(true);
    });

    it("should be possible to create a vote for movement", async () => {
        const movementAdapter = adapters.movementAdapter;
        const voting = adapters.voting;

        //Mock data
        const fakeName = 'fakeName';
        const fakeFile = 'fackeFile';

        let proposalId = getProposalCounter();

        const block: any = await web3.eth.getBlock(await web3.eth.getBlockNumber());
        const dataBondingCurve = web3.eth.abi.encodeParameters(
            [
                'uint256', // _buyFeePct
                'uint256', // _sellFeePct 
                'uint256', // _intiative_goal
                'uint256', // _timeStart
                'uint256', // _timeCooldown
                'uint256', // _timeEnd
                'uint256', // _virtualSupply
                'uint256', // _virtualBalance
                'uint256', // _reserveRatio
                'uint256' // _fundingGoal
            ],
            [
                10,
                10,
                web3.utils.toBN("299999999"),
                block.timestamp + 1000000,
                block.timestamp + 100000000,
                block.timestamp + 10000000000,
                web3.utils.toBN("2000000000000000000"),
                web3.utils.toBN("1000000000000000000"),
                10000,
                web3.utils.toBN("50000000000000000000000")
            ]
        );
        await movementAdapter.submitProposal(
            dao.address,
            proposalId,
            {
                tokenSymbol: "BLM",
                tokenName: "BondingCurve",
                votingPeriod: 600,
                file: fakeFile,
                dataBondingCurve
            },
            fakeName,
            [],
            {
                from: myAccount,
                value: web3.utils.toBN("100000000000000000")
            }
        );

        // vote
        await voting.submitVote(dao.address, proposalId, 1, {
            from: myAccount,
        });

        await expect(movementAdapter.processProposal(dao.address, proposalId, {
            from: myAccount
        })).to.be.revertedWith("proposal has not been voted on yet")

        await advanceTime(100000);

        await movementAdapter.processProposal(dao.address, proposalId, {
            from: myAccount
        });
    });
});
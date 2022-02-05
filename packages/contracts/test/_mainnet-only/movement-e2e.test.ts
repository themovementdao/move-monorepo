import { expect } from 'chai';
import { fromWei, sha3, toBN, toWei, web3Instance } from '../../utils/contract-util';
import {
    hardhatContracts,
    proposalIdGenerator,
    deployDefaultDao,
    advanceTime,
    getContractByName
} from '../../utils/hardhat-test-util';

import {
    prepareVoteProposalData,
    SigUtilSigner,
} from '../../utils/offchain-voting-utils';

const { DaoRegistry,
    BondingCurve,
    BondingCurveFactory,
    Endowment,
    ERC20Extension,
    VotingContract,
    IntiativeAdapter } = hardhatContracts;

const proposalCounter = proposalIdGenerator().generator;

function getProposalCounter() {
    return proposalCounter().next().value;
}

async function createFakeMilestones(count: number, amount: number): Promise<any> {
    const fakeMilestones = [];
    const block = await web3Instance.eth.getBlock(await web3Instance.eth.getBlockNumber());
    for (let i = 0; i < count; i++) {
        fakeMilestones.push({
            date: block.timestamp,
            amount
        });
    }
    return fakeMilestones;
};

describe('Movement - test bondingCurve', async () => {
    const generateMembers = (amount: number) => {
        let newAccounts = [];
        for (let i = 0; i < amount; i++) {
            const account = web3Instance.eth.accounts.create();
            newAccounts.push(account);
        }
        return newAccounts;
    };
    let accounts: any;
    let owner: any;

    let dao: any;
    let adapters: any;
    let bondingCurve: any;
    let token: any;
    let urouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let urouter: any;
    let DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
    let daiToken: any;
    let members: any;

    before('Deploy dao', async () => {
        accounts = await web3Instance.eth.getAccounts();
        owner = accounts[0];

        members = generateMembers(5).sort((a, b) =>
            a.address.toLowerCase() < b.address.toLowerCase()
                ? -1
                : a.address.toLowerCase() > b.address.toLowerCase()
                    ? 1
                    : 0
        );

        const deployDao = await deployDefaultDao({ owner });

        urouter = await getContractByName("IUniswapV2Router").at(urouterAddress);

        daiToken = await getContractByName("ERC20Extension").at(DAI);

        const wethAddress = await urouter.WETH();
        const rcpt = await urouter.swapExactETHForTokens(
            toBN("10"),
            [wethAddress.toString(), DAI],
            owner,
            toBN("1650370580"),
            {
                from: owner,
                value: toWei(toBN("90"), "ether"),

            }
        );
        expect(rcpt.receipt.status).to.equal(true);

        const daiAmount = fromWei(await daiToken.balanceOf(owner), "wei");
        console.log("DAI token balance of", owner, "is", daiAmount);

        dao = deployDao.dao;
        adapters = deployDao.adapters;

        const serviceProviderAdapter = adapters.serviceProviderAdapter;
        const onboarding = adapters.onboarding;
        const voting = adapters.voting;
        const blockNumber = await web3Instance.eth.getBlockNumber();

        const action = 1; // 1 - addServiceProvider 0 - removeServiceProvider

        const proposalPayload = {
            name: "Add serviceProvider",
            body: `Add fake serviceProvider`,
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

        await advanceTime(10000);

        console.log("Process proposal after timeout");

        await serviceProviderAdapter.processProposal(dao.address, proposalId, {
            from: owner,

        });

        const isServiceProvider = await dao.isServiceProvider(owner);

        expect(isServiceProvider).equal(true);
    });

    it('test bonding curve', async () => {
        const testNameMovement = "Test movement 1";
        const proposalId = getProposalCounter();

        const daoFactory = await dao.getFactoryAddress(sha3('dao-factory'));
        const bondingCurveFactoryAddr = await dao.getFactoryAddress(sha3('bonding-curve-factory'));
        const bondingCurveFactory = await BondingCurveFactory.at(bondingCurveFactoryAddr);

        const block = await web3Instance.eth.getBlock(await web3Instance.eth.getBlockNumber());
        const dataBondingCurve = web3Instance.eth.abi.encodeParameters(
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
                toBN("299999999"),
                +block.timestamp + 1000000,
                +block.timestamp + 100000000,
                +block.timestamp + 10000000000,
                toBN("2000000000000000000"),
                toBN("1000000000000000000"),
                10000,
                toBN("50000000000000000000000")
            ]
        );
        const movementAdapter = adapters.movementAdapter;
        const voting = adapters.voting;

        //Mock data
        const fakeName = 'fakeName';
        const fakeFile = 'fackeFile';

        console.log("Submit movement proposal");

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
                from: owner,
                value: toBN("100000000000000000"),

            }
        );

        const endowmnetBank = await Endowment.at(await dao.getExtensionAddress(sha3('endowment-bank')));

        const balanceEndowment = await web3Instance.eth.getBalance(endowmnetBank.address);

        expect(balanceEndowment).to.equal("100000000000000000");

        // vote
        await voting.submitVote(dao.address, proposalId, 1, {
            from: owner,

        });

        // should not be able to process before the voting period has ended
        console.log("Process proposal before timeout");
        await expect(movementAdapter.processProposal(dao.address, proposalId, {
            from: owner
        })).to.be.revertedWith('proposal has not been voted on yet');

        await advanceTime(10000);
        // should be able to process before the voting period has ended
        console.log("Process proposal after timeout");

        await movementAdapter.processProposal(dao.address, proposalId, {
            from: owner,

        });

        const movement = await dao.getMovement(proposalId);

        expect(movement.cid).to.equal(fakeFile);
        expect(movement.movement).to.have.string('0x');
        expect(movement.name).equal("fakeName");

        const movementAddress = movement.movement;

        const movementInstance = await DaoRegistry.at(movementAddress);



        const erc20Ext = await ERC20Extension.at(await movementInstance.getExtensionAddress(sha3('erc20-ext')));

        const bondingCurveAddress = await movementInstance.getExtensionAddress(sha3("bonding-curve"));
        bondingCurve = await BondingCurve.at(bondingCurveAddress);


        token = await bondingCurveFactory.token();

        const result = await bondingCurve.getCollateralToken(token);

        console.log("whitelisted = ", result['0']);
        console.log("virtualSupply = ", result['1'].toString());
        console.log("virtualBalance = ", result['2'].toString());
        console.log("reserveRatio = ", result['3'].toString());

        console.log('timeStart = ', (await bondingCurve.timeStart()).toString());
        console.log('timeCooldown = ', (await bondingCurve.timeCooldown()).toString());
        console.log('timeEnd = ', (await bondingCurve.timeEnd()).toString());

        console.log('intiative_goal = ', (await bondingCurve.intiative_goal()).toString());
        console.log('funding_goal = ', (await bondingCurve.funding_goal()).toString());

        await advanceTime(1000000);

        await daiToken.approve(bondingCurve.address, toBN("30000000000000000000000"), { from: owner });

        await bondingCurve.makeBuyOrder(
            owner,
            token,
            toBN("30000000000000000000000"),
            toBN("200")
        );

        let events = await bondingCurve.getPastEvents();

        console.log('EventName ================== ', events[0].event);
        console.log('EventResult ================= ', events[0].returnValues);

        await advanceTime(1000000);

        await daiToken.approve(bondingCurve.address, toBN("30000000000000000000000"), { from: owner });

        await bondingCurve.makeBuyOrder(
            owner,
            token,
            toBN("30000000000000000000000"),
            toBN("200")
        );

        events = await bondingCurve.getPastEvents();

        console.log('EventName ================== ', events[0].event);
        console.log('EventResult ================= ', events[0].returnValues);

        await advanceTime(10000000000);

        console.log('isServiceProvider = ', await dao.isServiceProvider(owner));

        await bondingCurve.withdraw({
            from: owner
        });

        const endowmentBalances = await endowmnetBank.balanceOfErc20(movementInstance.address, DAI);

        console.log("Endowmnet raw = ", endowmentBalances);
        console.log("Edowmnet balances = ", endowmentBalances["1"][0].toString(), endowmentBalances["1"][1].toString());
        console.log("Edowmnet balance = ", (await daiToken.balanceOf(endowmnetBank.address)).toString());

        events = await bondingCurve.getPastEvents();

        console.log('EventName ================== ', events[0].event);
        console.log('EventResult ================= ', events[0].returnValues);


        await bondingCurve.claimTokens({ from: owner });

        events = await bondingCurve.getPastEvents();

        console.log('EventName ================== ', events[0].event);
        console.log('EventResult ================= ', events[0].returnValues);

        console.log("Balance owner = ", (await erc20Ext.balanceOf(owner)).toString());

        const votingAdapter = await VotingContract.at(await movementInstance.getAdapterAddress(sha3('voting')));
        const intiativeAddress = await movementInstance.getAdapterAddress(sha3('intiative-adpt'));
        const intiativeAdapter = await IntiativeAdapter.at(intiativeAddress);

        const blockNumber = await web3Instance.eth.getBlockNumber();

        const proposalPayload = {
            name: "fakeNameInitiative",
            body: `Create fakeNameInitiative`,
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

        const propId = getProposalCounter();

        const signer = SigUtilSigner(members[0].privateKey);
        // @ts-ignore
        proposalData.sig = await signer(
            proposalData,
            movementAddress,
            intiativeAddress,
            chainId
        );

        await intiativeAdapter.submitProposal(
            movementAddress,
            propId,
            DAI,
            accounts[2],
            await createFakeMilestones(1, 10),
            prepareVoteProposalData(proposalData, web3Instance),
            {
                from: owner,

            }
        );

        await votingAdapter.submitVote(movementAddress, propId, 1, {
            from: owner,

        });


        await expect(intiativeAdapter.processProposal(movementAddress, propId, {
            from: owner
        })).to.be.revertedWith('proposal has not been voted on yet');

        await advanceTime(100000);

        await intiativeAdapter.processProposal(movementAddress, propId, {
            from: owner
        });

        const countMilestones = await intiativeAdapter.getCountMilestone(propId);
        console.log("countMilestones = ", countMilestones.toString());
        const milestone = await intiativeAdapter.getMilestone(propId, 0);
        console.log("milestone = ", milestone);

        await advanceTime(10000000);

        await intiativeAdapter.executeMilestone(movementAddress, propId, 0, { from: owner });

        console.log('Account 2 = ', (await daiToken.balanceOf(accounts[2])).toString());
    });

});
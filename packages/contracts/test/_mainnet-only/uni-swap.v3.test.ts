import { assert, expect } from "chai";
import { ethers } from "hardhat";

import { toBN, web3Instance } from '../../utils/contract-util';
import {
    advanceTime,
    deployDefaultDao,
    getContractByName,
    proposalIdGenerator
} from '../../utils/hardhat-test-util';
/*
 * @dev "yarn hardhat test test/_mainnet-only/uni-swap.v3.test.ts"
 */
describe("Adapter - UniSwapV3", () => {
    let accounts: any;
    let owner: any;

    const nullAddress = "0x0000000000000000000000000000000000000000";
    const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
    const deadline = 97000000000;
    const generator = proposalIdGenerator().generator;

    let dao: any;
    let adapters: any;
    let unirouter: any;
    let upool: any;
    let wpool: any;
    let usdc: any;
    let dai: any;
    let liquidity: any;
    let ubalance: any;
    let dbalance: any;

    const buyToken = async (token: string) => {
        const amount = ethers.utils.parseEther('1');
        await unirouter.swapExactETHForTokens(
            1,
            [WETH, token],
            owner,
            deadline,
            {
                from: owner,
                value: amount
            }
        );
    };

    before("deploy dao", async () => {
        accounts = await web3Instance.eth.getAccounts();
        owner = accounts[0];

        unirouter = await getContractByName("IUniswapV2Router").at("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
        const unifactory = await getContractByName("IMyUniswapV3Factory").at("0x1F98431c8aD98523631AE4a59f267346ea31F984");
        upool = await getContractByName("ERC20Extension").at(await unifactory.getPool(USDC, DAI, 500));
        wpool = await getContractByName("ERC20Extension").at(await unifactory.getPool(WETH, DAI, 500));
        usdc = await getContractByName("ERC20Extension").at(USDC);
        dai = await getContractByName("ERC20Extension").at(DAI);

        const deployDao = await deployDefaultDao({
            owner: owner
        });

        dao = deployDao.dao;
        adapters = deployDao.adapters;
    });

    it("should be possible to create a UniSwapV3 ETH/DAI Add Pool proposal, process it and move the ETH/DAI funds to the pool", async () => {
        await buyToken(DAI);

        dbalance = await dai.balanceOf(owner);
        assert(dbalance.gte(0), "bad dai buy");

        const proposalId = generator().next().value;
        const adapter = adapters.uniswapV3AddPoolAdapter;

        await dai.approve(
            adapter.address,
            dbalance,
            {
                from: owner
            }
        );

        const data = web3Instance.eth.abi.encodeParameters(
            [
                'uint256', // tickLower
                'uint256', // tickUpper
                'uint256' // amount
            ],
            [
                toBN(10),
                toBN(200),
                toBN(dbalance)
            ]
        );

        await adapter.submitProposal(
            dao.address,
            proposalId,
            dai.address,
            nullAddress,
            owner,
            data,
            {
                from: owner
            }
        );

        await adapters.voting.submitVote(dao.address, proposalId, 1, { from: owner });
        await advanceTime(10000);

        await adapter.processProposal(
            dao.address,
            proposalId,
            {
                from: owner,
                value: dbalance
            }
        );

        const events = await adapter.getPastEvents();
        const event = events[events.length - 1];
        liquidity = event.args.liquidity;

        //const pbalance = (await wpool.positions("xxx")).liquidity;
        expect(dbalance.toString()).to.equal(liquidity.toString());
    });
});
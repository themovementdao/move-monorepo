import { assert, expect } from "chai";
import { ethers } from "hardhat";
import { toBN, web3Instance } from "../../utils/contract-util";

import {
  advanceTime,
  deployDefaultDao,
  getContractByName,
  proposalIdGenerator,
} from '../../utils/hardhat-test-util';
/*
 * @dev "mocha -r ts-node/register test/_mainnet-only/uni-swap.test.ts --timeout 2000000 --exit --recursive"
 */
describe("Adapter - UniSwap", () => {
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
  let upair: any;
  let wpair: any;
  let usdc: any;
  let dai: any;
  let liquidity: any;
  let ubalance;
  let dbalance;

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
    const unifactory = await getContractByName("IMyUniswapV2Factory").at(await unirouter.factory());
    upair = await getContractByName("ERC20Extension").at(await unifactory.getPair(USDC, DAI));
    wpair = await getContractByName("ERC20Extension").at(await unifactory.getPair(WETH, DAI));
    usdc = await getContractByName("ERC20Extension").at(USDC);
    dai = await getContractByName("ERC20Extension").at(DAI);

    const deployDao = await deployDefaultDao({
      owner: owner
    });

    dao = deployDao.dao;
    adapters = deployDao.adapters;
  });

  it("should be possible to create a UniSwap ETH/DAI Add Pool proposal, process it and move the ETH/DAI funds to the pool", async () => {
    await buyToken(DAI);

    dbalance = await dai.balanceOf(owner);
    assert(dbalance.gte(0), "bad dai buy");

    const proposalId = generator().next().value;
    const adapter = adapters.uniswapAddPoolAdapter;

    await dai.approve(
      adapter.address,
      dbalance,
      {
        from: owner
      }
    );

    const amount = ethers.utils.parseEther('1');
    const data = web3Instance.eth.abi.encodeParameters(
      [
        'uint256', // amountADesired
        'uint256', // amountBDesired
        'uint256', // amountAMin
        'uint256', // amountBMin
        'uint256' // deadline
      ],
      [
        toBN(dbalance),
        toBN(amount.toString()),
        1,
        1,
        deadline
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
        value: amount
      }
    );

    const events = await adapter.getPastEvents();
    const event = events[events.length - 1];
    liquidity = event.args.liquidity;

    const pbalance = await wpair.balanceOf(owner);
    expect(pbalance.toString()).to.equal(liquidity.toString());
  });

  it("should be possible to create a UniSwap ETH/DAI Sub Pool proposal, process it and move the ETH/DAI funds from the pool", async () => {
    const proposalId = generator().next().value;
    const adapter = adapters.uniswapSubPoolAdapter;

    await wpair.approve(
      adapter.address,
      liquidity,
      {
        from: owner
      }
    );

    const data = web3Instance.eth.abi.encodeParameters(
      [
        'uint256', // liquidity
        'uint256', // amountAMin
        'uint256', // amountBMin
        'uint256' // deadline
      ],
      [
        liquidity,
        1,
        1,
        deadline
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

    let _wbalance = await ethers.provider.getBalance(owner);

    await adapter.processProposal(
      dao.address,
      proposalId,
      {
        from: owner
      }
    );

    assert((await ethers.provider.getBalance(owner)).sub(_wbalance).gte(0), "bad eth return");
    const _dbalance = await dai.balanceOf(owner);
    assert(_dbalance.gt(0), "bad dai return");
  });

  it("should be possible to create a UniSwap USDC/DAI Add Pool proposal, process it and move the USDC/DAI funds to the pool", async () => {
    await buyToken(USDC);
    await buyToken(DAI);

    ubalance = await usdc.balanceOf(owner);
    assert(ubalance.gte(0), "bad usdc buy");
    dbalance = await dai.balanceOf(owner);
    assert(dbalance.gte(0), "bad dai buy");

    const proposalId = generator().next().value;
    const adapter = adapters.uniswapAddPoolAdapter;

    await usdc.approve(
      adapter.address,
      ubalance,
      {
        from: owner
      }
    );

    await dai.approve(
      adapter.address,
      dbalance,
      {
        from: owner
      }
    );

    const data = web3Instance.eth.abi.encodeParameters(
      [
        'uint256', // amountADesired
        'uint256', // amountBDesired
        'uint256', // amountAMin
        'uint256', // amountBMin
        'uint256' // deadline
      ],
      [
        toBN(ubalance),
        toBN(dbalance),
        1,
        1,
        deadline
      ]
    );

    await adapter.submitProposal(
      dao.address,
      proposalId,
      usdc.address,
      dai.address,
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
        from: owner
      }
    );

    const events = await adapter.getPastEvents();
    const event = events[events.length - 1];
    liquidity = event.args.liquidity;

    const pbalance = await upair.balanceOf(owner);
    expect(pbalance.toString()).to.equal(liquidity.toString());
  });

  it("should be possible to create a UniSwap USDC/DAI Sub Pool proposal, process it and move the USDC/DAI funds from the pool", async () => {
    const proposalId = generator().next().value;
    const adapter = adapters.uniswapSubPoolAdapter;

    await upair.approve(
      adapter.address,
      liquidity,
      {
        from: owner
      }
    );

    const data = web3Instance.eth.abi.encodeParameters(
      [
        'uint256', // liquidity
        'uint256', // amountAMin
        'uint256', // amountBMin
        'uint256' // deadline
      ],
      [
        liquidity,
        1,
        1,
        deadline
      ]
    );

    await adapter.submitProposal(
      dao.address,
      proposalId,
      usdc.address,
      dai.address,
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
        from: owner
      }
    );

    const _ubalance = await usdc.balanceOf(owner);
    assert(_ubalance.gt(0)), "bad usdc return";
    const _dbalance = await dai.balanceOf(owner);
    assert(_dbalance.gt(0)), "bad dai return";
  });
});
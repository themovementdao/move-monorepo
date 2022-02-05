import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' })

import {
  toBN,
  fromWei,
  toWei,
  web3Instance
} from '../../utils/contract-util';

import { expect } from 'chai';

import {
  deployDefaultDao,
  proposalIdGenerator,
  advanceTime,
  getContractByName
} from '../../utils/hardhat-test-util';

const proposalCounter = proposalIdGenerator().generator;

function getProposalCounter() {
  return proposalCounter().next().value;
}

describe("Adapter - UnagiiVault", () => {
  let accounts: any;
  let owner: any;

  let dao: any

  let adapters: any;
  let extensions: any;
  // set UNAGII_DAI_VAULT_ADDRESS in .env file in the root folder
  let uvaultAddress = process.env.UNAGII_DAI_VAULT_ADDRESS;
  let stcToken: any;
  let uToken: any;
  let urouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  let urouter: any;
  let wethAddress: any;

  before("deploy dao", async () => {

    accounts = await web3Instance.eth.getAccounts();
    owner = accounts[0];


    const deployDao = await deployDefaultDao({
      owner: owner,
    });

    dao = deployDao.dao;
    adapters = deployDao.adapters;
    extensions = deployDao.extensions;

    expect(uvaultAddress).not.equal(undefined);

    console.log("Connect UnagiiVault");
    const uvault = await getContractByName("IUnagiiVault").at(uvaultAddress);
    const stcAddress = await uvault.token();
    const utokenAddress = await uvault.uToken();
    console.log("Connect DaiToken & uToken");
    stcToken = await getContractByName("ERC20Extension").at(stcAddress);
    uToken = await getContractByName("ERC20Extension").at(utokenAddress);
    console.log("Connect UniswapRouter");
    urouter = await getContractByName("IUniswapV2Router").at(urouterAddress);
    wethAddress = await urouter.WETH();
    console.log("WETH:", wethAddress);
  });

  it("should be possible to create a unagii-vault DAI deposit proposal, process it and get the funds when the withdraw proposal processed", async () => {
    const bank = extensions.bankExt;
    const voting = adapters.voting;

    const vaultDepositAdapter = adapters.unagiiVaultDepositAdapter;
    const vaultWithdrawAdapter = adapters.unagiiVaultWithdrawAdapter;

    let stcAmount: any = fromWei(await stcToken.balanceOf(bank.address), "wei");
    console.log("DAI token balance of", bank.address, "is", stcAmount);

    if (stcAmount == 0) {
      // Swap ETH to DAI
      await urouter.swapExactETHForTokens(
        toBN("10"),
        [wethAddress.toString(), stcToken.address],
        bank.address,
        toBN("1650370580"),
        {
          from: owner,
          value: toBN(toWei("1", "ether"))
        }
      );
      stcAmount = fromWei(await stcToken.balanceOf(bank.address), "wei");
      console.log("DAI token balance of", bank.address, "is", stcAmount);
    }

    let proposalId = getProposalCounter();

    console.log("Submit deposit proposal");
    // submit deposit proposal
    await vaultDepositAdapter.submitProposal(
      dao.address,
      proposalId,
      uvaultAddress,
      toBN(stcAmount),
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      {
        from: owner,

      }
    );

    // vote
    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    // should not be able to process before the voting period has ended
    console.log("Process proposal before timeout");

    await expect(vaultDepositAdapter.processProposal(dao.address, proposalId, {
      from: owner
    })).to.be.revertedWith('proposal has not been voted on yet');

    await advanceTime(10000);
    // should be able to process before the voting period has ended
    console.log("Process proposal after timeout");
    await vaultDepositAdapter.processProposal(dao.address, proposalId, {
      from: owner,

    });

    // get uToken balance
    const utokenAmount = fromWei(await uToken.balanceOf(vaultWithdrawAdapter.address), "wei");
    console.log("uToken balance of", vaultWithdrawAdapter.address, "is", utokenAmount);

    proposalId = getProposalCounter();

    console.log("Submit withdraw proposal");
    // submit withdraw proposal
    await vaultWithdrawAdapter.submitProposal(
      dao.address,
      proposalId,
      uvaultAddress,
      toBN(utokenAmount),
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      {
        from: owner,

      }
    );

    // vote
    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    // should not be able to process before the voting period has ended
    console.log("Process proposal before timeout");
    await expect(vaultWithdrawAdapter.processProposal(dao.address, proposalId, {
      from: owner
    })).to.be.revertedWith('proposal has not been voted on yet');

    await advanceTime(10000);
    // should not be able to process becuase block < delay
    console.log("Process proposal after timeout");

    await expect(vaultWithdrawAdapter.processProposal(dao.address, proposalId, {
      from: owner
    })).to.be.revertedWith("block < delay");
  });
});
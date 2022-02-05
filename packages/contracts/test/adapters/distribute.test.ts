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

import { expect } from 'chai';
import {
  unitPrice,
  UNITS,
  GUILD,
  ETH_TOKEN,
  LOOT,
  ESCROW,
  web3Instance,
  fromUtf8,
  toBN,
} from '../../utils/contract-util';

import {
  deployDefaultDao,
  takeChainSnapshot,
  revertChainSnapshot,
  proposalIdGenerator,
  advanceTime
} from '../../utils/hardhat-test-util';

import { onboardingNewMember } from '../../utils/test-utils';

const proposalCounter = proposalIdGenerator().generator;

function getProposalCounter() {
  return proposalCounter().next().value;
}

describe("Adapter - Distribute", () => {
  let daoInstance: any;
  let extensionsInstance: any;
  let adaptersInstance: any;
  let snapshotId: any;
  let accounts: any;
  let owner: any;
  let creator: any;

  before("deploy dao", async () => {
    accounts = await web3Instance.eth.getAccounts();
    owner = accounts[0];
    creator = accounts[9];

    const { dao, adapters, extensions } = await deployDefaultDao({
      owner: owner,
      creator: creator,
    });

    daoInstance = dao;
    extensionsInstance = extensions;
    adaptersInstance = adapters
    snapshotId = await takeChainSnapshot();
  });

  beforeEach(async () => {
    await revertChainSnapshot(snapshotId);
    snapshotId = await takeChainSnapshot();
  });

  // @ts-ignore
  const distributeFundsProposal = async (dao, distributeContract, token, amount, unitHolderArr, sender, proposalId = null) => {
    const newProposalId = proposalId ? proposalId : getProposalCounter();
    await distributeContract.submitProposal(
      dao.address,
      newProposalId,
      unitHolderArr,
      token,
      amount,
      fromUtf8("paying dividends"),
      {
        from: sender
      }
    );

    return { proposalId: newProposalId };
  };

  it("should be possible to distribute funds to only 1 member of the DAO", async () => {
    const daoMember = accounts[3];
    const dao = daoInstance;
    const bank = extensionsInstance.bankExt;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const distributeContract = adaptersInstance.distribute;

    await onboardingNewMember(
      getProposalCounter(),
      dao,
      onboarding,
      voting,
      daoMember,
      owner,
      unitPrice,
      UNITS
    );

    // Checks the Guild Bank Balance
    let guildBalance = await bank.balanceOf(GUILD, ETH_TOKEN);
    expect(toBN(guildBalance).toString()).equal("1200000000000000000");

    // Checks the member units (to make sure it was created)
    let units = await bank.balanceOf(daoMember, UNITS);
    expect(units.toString()).equal("10000000000000000");

    // Submit distribute proposal
    const amountToDistribute = 10;
    let { proposalId } = await distributeFundsProposal(
      dao,
      distributeContract,
      ETH_TOKEN,
      amountToDistribute,
      daoMember,
      owner
    );

    // Vote YES on the proposal
    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner
    });
    await advanceTime(10000);

    // Starts to process the proposal
    await distributeContract.processProposal(dao.address, proposalId, {
      from: daoMember,

    });

    const escrowBalance = await bank.balanceOf(ESCROW, ETH_TOKEN);
    expect(toBN(escrowBalance).toString()).equal(amountToDistribute.toString());

    // Checks the member's internal balance before sending the funds
    let memberBalance = await bank.balanceOf(daoMember, ETH_TOKEN);
    expect(toBN(memberBalance).toString()).equal("0");

    // Distribute the funds to the DAO member
    // We can use 0 index here because the distribution happens for only 1 member
    await distributeContract.distribute(dao.address, 0, {
      from: daoMember,

    });

    memberBalance = await bank.balanceOf(daoMember, ETH_TOKEN);
    expect(memberBalance.toString()).equal(amountToDistribute.toString());

    const newEscrowBalance = await bank.balanceOf(ESCROW, ETH_TOKEN);
    expect(newEscrowBalance.toString()).equal("0");
  });

  it("should be possible to distribute funds to all active members of the DAO", async () => {
    const daoMemberA = accounts[3];
    const daoMemberB = accounts[4];
    const dao = daoInstance;
    const bank = extensionsInstance.bankExt;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const distributeContract = adaptersInstance.distribute;

    await onboardingNewMember(
      getProposalCounter(),
      dao,
      onboarding,
      voting,
      daoMemberA,
      owner,
      unitPrice,
      UNITS,
      toBN(5) // asking for 5 units
    );

    await onboardingNewMember(
      getProposalCounter(),
      dao,
      onboarding,
      voting,
      daoMemberB,
      owner,
      unitPrice,
      UNITS
    );

    // Checks the Guild Bank Balance
    let guildBalance = await bank.balanceOf(GUILD, ETH_TOKEN);
    expect(toBN(guildBalance).toString()).equal("1800000000000000000");

    // Checks the member units (to make sure it was created)
    let unitsMemberA = await bank.balanceOf(daoMemberA, UNITS);
    expect(unitsMemberA.toString()).equal("5000000000000000");
    // Checks the member units (to make sure it was created)
    let unitsMemberB = await bank.balanceOf(daoMemberB, UNITS);
    expect(unitsMemberB.toString()).equal("10000000000000000");

    // Submit distribute proposal
    const amountToDistribute = 15;
    let { proposalId } = await distributeFundsProposal(
      dao,
      distributeContract,
      ETH_TOKEN,
      amountToDistribute,
      "0x0000000000000000000000000000000000000000", //indicates the funds should be distributed to all active members
      owner
    );

    // Vote YES on the proposal
    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });
    await advanceTime(10000);

    // Starts to process the proposal
    await distributeContract.processProposal(dao.address, proposalId, {
      from: owner,

    });

    // Checks the member's internal balance before sending the funds
    let memberABalance = await bank.balanceOf(daoMemberA, ETH_TOKEN);
    expect(toBN(memberABalance).toString()).equal("0");
    let memberBBalance = await bank.balanceOf(daoMemberB, ETH_TOKEN);
    expect(toBN(memberBBalance).toString()).equal("0");

    let numberOfMembers = toBN(await dao.getNbMembers()).toNumber();
    // It is expected to get 5 members:
    // 1 - dao owner
    // 1 - dao factory
    // 1 - dao payer (who paid to create the dao)
    // 2 - dao members
    // But the dao owner and the factory addresses are not active members
    // so they will not receive funds.
    expect(numberOfMembers).equal(5);

    // Distribute the funds to the DAO member
    // toIndex = number of members to process and distribute the funds to all members
    await distributeContract.distribute(dao.address, numberOfMembers, {
      from: owner,

    });

    memberABalance = await bank.balanceOf(daoMemberA, ETH_TOKEN);
    expect(memberABalance.toString()).equal("4"); //4.9999... rounded to 4
    memberBBalance = await bank.balanceOf(daoMemberB, ETH_TOKEN);
    expect(memberBBalance.toString()).equal("9"); //9.9999... rounded to 9
    let ownerBalance = await bank.balanceOf(owner, ETH_TOKEN);
    expect(ownerBalance.toString()).equal("0");
  });

  it("should not be possible to create a proposal with the amount.toEquals to 0", async () => {
    const dao = daoInstance;
    const distributeContract = adaptersInstance.distribute;

    // Submit distribute proposal with invalid amount
    const amountToDistribute = 0;
    await expect(
      distributeContract.submitProposal(
        dao.address,
        getProposalCounter(),
        owner,
        ETH_TOKEN,
        amountToDistribute,
        fromUtf8("paying dividends"),
        {
          from: owner,

        }
      )
    ).to.be.revertedWith("invalid amount");
  });

  it("should not be possible to create a proposal with an invalid token", async () => {
    const dao = daoInstance;
    const distributeContract = adaptersInstance.distribute;

    // Submit distribute proposal with invalid token
    const invalidToken = "0x0000000000000000000000000000000000000123";
    await expect(
      distributeContract.submitProposal(
        dao.address,
        getProposalCounter(),
        owner,
        invalidToken,
        10,
        fromUtf8("paying dividends"),
        {
          from: owner,

        }
      )
    ).to.be.revertedWith("token not allowed");
  });

  it("should not be possible to create a proposal if the sender is not a member", async () => {
    const nonMember = accounts[5];
    const dao = daoInstance;
    const distributeContract = adaptersInstance.distribute;

    await expect(
      distributeContract.submitProposal(
        dao.address,
        getProposalCounter(),
        owner,
        ETH_TOKEN,
        10,
        fromUtf8("paying dividends"),
        {
          from: nonMember, // The sender is not a member

        }
      )
    ).to.be.revertedWith("onlyMember");
  });

  it("should not be possible to create a proposal if the target member does not have units (advisor)", async () => {
    const advisor = accounts[3];
    const dao = daoInstance;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const distributeContract = adaptersInstance.distribute;

    // New member joins as an Advisor (only receives LOOT)
    await onboardingNewMember(
      getProposalCounter(),
      dao,
      onboarding,
      voting,
      advisor,
      owner,
      unitPrice,
      LOOT
    );

    // Submit distribute proposal with a non active member
    await expect(
      distributeContract.submitProposal(
        dao.address,
        getProposalCounter(),
        advisor,
        ETH_TOKEN,
        10,
        fromUtf8("paying dividends"),
        {
          from: owner,

        }
      )
    ).to.be.revertedWith("not enough units");
  });

  it("should not be possible to create a proposal if the a non member is indicated to receive the funds", async () => {
    const nonMember = accounts[3];
    const dao = daoInstance;
    const distributeContract = adaptersInstance.distribute;

    // Submit distribute proposal with a non member
    await expect(
      distributeContract.submitProposal(
        dao.address,
        getProposalCounter(),
        nonMember,
        ETH_TOKEN,
        10,
        fromUtf8("paying dividends"),
        {
          from: owner,

        }
      )
    ).to.be.revertedWith("not enough units");
  });

  it("should not be possible to create more than one proposal using the same proposal id", async () => {
    const daoMember = accounts[3];
    const dao = daoInstance;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const distributeContract = adaptersInstance.distribute;

    await onboardingNewMember(
      getProposalCounter(),
      dao,
      onboarding,
      voting,
      daoMember,
      owner,
      unitPrice,
      UNITS
    );

    // Submit distribute proposal for the 1st time
    let { proposalId } = await distributeFundsProposal(
      dao,
      distributeContract,
      ETH_TOKEN,
      10,
      daoMember,
      owner
    );

    // Submit distribute proposal using the same id
    await expect(
      distributeContract.submitProposal(
        dao.address,
        proposalId,
        daoMember,
        ETH_TOKEN,
        10,
        fromUtf8("paying dividends"),
        {
          from: owner,

        }
      )
    ).to.be.revertedWith("proposalId must be unique");
  });

  it("should not be possible to process a proposal that was not voted on", async () => {
    const daoMemberA = accounts[3];
    const dao = daoInstance;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const distributeContract = adaptersInstance.distribute;

    await onboardingNewMember(
      getProposalCounter(),
      dao,
      onboarding,
      voting,
      daoMemberA,
      owner,
      unitPrice,
      UNITS
    );

    // Submit distribute proposal for the 1st time
    let { proposalId } = await distributeFundsProposal(
      dao,
      distributeContract,
      ETH_TOKEN,
      5,
      daoMemberA,
      owner
    );

    // Starts to process the proposal
    await expect(
      distributeContract.processProposal(dao.address, proposalId, {
        from: owner
      })
    ).to.be.revertedWith("proposal has not been voted on");
  });

  it("should not be possible to distribute if proposal vote result is TIE", async () => {
    const daoMemberA = accounts[3];
    const dao = daoInstance;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const distributeContract = adaptersInstance.distribute;

    await onboardingNewMember(
      getProposalCounter(),
      dao,
      onboarding,
      voting,
      daoMemberA,
      owner,
      unitPrice,
      UNITS
    );

    // Submit distribute proposal for the 1st time
    let { proposalId } = await distributeFundsProposal(
      dao,
      distributeContract,
      ETH_TOKEN,
      5,
      daoMemberA,
      owner
    );

    // Vote YES on the proposal
    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    // Vote NO on the proposal
    await voting.submitVote(dao.address, proposalId, 2, {
      from: daoMemberA,

    });
    await advanceTime(10000);

    // Starts to process the proposal
    await distributeContract.processProposal(dao.address, proposalId, {
      from: owner,

    });

    // Try to distribute funds when the proposal is not in progress
    await expect(
      distributeContract.distribute(dao.address, 0, {
        from: owner
      })
    ).to.be.revertedWith("distribution completed or does not exist");
  });

  it("should not be possible to distribute if proposal vote result is NOT_PASS", async () => {
    const daoMemberA = accounts[3];

    const dao = daoInstance;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const distributeContract = adaptersInstance.distribute;

    await onboardingNewMember(
      getProposalCounter(),
      dao,
      onboarding,
      voting,
      daoMemberA,
      owner,
      unitPrice,
      UNITS
    );

    // Submit distribute proposal for the 1st time
    let { proposalId } = await distributeFundsProposal(
      dao,
      distributeContract,
      ETH_TOKEN,
      5,
      daoMemberA,
      owner
    );

    // Vote NO on the proposal
    await voting.submitVote(dao.address, proposalId, 2, {
      from: owner,

    });

    // Vote NO on the proposal
    await voting.submitVote(dao.address, proposalId, 2, {
      from: daoMemberA,

    });
    await advanceTime(10000);

    // Starts to process the proposal
    await distributeContract.processProposal(dao.address, proposalId, {
      from: owner,

    });

    // Try to distribute funds when the proposal is not in progress
    await expect(
      distributeContract.distribute(dao.address, 0, {
        from: owner
      })
    ).to.be.revertedWith("distribution completed or does not exist");
  });

  it("should not be possible to process a proposal that was already processed", async () => {
    const daoMemberA = accounts[3];
    const dao = daoInstance;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const distributeContract = adaptersInstance.distribute;

    await onboardingNewMember(
      getProposalCounter(),
      dao,
      onboarding,
      voting,
      daoMemberA,
      owner,
      unitPrice,
      UNITS
    );

    // Submit distribute proposal for the 1st time
    let { proposalId } = await distributeFundsProposal(
      dao,
      distributeContract,
      ETH_TOKEN,
      5,
      daoMemberA,
      owner
    );

    // Vote YES on the proposal
    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });
    await advanceTime(10000);

    // Starts to process the proposal
    await distributeContract.processProposal(dao.address, proposalId, {
      from: owner,

    });

    // Attempt to process the same proposal that is already in progress
    await expect(
      distributeContract.processProposal(dao.address, proposalId, {
        from: owner
      })
    ).to.be.revertedWith("flag already set");
  });

  it("should not be possible to process a new proposal if there is another in progress", async () => {
    const daoMemberA = accounts[3];
    const dao = daoInstance;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const distributeContract = adaptersInstance.distribute;

    await onboardingNewMember(
      getProposalCounter(),
      dao,
      onboarding,
      voting,
      daoMemberA,
      owner,
      unitPrice,
      UNITS
    );

    // Submit distribute proposal for the 1st time
    let { proposalId } = await distributeFundsProposal(
      dao,
      distributeContract,
      ETH_TOKEN,
      5,
      daoMemberA,
      owner
    );

    // Vote YES on the proposal
    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });
    await advanceTime(10000);

    // Starts to process the proposal
    await distributeContract.processProposal(dao.address, proposalId, {
      from: owner,

    });

    // Creates a new distribution proposal
    let result = await distributeFundsProposal(
      dao,
      distributeContract,
      ETH_TOKEN,
      5,
      daoMemberA,
      owner
    );

    // Vote YES on the proposal
    await voting.submitVote(dao.address, result.proposalId, 1, {
      from: owner,

    });
    await advanceTime(10000);

    // Attempt to process the new proposal but there is one in progress already
    await expect(
      distributeContract.processProposal(dao.address, result.proposalId, {
        from: owner
      })
    ).to.be.revertedWith("another proposal already in progress");
  });

  it("should not be possible to distribute the funds if the proposal is not in progress", async () => {
    const daoMemberA = accounts[3];
    const dao = daoInstance;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const distributeContract = adaptersInstance.distribute;

    await onboardingNewMember(
      getProposalCounter(),
      dao,
      onboarding,
      voting,
      daoMemberA,
      owner,
      unitPrice,
      UNITS
    );

    // Submit distribute proposal for the 1st time
    await distributeFundsProposal(
      dao,
      distributeContract,
      ETH_TOKEN,
      5,
      daoMemberA,
      owner
    );

    // Try to distribute funds when the proposal is not in progress
    await expect(
      distributeContract.distribute(dao.address, 1, {
        from: owner
      })
    ).to.be.revertedWith("distribution completed or does not exist");
  });
});

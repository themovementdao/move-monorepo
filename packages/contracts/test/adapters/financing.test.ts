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
  toBN,
  web3Instance,
  fromUtf8
} from '../../utils/contract-util';

import {
  deployDefaultDao,
  takeChainSnapshot,
  revertChainSnapshot,
  proposalIdGenerator,
  advanceTime,
} from '../../utils/hardhat-test-util';

import { checkBalance } from '../../utils/test-utils';

const remaining = unitPrice.sub(toBN("50000000000000"));
const expectedGuildBalance = toBN("1200000000000000000");
const proposalCounter = proposalIdGenerator().generator;

function getProposalCounter() {
  return proposalCounter().next().value;
}

describe("Adapter - Financing", () => {
  let daoInstance: any;
  let extensionsInstance: any;
  let adaptersInstance: any;
  let snapshotId: any;
  let accounts: any;
  let myAccount: any;
  let applicant: any;
  let newMember: any;

  before("deploy daoInstance", async () => {
    accounts = await web3Instance.eth.getAccounts();
    myAccount = accounts[1];
    applicant = accounts[2];
    newMember = accounts[3];

    const { dao, adapters, extensions } = await deployDefaultDao({
      owner: myAccount,
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

  it("should be possible to create a financing proposal and get the funds when the proposal pass", async () => {
    const bank = extensionsInstance.bankExt;
    const voting = adaptersInstance.voting;
    const financing = adaptersInstance.financing;
    const onboarding = adaptersInstance.onboarding;
    const bankAdapter = adaptersInstance.bankAdapter;

    let proposalId = getProposalCounter();

    //Add funds to the Guild Bank after sposoring a member to join the Guild
    await onboarding.submitProposal(
      daoInstance.address,
      proposalId,
      newMember,
      UNITS,
      unitPrice.mul(toBN(10)).add(remaining),
      [],
      {
        from: myAccount
      }
    );

    await voting.submitVote(daoInstance.address, proposalId, 1, {
      from: myAccount,
    });
    //should not be able to process before the voting period has ended
    await expect(onboarding.processProposal(daoInstance.address, proposalId, {
      from: myAccount,
      value: unitPrice.mul(toBN(10)).add(remaining)
    })).to.be.revertedWith("proposal has not been voted on yet");

    await advanceTime(10000);

    await onboarding.processProposal(daoInstance.address, proposalId, {
      from: myAccount,
      value: unitPrice.mul(toBN(10)).add(remaining),
    });
    //Check Guild Bank Balance
    checkBalance(bank, GUILD, ETH_TOKEN, expectedGuildBalance);

    //Create Financing Request
    let requestedAmount = toBN(50000);
    proposalId = getProposalCounter();
    await financing.submitProposal(
      daoInstance.address,
      proposalId,
      applicant,
      ETH_TOKEN,
      requestedAmount,
      fromUtf8(""),
      { from: myAccount }
    );

    //Member votes on the Financing proposal
    await voting.submitVote(daoInstance.address, proposalId, 1, {
      from: myAccount,
    });

    //Check applicant balance before Financing proposal is processed
    checkBalance(bank, applicant, ETH_TOKEN, "0");

    //Process Financing proposal after voting
    await advanceTime(10000);
    await financing.processProposal(daoInstance.address, proposalId, {
      from: myAccount,
    });

    //Check Guild Bank balance to make sure the transfer has happened
    checkBalance(
      bank,
      GUILD,
      ETH_TOKEN,
      expectedGuildBalance.sub(requestedAmount)
    );
    //Check the applicant token balance to make sure the funds are available in the bank for the applicant account
    checkBalance(bank, applicant, ETH_TOKEN, requestedAmount);

    const ethBalance = await web3Instance.eth.getBalance(applicant);
    await bankAdapter.withdraw(daoInstance.address, applicant, ETH_TOKEN, {
      from: myAccount,
    });
    checkBalance(bank, applicant, ETH_TOKEN, 0);
    const ethBalance2 = await web3Instance.eth.getBalance(applicant);
    expect(toBN(ethBalance).add(requestedAmount).toString()).equal(
      ethBalance2.toString()
    );
  });

  it("should not be possible to get the money if the proposal fails", async () => {
    const voting = adaptersInstance.voting;
    const financing = adaptersInstance.financing;
    const onboarding = adaptersInstance.onboarding;

    //Add funds to the Guild Bank after sposoring a member to join the Guild
    let proposalId = getProposalCounter();
    await onboarding.submitProposal(
      daoInstance.address,
      proposalId,
      newMember,
      UNITS,
      unitPrice.mul(toBN(10)).add(remaining),
      [],
      {
        from: myAccount,
      }
    );

    await voting.submitVote(daoInstance.address, proposalId, 1, {
      from: myAccount,
    });
    await advanceTime(10000);

    await onboarding.processProposal(daoInstance.address, proposalId, {
      from: myAccount,
      value: unitPrice.mul(toBN(10)).add(remaining),
    });

    //Create Financing Request
    let requestedAmount = toBN(50000);
    proposalId = "0x2";
    await financing.submitProposal(
      daoInstance.address,
      proposalId,
      applicant,
      ETH_TOKEN,
      requestedAmount,
      fromUtf8(""),
      {
        from: myAccount,
      }
    );

    //Member votes on the Financing proposal
    await voting.submitVote(daoInstance.address, proposalId, 2, {
      from: myAccount,
    });

    //Process Financing proposal after voting
    await advanceTime(10000);

    await expect(financing.processProposal(daoInstance.address, proposalId, {
      from: myAccount,
    })).to.be.revertedWith("proposal needs to pass");
  });

  it("should not be possible to submit a proposal with a token that is not allowed", async () => {
    const voting = adaptersInstance.voting;
    const financing = adaptersInstance.financing;
    const onboarding = adaptersInstance.onboarding;

    let proposalId = getProposalCounter();
    //Add funds to the Guild Bank after sposoring a member to join the Guild
    await onboarding.submitProposal(
      daoInstance.address,
      proposalId,
      newMember,
      UNITS,
      unitPrice.mul(toBN(10)).add(remaining),
      [],
      {
        from: myAccount,

      }
    );

    await voting.submitVote(daoInstance.address, proposalId, 1, {
      from: myAccount,

    });
    await advanceTime(10000);

    await onboarding.processProposal(daoInstance.address, proposalId, {
      from: myAccount,
      value: unitPrice.mul(toBN(10)).add(remaining),

    });

    proposalId = getProposalCounter();
    const invalidToken = "0x6941a80e1a034f57ed3b1d642fc58ddcb91e2596";
    //Create Financing Request with a token that is not allowed
    let requestedAmount = toBN(50000);
    await expect(financing.submitProposal(
      daoInstance.address,
      proposalId,
      applicant,
      invalidToken,
      requestedAmount,
      fromUtf8("")
    )).to.be.revertedWith("token not allowed");
  });

  it("should not be possible to submit a proposal to request funding with an amount.toEqual to zero", async () => {
    const voting = adaptersInstance.voting;
    const financing = adaptersInstance.financing;
    const onboarding = adaptersInstance.onboarding;

    let proposalId = getProposalCounter();
    //Add funds to the Guild Bank after sposoring a member to join the Guild
    await onboarding.submitProposal(
      daoInstance.address,
      proposalId,
      newMember,
      UNITS,
      unitPrice.mul(toBN(10)).add(remaining),
      [],
      {
        from: myAccount,

      }
    );

    await voting.submitVote(daoInstance.address, proposalId, 1, {
      from: myAccount,

    });
    await advanceTime(10000);

    await onboarding.processProposal(daoInstance.address, proposalId, {
      from: myAccount,
      value: unitPrice.mul(toBN(10)).add(remaining),

    });

    proposalId = getProposalCounter();
    // Create Financing Request with amount = 0
    let requestedAmount = toBN(0);
    await expect(financing.submitProposal(
      daoInstance.address,
      proposalId,
      applicant,
      ETH_TOKEN,
      requestedAmount,
      fromUtf8("")
    )).to.be.revertedWith("invalid requested amount");
  });

  it("should not be possible to request funding with an invalid proposal id", async () => {
    const financing = adaptersInstance.financing;

    let invalidProposalId = "0x0";
    await expect(financing.submitProposal(
      daoInstance.address,
      invalidProposalId,
      applicant,
      ETH_TOKEN,
      toBN(10),
      fromUtf8("")
    )).to.be.revertedWith("invalid proposalId");
  });

  it("should not be possible to reuse a proposalId", async () => {
    const financing = adaptersInstance.financing;
    const onboarding = adaptersInstance.onboarding;

    let proposalId = getProposalCounter();

    //Add funds to the Guild Bank after sposoring a member to join the Guild
    await onboarding.submitProposal(
      daoInstance.address,
      proposalId,
      newMember,
      UNITS,
      unitPrice.mul(toBN(10)).add(remaining),
      [],
      {
        from: myAccount,

      }
    );

    let reusedProposalId = proposalId;
    await expect(financing.submitProposal(
      daoInstance.address,
      reusedProposalId,
      applicant,
      ETH_TOKEN,
      toBN(50000),
      fromUtf8("")
    )).to.be.revertedWith("proposalId must be unique");
  });

  it("should not be possible to process a proposal that does not exist", async () => {
    let proposalId = getProposalCounter();
    await expect(adaptersInstance.financing.processProposal(
      daoInstance.address,
      proposalId,
      {
        from: myAccount,
      }
    )).to.be.revertedWith("adapter not found");
  });
});

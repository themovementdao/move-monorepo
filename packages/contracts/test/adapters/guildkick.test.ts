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
  LOOT,
  GUILD,
  ETH_TOKEN,
  web3Instance,
  toBN,
  sha3,
} from '../../utils/contract-util';

import {
  deployDefaultDao,
  takeChainSnapshot,
  revertChainSnapshot,
  proposalIdGenerator,
  advanceTime
} from '../../utils/hardhat-test-util';

import {
  onboardingNewMember,
  submitNewMemberProposal,
  guildKickProposal,
} from '../../utils/test-utils';

const proposalCounter = proposalIdGenerator().generator;

function getProposalCounter() {
  return proposalCounter().next().value;
}

describe("Adapter - GuildKick", () => {
  let daoInstance: any;
  let extensionsInstance: any;
  let adaptersInstance: any;
  let snapshotId: any;
  let accounts: any;
  let owner: any;

  before("deploy dao", async () => {
    accounts = await web3Instance.eth.getAccounts();
    owner = accounts[1];
    const { dao, adapters, extensions } = await deployDefaultDao({ owner });
    daoInstance = dao;
    extensionsInstance = extensions;
    adaptersInstance = adapters
    snapshotId = await takeChainSnapshot();
  });

  beforeEach(async () => {
    await revertChainSnapshot(snapshotId);
    snapshotId = await takeChainSnapshot();
  });

  it("should be possible to kick a DAO member", async () => {
    const newMember = accounts[2];

    const bank = extensionsInstance.bankExt;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMember,
      owner,
      unitPrice,
      UNITS
    );

    //Check Guild Bank Balance
    const guildBalance = await bank.balanceOf(GUILD, ETH_TOKEN);
    expect(guildBalance.toString()).equal("1200000000000000000");

    //Check Member Units & Loot
    let units = await bank.balanceOf(newMember, UNITS);
    expect(units.toString()).equal("10000000000000000");
    let loot = await bank.balanceOf(newMember, LOOT);
    expect(loot.toString()).equal("0");

    //SubGuildKick
    const memberToKick = newMember;
    const kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      adaptersInstance.guildkick,
      memberToKick,
      owner,
      kickProposalId
    );

    //Vote YES on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: owner,

    });
    await advanceTime(10000);

    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: owner,

    });

    // Check Member Units & Loot, it should be 0 because both were subtracted from internal
    units = await bank.balanceOf(newMember, UNITS);
    expect(units.toString()).equal("0");
    loot = await bank.balanceOf(newMember, LOOT);
    expect(loot.toString()).equal("0");
  });

  it("should not be possible for a non-member to submit a guild kick proposal", async () => {
    const owner = accounts[5];
    const nonMember = accounts[2];

    // Non member attemps to submit a guild kick proposal
    const memberToKick = owner;
    const newProposalId = getProposalCounter();
    await expect(
      guildKickProposal(
        daoInstance,
        adaptersInstance.guildkick,
        memberToKick,
        nonMember,
        newProposalId
      )
    ).to.be.revertedWith("onlyMember");
  });

  it("should not be possible for a non-active member to submit a guild kick proposal", async () => {
    const newMember = accounts[2];
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMember,
      owner,
      unitPrice,
      UNITS
    );

    // Start a new kick poposal
    let memberToKick = newMember;
    let kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberToKick,
      owner,
      kickProposalId
    );

    //Vote YES on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: owner,

    });
    await advanceTime(10000);

    // The member gets kicked out of the DAO
    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: owner
    });

    // The kicked member which is now inactive attemps to submit a kick proposal
    // to kick the member that started the previous guild kick
    const newProposalId = getProposalCounter();
    await expect(guildKickProposal(
      daoInstance,
      adaptersInstance.guildkick,
      owner,
      memberToKick,
      newProposalId
    )).to.be.revertedWith("onlyMember");
  });

  it("should be possible for a non-member to process a kick proposal", async () => {
    const member = owner;
    const newMemberA = accounts[2];
    const nonMember = accounts[3];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMemberA,
      owner,
      unitPrice,
      UNITS
    );

    // Start a new kick poposal
    let memberToKick = newMemberA;
    let kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberToKick,
      member,
      kickProposalId
    );

    //Vote YES on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: member,

    });
    await advanceTime(10000);

    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: nonMember,

    });
  });

  it("should not be possible to process a kick proposal that was already processed", async () => {
    const member = owner;
    const newMember = accounts[2];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMember,
      member,
      unitPrice,
      UNITS
    );

    // Start a new kick poposal
    let memberToKick = newMember;
    let kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberToKick,
      member,
      kickProposalId
    );

    //Vote YES on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: member,

    });
    await advanceTime(10000);

    // The member gets kicked out of the DAO
    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: member,

    });

    // The member attempts to process the same proposal again
    await expect(
      guildkickContract.processProposal(daoInstance.address, kickProposalId, {
        from: member,

      })
    ).to.be.revertedWith("flag already set");
  });

  it("should not be possible to process a kick proposal that does not exist", async () => {
    const member = owner;
    const newMember = accounts[2];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMember,
      member,
      unitPrice,
      UNITS
    );

    // Start a new kick poposal
    let memberToKick = newMember;
    let kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberToKick,
      member,
      kickProposalId
    );

    // Vote YES on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: member,

    });
    await advanceTime(10000);

    // The member attempts to process the same proposal again
    let invalidKickProposalId = getProposalCounter();
    await expect(
      guildkickContract.processProposal(
        daoInstance.address,
        invalidKickProposalId,
        {
          from: member,

        }
      )
    ).to.be.revertedWith("proposal does not exist for this dao");
  });

  it("should not be possible to process a kick proposal if the voting did not pass", async () => {
    const member = owner;
    const newMember = accounts[2];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMember,
      member,
      unitPrice,
      UNITS
    );

    const bank = extensionsInstance.bankExt;
    // Start a new kick poposal
    let memberToKick = newMember;
    let kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberToKick,
      member,
      kickProposalId
    );

    //Vote NO on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 2, {
      from: member,

    });
    await advanceTime(10000);
    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: member,

    });

    let memberLoot = await bank.balanceOf(memberToKick, LOOT);
    expect(memberLoot.toString()).equal("0");
    let memberUnits = await bank.balanceOf(memberToKick, UNITS);
    expect(memberUnits.toString()).equal("10000000000000000");
  });

  it("should not be possible to process a kick proposal if the member to kick does not have any units nor loot", async () => {
    const member = owner;
    const advisor = accounts[3];
    const nonMember = accounts[4];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;

    // New member joins as an Advisor (only receives LOOT)
    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      advisor,
      member,
      unitPrice,
      LOOT
    );

    // The member attemps to process the kick proposal, but the Advisor does not have any UNITS, only LOOT
    await expect(
      guildKickProposal(
        daoInstance,
        guildkickContract,
        nonMember,
        member,
        getProposalCounter()
      )
    ).to.be.revertedWith("no units or loot");
  });

  it("should not be possible for a kicked member to sponsor an onboarding proposal", async () => {
    const member = owner;
    const newMember = accounts[2];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMember,
      member,
      unitPrice,
      UNITS
    );

    //SubGuildKick
    let memberToKick = newMember;
    let kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberToKick,
      member,
      kickProposalId
    );

    //Vote YES on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: member,

    });
    await advanceTime(10000);

    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: member,

    });

    // Member must be inactive after the kick has happened
    let kickedMember = memberToKick;

    // Submit proposal to onboard new member
    let newMemberB = accounts[3];
    let onboardProposalId = getProposalCounter();
    await submitNewMemberProposal(
      onboardProposalId,
      member,
      onboarding,
      daoInstance,
      newMemberB,
      unitPrice,
      UNITS,
      toBN(10)
    );
  });

  it("should not be possible for a kicked member to vote on in an onboarding proposal", async () => {
    const member = owner;
    const newMember = accounts[2];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMember,
      member,
      unitPrice,
      UNITS
    );

    // Submit guild kick proposal
    let memberToKick = newMember;
    let kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberToKick,
      member,
      kickProposalId
    );

    // Vote YES on a kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: member,

    });
    await advanceTime(10000);

    // Process guild kick proposal
    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: member,

    });

    // Member must be inactive after the kick has happened
    let kickedMember = memberToKick;

    // Submit proposal to onboard new member
    let newMemberB = accounts[3];
    let onboardProposalId = getProposalCounter();
    await submitNewMemberProposal(
      onboardProposalId,
      member,
      onboarding,
      daoInstance,
      newMemberB,
      unitPrice,
      UNITS,
      toBN(10)
    );

    // kicked member attemps to vote
    await expect(
      voting.submitVote(daoInstance.address, onboardProposalId, 1, {
        from: kickedMember,

      })
    ).to.be.revertedWith("onlyMember");
  });

  it("should not be possible for a kicked member to sponsor a financing proposal", async () => {
    const member = owner;
    const newMember = accounts[2];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;
    const financing = adaptersInstance.financing;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMember,
      member,
      unitPrice,
      UNITS
    );

    //SubGuildKick
    let memberToKick = newMember;
    let kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberToKick,
      member,
      kickProposalId
    );

    //Vote YES on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: member,

    });
    await advanceTime(10000);

    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: member,

    });

    // Member must be inactive after the kick has happened
    let kickedMember = memberToKick;

    // Create Financing Request, the kicked member is the applicant and it is fine for now
    let requestedAmount = toBN(50000);
    let proposalId = getProposalCounter();
    await expect(
      financing.submitProposal(
        daoInstance.address,
        proposalId,
        kickedMember,
        ETH_TOKEN,
        requestedAmount,
        [],
        { from: kickedMember }
      )
    ).to.be.revertedWith("onlyMember");
  });

  it("should not be possible for a kicked member to sponsor a financing proposal", async () => {
    const member = owner;
    const newMember = accounts[2];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;
    const managing = adaptersInstance.managing;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMember,
      member,
      unitPrice,
      UNITS
    );

    //SubGuildKick
    let memberToKick = newMember;
    let kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberToKick,
      member,
      kickProposalId
    );

    //Vote YES on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: member,

    });
    await advanceTime(10000);

    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: member,

    });

    // Member must be inactive after the kick has happened
    let kickedMember = memberToKick;

    //Submit a new Bank adapter proposal
    let newAdapterId = sha3("onboarding");
    let newAdapterAddress = accounts[8];

    // kicked member attemps to submit a managing proposal
    await expect(
      managing.submitProposal(
        daoInstance.address,
        getProposalCounter(),
        {
          adapterOrExtensionId: newAdapterId,
          adapterOrExtensionAddr: newAdapterAddress,
          updateType: 1,
          flags: 0,
          keys: [],
          values: [],
          extensionAddresses: [],
          extensionAclFlags: [],
        },
        [],
        { from: kickedMember }
      )
    ).to.be.revertedWith("onlyMember");
  });

  it("should not be possible for a kicked member to sponsor a managing proposal", async () => {
    const member = owner;
    const newMember = accounts[2];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;
    const managing = adaptersInstance.managing;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMember,
      member,
      unitPrice,
      UNITS
    );

    //SubGuildKick
    let memberToKick = newMember;
    let kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberToKick,
      member,
      kickProposalId
    );

    //Vote YES on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: member,

    });
    await advanceTime(10000);

    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: member,

    });

    // Member must be inactive after the kick has happened
    let kickedMember = memberToKick;

    const proposalId = getProposalCounter();
    //Submit a new Bank adapter proposal
    let newadapterId = sha3("onboarding");
    let newadapterAddress = accounts[3]; //TODO deploy some Banking test contract
    await expect(
      managing.submitProposal(
        daoInstance.address,
        proposalId,
        {
          adapterOrExtensionId: newadapterId,
          adapterOrExtensionAddr: newadapterAddress,
          updateType: 1,
          flags: 0,
          keys: [],
          values: [],
          extensionAddresses: [],
          extensionAclFlags: [],
        },
        [],
        { from: kickedMember }
      )
    ).to.be.revertedWith("onlyMember");
  });

  it("should be possible to process a ragekick to return the funds to the kicked member", async () => {
    const member = owner;
    const newMember = accounts[2];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;
    const bank = extensionsInstance.bankExt;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMember,
      member,
      unitPrice,
      UNITS
    );

    // Submit GuildKick
    let memberToKick = newMember;
    let kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberToKick,
      member,
      kickProposalId
    );

    //Vote YES on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: member,

    });
    await advanceTime(10000);

    // Process guild kick to remove the voting power of the kicked member
    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: member,

    });

    // The kicked member should not have LOOT & UNITS anymore
    let memberLoot = await bank.balanceOf(memberToKick, LOOT);
    expect(memberLoot.toString()).equal("0");
    let memberUnits = await bank.balanceOf(memberToKick, UNITS);
    expect(memberUnits.toString()).equal("0");

    // The kicked member must receive the funds in ETH_TOKEN after the ragekick was triggered by a DAO member
    let memberEthToken = await bank.balanceOf(memberToKick, ETH_TOKEN);
    expect(memberEthToken.toString()).equal("1199999999999999880");
  });

  it("should not be possible to process a ragekick if the batch index is smaller than the current processing index", async () => {
    const member = owner;
    const newMember = accounts[2];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      newMember,
      member,
      unitPrice,
      UNITS
    );

    // Submit GuildKick
    let memberToKick = newMember;
    let kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberToKick,
      member,
      kickProposalId
    );

    //Vote YES on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: member,

    });
    await advanceTime(10000);

    // Process guild kick to remove the voting power of the kicked member
    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: member,

    });
  });

  it("should not be possible to submit a guild kick to kick yourself", async () => {
    const member = owner;
    const guildkickContract = adaptersInstance.guildkick;

    // Attempt to kick yourself
    let memberToKick = member;
    await expect(
      guildKickProposal(
        daoInstance,
        guildkickContract,
        memberToKick,
        member,
        getProposalCounter()
      )
    ).to.be.revertedWith("use ragequit");
  });

  it("should not be possible to reuse the kick proposal id", async () => {
    const memberA = owner;
    const memberB = accounts[3];
    const memberC = accounts[5];

    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const guildkickContract = adaptersInstance.guildkick;

    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      memberB,
      memberA,
      unitPrice,
      UNITS
    );
    await onboardingNewMember(
      getProposalCounter(),
      daoInstance,
      onboarding,
      voting,
      memberC,
      memberA,
      unitPrice,
      UNITS
    );

    // Submit the first guild kick with proposalId 0x1
    const kickProposalId = getProposalCounter();
    await guildKickProposal(
      daoInstance,
      guildkickContract,
      memberB,
      memberA,
      kickProposalId
    );

    //Vote YES on kick proposal
    await voting.submitVote(daoInstance.address, kickProposalId, 1, {
      from: memberA,

    });
    await advanceTime(10000);

    await guildkickContract.processProposal(daoInstance.address, kickProposalId, {
      from: memberA,

    });

    // Submit the first guild kick with proposalId 0x1
    await expect(
      guildKickProposal(
        daoInstance,
        guildkickContract,
        memberC,
        memberA,
        kickProposalId
      )
    ).to.be.revertedWith("proposalId must be unique");
  });
});

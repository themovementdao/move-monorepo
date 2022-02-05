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
  remaining,
  UNITS,
  web3Instance,
  toBN
} from '../../utils/contract-util';

import {
  deployDefaultDao,
  takeChainSnapshot,
  revertChainSnapshot,
  proposalIdGenerator,
  advanceTime
} from '../../utils/hardhat-test-util';

describe("Adapter - Voting", () => {
  const proposalCounter = proposalIdGenerator().generator;

  const getProposalCounter = () => {
    return proposalCounter().next().value;
  };

  let daoInstance: any;
  let extensionsInstance: { bank: any };
  let adaptersInstance: any;
  let snapshotId: any;
  let accounts: any;
  let owner: any;

  before("deploy dao", async () => {
    accounts = await web3Instance.eth.getAccounts();
    owner = accounts[1];

    const { dao, adapters, extensions } = await deployDefaultDao({
      owner: owner,
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

  it("should be possible to vote", async () => {
    const account2 = accounts[2];
    const dao = daoInstance;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;

    const proposalId = getProposalCounter();
    await onboarding.submitProposal(
      dao.address,
      proposalId,
      account2,
      UNITS,
      unitPrice.mul(toBN(3)).add(remaining),
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    await advanceTime(10000);
    const vote = await voting.voteResult(dao.address, proposalId);
    expect(vote.toString()).equal("2"); // vote should be "pass = 2"
  });

  it("should not be possible to vote twice", async () => {
    const account2 = accounts[2];
    const dao = daoInstance;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;

    const proposalId = getProposalCounter();
    await onboarding.submitProposal(
      dao.address,
      proposalId,
      account2,
      UNITS,
      unitPrice.mul(toBN(3)).add(remaining),
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    await expect(
      voting.submitVote(dao.address, proposalId, 2, {
        from: owner,

      })
    ).to.be.revertedWith("member has already voted");
  });

  it("should not be possible to vote with a non-member address", async () => {
    const account2 = accounts[2];
    const account3 = accounts[3];
    const dao = daoInstance;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;

    const proposalId = getProposalCounter();
    await onboarding.submitProposal(
      dao.address,
      proposalId,
      account2,
      UNITS,
      unitPrice.mul(toBN(3)).add(remaining),
      [],
      {
        from: owner,

      }
    );

    await expect(
      voting.submitVote(dao.address, proposalId, 1, {
        from: account3,

      })
    ).to.be.revertedWith("onlyMember");
  });

  it("should be possible to vote with a delegate non-member address", async () => {
    const account2 = accounts[2];
    const account3 = accounts[3];
    const dao = daoInstance;
    const onboarding = adaptersInstance.onboarding;
    const voting = adaptersInstance.voting;
    const daoRegistryAdapter = adaptersInstance.daoRegistryAdapter;

    const proposalId = getProposalCounter();
    await onboarding.submitProposal(
      dao.address,
      proposalId,
      account2,
      UNITS,
      unitPrice.mul(toBN(3)).add(remaining),
      [],
      {
        from: owner,

      }
    );

    await daoRegistryAdapter.updateDelegateKey(dao.address, account3, {
      from: owner,

    });

    await voting.submitVote(dao.address, proposalId, 1, {
      from: account3,

    });

    await advanceTime(10000);
    const vote = await voting.voteResult(dao.address, proposalId);
    expect(vote.toString()).equal("2"); // vote should be "pass = 2"
  });
});

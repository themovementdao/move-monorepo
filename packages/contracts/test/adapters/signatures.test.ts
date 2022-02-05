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
  soliditySha3, web3Instance,
} from '../../utils/contract-util';

import {
  deployDefaultDao,
  takeChainSnapshot,
  revertChainSnapshot,
  proposalIdGenerator,
  advanceTime
} from '../../utils/hardhat-test-util';

import { checkSignature } from '../../utils/test-utils';

const proposalCounter = proposalIdGenerator().generator;

const arbitrarySignature =
  "0xc531a1d9046945d3732c73d049da2810470c3b0663788dca9e9f329a35c8a0d56add77ed5ea610b36140641860d13849abab295ca46c350f50731843c6517eee1c";
const arbitrarySignatureHash = soliditySha3({
  t: "bytes",
  v: arbitrarySignature,
});
const arbitraryMsgHash =
  "0xec4870a1ebdcfbc1cc84b0f5a30aac48ed8f17973e0189abdb939502e1948238";
const magicValue = "0x1626ba7e";

function getProposalCounter() {
  return proposalCounter().next().value;
}

describe("Adapter - Signatures", () => {
  let daoInstance: any;
  let extensionsInstance: { erc1271Ext: any };
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

  it("should be possible to create a signature proposal and successfully query the erc1271 interface if it passes", async () => {
    const erc1271 = extensionsInstance.erc1271Ext;
    const voting = adaptersInstance.voting;
    const signatures = adaptersInstance.signatures;

    let proposalId = getProposalCounter();

    //submit a sig
    await signatures.submitProposal(
      daoInstance.address,
      proposalId,
      arbitraryMsgHash,
      arbitrarySignatureHash,
      magicValue,
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(daoInstance.address, proposalId, 1, {
      from: owner,

    });

    //should not be able to process before the voting period has ended
    await expect(signatures.processProposal(daoInstance.address, proposalId, {
      from: owner
    })).to.be.revertedWith("proposal needs to pass");

    await advanceTime(10000);
    await signatures.processProposal(daoInstance.address, proposalId, {
      from: owner,

    });
    // query erc1271 interface
    await checkSignature(
      erc1271,
      arbitraryMsgHash,
      arbitrarySignature,
      magicValue
    );
  });

  it("should not be possible to get a valid signature if the proposal fails", async () => {
    const voting = adaptersInstance.voting;
    const signatures = adaptersInstance.signatures;
    const erc1271 = extensionsInstance.erc1271Ext;

    let proposalId = getProposalCounter();

    //submit a sig
    await signatures.submitProposal(
      daoInstance.address,
      proposalId,
      arbitraryMsgHash,
      arbitrarySignatureHash,
      magicValue,
      [],
      {
        from: owner,

      }
    );

    //Member votes on the signature proposal
    await voting.submitVote(daoInstance.address, proposalId, 2, {
      from: owner,

    });

    await advanceTime(10000);

    await expect(signatures.processProposal(daoInstance.address, proposalId, {
      from: owner,

    })).to.be.revertedWith("proposal needs to pass");

    await expect(
      erc1271.isValidSignature(arbitraryMsgHash, arbitrarySignature)
    ).to.be.revertedWith("erc1271::invalid signature");
  });
});

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

import {
  TOTAL,
  GUILD,
  ZERO_ADDRESS,
  web3Instance,
  toBN,
  toWei,
  sha3,
} from '../../utils/contract-util';

import {
  deployDefaultDao,
  takeChainSnapshot,
  revertChainSnapshot,
  proposalIdGenerator,
  advanceTime,
  hardhatContracts,
} from '../../utils/hardhat-test-util';

import {
  entryDao,
  entryBank,
  daoAccessFlagsMap,
  bankExtensionAclFlagsMap
} from '../../utils/access-control-util';

import { extensionsIdsMap } from '../../utils/dao-ids-util';
import { expect } from 'chai';

const {
  DaoRegistryAdapterContract,
  ManagingContract,
  FinancingContract,
  ERC1271Extension,
  VotingContract
} = hardhatContracts;

const proposalCounter = proposalIdGenerator().generator;

function getProposalCounter() {
  return proposalCounter().next().value;
}

describe("Adapter - Managing", () => {
  let daoInstance: any;
  let extensionsInstance: any;
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

  it("should not be possible to send ETH to the adapter", async () => {
    const managing = adaptersInstance.managing;
    await expect(
      web3Instance.eth.sendTransaction({
        to: managing.address,
        from: owner,

        value: toWei(toBN("1"), "ether"),
      })
    ).to.be.revertedWith("fallback revert");
  });

  it("should not be possible to propose a new adapter with more keys than values", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const newAdapterId = sha3("bank");

    await expect(
      managing.submitProposal(
        dao.address,
        "0x1",
        {
          adapterOrExtensionId: newAdapterId,
          adapterOrExtensionAddr: GUILD,
          updateType: 1,
          flags: 0,
          keys: [
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000002",
            "0x0000000000000000000000000000000000000000000000000000000000000004",
          ], // 3 keys
          values: [], // 0 values
          extensionAddresses: [],
          extensionAclFlags: [],
        },
        [],
        { from: owner }
      )
    ).to.be.revertedWith("must be an equal number of config keys and values");
  });

  it("should not be possible to propose a new adapter with more values than keys", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const newAdapterId = sha3("bank");
    await expect(
      managing.submitProposal(
        dao.address,
        "0x1",
        {
          adapterOrExtensionId: newAdapterId,
          adapterOrExtensionAddr: GUILD,
          updateType: 1,
          flags: 0,
          keys: [], // 0 keys
          values: [1, 2, 3], // 3 values
          extensionAddresses: [],
          extensionAclFlags: [],
        },
        [],
        { from: owner }
      )
    ).to.be.revertedWith("must be an equal number of config keys and values");
  });

  it("should not be possible to propose a new adapter using a reserved address", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const newAdapterId = sha3("bank");
    await expect(
      managing.submitProposal(
        dao.address,
        "0x1",
        {
          adapterOrExtensionId: newAdapterId,
          adapterOrExtensionAddr: GUILD,
          updateType: 1,
          flags: 0,
          keys: [], // 0 keys
          values: [], // 3 values
          extensionAddresses: [],
          extensionAclFlags: [],
        },
        [],
        { from: owner }
      )
    ).to.be.revertedWith("address is reserved");

    await expect(
      managing.submitProposal(
        dao.address,
        "0x0",
        {
          adapterOrExtensionId: newAdapterId,
          adapterOrExtensionAddr: TOTAL,
          updateType: 1,
          flags: 0,
          keys: [], // 0 keys
          values: [], // 3 values
          extensionAddresses: [],
          extensionAclFlags: [],
        },
        [],
        { from: owner }
      )
    ).to.be.revertedWith("address is reserved");
  });

  it("should be possible to remove an adapter if 0x0 is used as the adapter address", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const voting = adaptersInstance.voting;
    const adapterIdToRemove = sha3("onboarding");
    let proposalId = getProposalCounter();
    // Proposal to remove the Onboading adapter
    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: adapterIdToRemove,
        adapterOrExtensionAddr: ZERO_ADDRESS,
        updateType: 1,
        flags: 0,
        keys: [], // 0 keys
        values: [], // 3 values
        extensionAddresses: [],
        extensionAclFlags: [],
      },
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });
    await advanceTime(10000);

    await managing.processProposal(dao.address, proposalId, {
      from: owner,

    });
    let tx = await dao.getPastEvents();

    //Check if the adapter was removed from the Registry
    await expect(
      dao.getAdapterAddress(sha3("onboarding"))
    ).to.be.revertedWith("adapter not found");
    expect(tx[1].event).equal("AdapterRemoved");
    expect(tx[1].returnValues.adapterId).equal(adapterIdToRemove);
  });

  it("should be possible to propose a new DAO adapter with a delegate key", async () => {
    const delegateKey = accounts[3];
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const voting = adaptersInstance.voting;
    const proposalId = getProposalCounter();
    const newAdapterId = sha3("onboarding");
    const newAdapterAddress = accounts[4];
    //Submit a new onboarding adapter proposal
    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: newAdapterId,
        adapterOrExtensionAddr: newAdapterAddress,
        updateType: 1,
        flags: 0,
        keys: [], // 0 keys
        values: [], // 3 values
        extensionAddresses: [],
        extensionAclFlags: [],
      },
      [],
      { from: owner }
    );

    //set new delegate key
    const daoRegistryAdapterAddress = await dao.getAdapterAddress(
      sha3("daoRegistry")
    );
    const daoRegistryAdapter = await DaoRegistryAdapterContract.at(
      daoRegistryAdapterAddress
    );

    await daoRegistryAdapter.updateDelegateKey(dao.address, delegateKey, {
      from: owner,

    });

    //Sponsor the new proposal, vote and process it
    await voting.submitVote(dao.address, proposalId, 1, {
      from: delegateKey,

    });

    // The same member attempts to vote again
    await expect(
      voting.submitVote(dao.address, proposalId, 1, {
        from: owner,

      })
    ).to.be.revertedWith("member has already voted");

    await advanceTime(10000);
    await managing.processProposal(dao.address, proposalId, {
      from: delegateKey,

    });

    //Check if the onboarding adapter was added to the Registry
    const newOnboardingAddress = await dao.getAdapterAddress(
      sha3("onboarding")
    );
    expect(newOnboardingAddress.toString()).equal(newAdapterAddress.toString());
  });

  it("should not be possible to reuse a proposal id", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const newManaging = await ManagingContract.new();
    const newAdapterId = sha3("managing");
    const proposalId = getProposalCounter();
    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: newAdapterId,
        adapterOrExtensionAddr: newManaging.address,
        updateType: 1,
        flags: 0,
        keys: [],
        values: [],
        extensionAddresses: [],
        extensionAclFlags: [],
      },
      [],
      {
        from: owner,

      }
    );

    await expect(
      managing.submitProposal(
        dao.address,
        proposalId,
        {
          adapterOrExtensionId: newAdapterId,
          adapterOrExtensionAddr: newManaging.address,
          updateType: 1,
          flags: 0,
          keys: [],
          values: [],
          extensionAddresses: [],
          extensionAclFlags: [],
        },
        [],
        {
          from: owner,

        }
      )
    ).to.be.revertedWith("proposalId must be unique");
  });

  it("should be possible to replace the managing adapter", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const voting = adaptersInstance.voting;
    const newManaging = await ManagingContract.new();
    const newAdapterId = sha3("managing");
    const proposalId = getProposalCounter();
    const { flags } = entryDao(
      "managing",
      newManaging,
      {
        dao: [daoAccessFlagsMap.SUBMIT_PROPOSAL, daoAccessFlagsMap.REPLACE_ADAPTER]
      }
    );

    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: newAdapterId,
        adapterOrExtensionAddr: newManaging.address,
        updateType: 1,
        flags,
        keys: [],
        values: [],
        extensionAddresses: [],
        extensionAclFlags: [],
      },
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    await advanceTime(10000);

    await managing.processProposal(dao.address, proposalId, {
      from: owner,

    });

    let tx = await dao.getPastEvents();
    expect(tx[1].event).equal("AdapterRemoved");
    expect(tx[1].returnValues.adapterId).equal(newAdapterId);

    expect(tx[2].event).equal("AdapterAdded");
    expect(tx[2].returnValues.adapterId).equal(newAdapterId);
    expect(tx[2].returnValues.adapterAddress).equal(newManaging.address);
    expect(tx[2].returnValues.flags).equal(flags.toString());

    //Check if the new adapter was added to the Registry
    const newAddress = await dao.getAdapterAddress(sha3("managing"));
    expect(newAddress.toString()).equal(newManaging.address.toString());

    // Lets try to remove the financing adapter using the new managing adapter to test its permission flags
    const newProposalId = "0x3";
    await newManaging.submitProposal(
      dao.address,
      newProposalId,
      {
        adapterOrExtensionId: sha3("financing"),
        adapterOrExtensionAddr: ZERO_ADDRESS,
        updateType: 1,
        flags: 0,
        keys: [],
        values: [],
        extensionAddresses: [],
        extensionAclFlags: [],
      },
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, newProposalId, 1, {
      from: owner,

    });
    await advanceTime(10000);

    await newManaging.processProposal(dao.address, newProposalId, {
      from: owner,

    });

    tx = await dao.getPastEvents();
    expect(tx[1].event).equal("AdapterRemoved");
    expect(tx[1].returnValues.adapterId).equal(sha3("financing"));

    await expect(
      dao.getAdapterAddress(sha3("financing"))
    ).to.be.revertedWith("adapter not found");
  });

  it("should not be possible to use an adapter if it is not configured with the permission flags", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const voting = adaptersInstance.voting;

    const newManaging = await ManagingContract.new();
    const newAdapterId = sha3("managing");

    const proposalId = getProposalCounter();
    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: newAdapterId,
        adapterOrExtensionAddr: newManaging.address,
        updateType: 1,
        flags: entryDao("managing", newManaging, { dao: [] }).flags, // no permissions were set
        keys: [],
        values: [],
        extensionAddresses: [],
        extensionAclFlags: [],
      },
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });
    await advanceTime(10000);

    await managing.processProposal(dao.address, proposalId, {
      from: owner,

    });

    // the new adapter is not configured with the correct access flags, so it must return an error
    const newProposalId = getProposalCounter();
    await expect(
      newManaging.submitProposal(
        dao.address,
        newProposalId,
        {
          adapterOrExtensionId: sha3("voting"),
          adapterOrExtensionAddr: voting.address,
          updateType: 1,
          flags: 0,
          keys: [],
          values: [],
          extensionAddresses: [],
          extensionAclFlags: [],
        },
        [],
        {
          from: owner,

        }
      )
    ).to.be.revertedWith("accessDenied");
  });

  it("should not be possible for a non member to propose a new adapter", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const nonMember = accounts[3];

    const newAdapterId = sha3("onboarding");
    const proposalId = getProposalCounter();
    const newAdapterAddress = accounts[3];
    await expect(
      managing.submitProposal(
        dao.address,
        proposalId,
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
        { from: nonMember }
      )
    ).to.be.revertedWith("onlyMember");
  });

  it("should not be possible for a non member to submit a proposal", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const nonMemberAddress = accounts[5];
    const newVoting = await VotingContract.new();
    const newAdapterId = sha3("voting");

    const proposalId = getProposalCounter();
    await expect(
      managing.submitProposal(
        dao.address,
        proposalId,
        {
          adapterOrExtensionId: newAdapterId,
          adapterOrExtensionAddr: newVoting.address,
          updateType: 1,
          flags: 0,
          keys: [],
          values: [],
          extensionAddresses: [],
          extensionAclFlags: [],
        },
        [],
        {
          from: nonMemberAddress,

        }
      )
    ).to.be.revertedWith("onlyMember");
  });

  it("should be possible for a non member to process a proposal", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const voting = adaptersInstance.voting;

    const nonMember = accounts[5];
    const newAdapterId = sha3("voting");
    const proposalId = getProposalCounter();
    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: newAdapterId,
        adapterOrExtensionAddr: accounts[6], //any sample address
        updateType: 1,
        flags: 0,
        keys: [],
        values: [],
        extensionAddresses: [],
        extensionAclFlags: [],
      },
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    await advanceTime(10000);

    await managing.processProposal(dao.address, proposalId, {
      from: nonMember,

    });

    const processedFlag = 2;
    expect(await dao.getProposalFlag(proposalId, processedFlag)).equal(true);
  });

  it("should not be possible to process a proposal if the voting did not pass", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const voting = adaptersInstance.voting;
    const newAdapterId = sha3("voting");
    const proposalId = getProposalCounter();
    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: newAdapterId,
        adapterOrExtensionAddr: accounts[6], //any sample address
        updateType: 1,
        flags: 0,
        keys: [],
        values: [],
        extensionAddresses: [],
        extensionAclFlags: [],
      },
      [],
      {
        from: owner,

      }
    );

    // Voting NO = 2
    await voting.submitVote(dao.address, proposalId, 2, {
      from: owner,

    });
    await advanceTime(10000);

    await expect(
      managing.processProposal(dao.address, proposalId, {
        from: owner,

      })
    ).to.be.revertedWith("proposal did not pass");
  });

  it("should not fail if the adapter id used for removal is not valid", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const voting = adaptersInstance.voting;
    const newAdapterId = sha3("invalid-id");
    const proposalId = getProposalCounter();
    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: newAdapterId,
        adapterOrExtensionAddr: ZERO_ADDRESS, // 0 address to indicate a removal operation
        updateType: 1,
        flags: 0,
        keys: [],
        values: [],
        extensionAddresses: [],
        extensionAclFlags: [],
      },
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    await advanceTime(10000);

    await managing.processProposal(dao.address, proposalId, {
      from: owner,

    });
  });

  it("should not be possible to add a new adapter using an address that is already registered", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const voting = adaptersInstance.voting;
    const newAdapterId = sha3("financing");
    const proposalId = getProposalCounter();
    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: newAdapterId,
        adapterOrExtensionAddr: voting.address, // using the voting.address as the new financing adapter address
        updateType: 1,
        flags: 0,
        keys: [],
        values: [],
        extensionAddresses: [],
        extensionAclFlags: [],
      },
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    await advanceTime(10000);

    await expect(
      managing.processProposal(dao.address, proposalId, {
        from: owner,

      })
    ).to.be.revertedWith("adapterAddress already in use");
  });

  it("should be possible to add a new adapter and set the acl flags for some extension", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const voting = adaptersInstance.voting;
    const financing = await FinancingContract.new();
    const bankExt = extensionsInstance.bankExt;

    const newAdapterId = sha3("testFinancing");
    const newAdapterAddress = financing.address;
    const proposalId = getProposalCounter();

    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: newAdapterId,
        adapterOrExtensionAddr: newAdapterAddress,
        updateType: 1,
        flags: 0,
        keys: [],
        values: [],
        // Set the extension address which will be accessed by the new adapter
        extensionAddresses: [bankExt.address],
        // Set the acl flags so the new adapter can access the bank extension
        extensionAclFlags: [
          entryBank(financing.address, {
            extensions: {
              [extensionsIdsMap.BANK_EXT]: [
                bankExtensionAclFlagsMap.ADD_TO_BALANCE,
                bankExtensionAclFlagsMap.SUB_FROM_BALANCE,
                bankExtensionAclFlagsMap.INTERNAL_TRANSFER,
              ],
            },
          }).flags,
        ],
      },
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    await advanceTime(10000);

    await managing.processProposal(dao.address, proposalId, {
      from: owner,

    });

    // At this point the adapter should be able access the Bank Extension
    // We check that by verifying if the ACL flag in the DAO matches the one
    // submitted in the proposal.

    /**
     * Bank flags
     * 0: ADD_TO_BALANCE
     * 1: SUB_FROM_BALANCE
     * 2: INTERNAL_TRANSFER
     * 3: WITHDRAW
     * 4: REGISTER_NEW_TOKEN
     * 5: REGISTER_NEW_INTERNAL_TOKEN
     * 6: UPDATE_TOKEN
     */
    expect(await dao.getAdapterAddress(newAdapterId)).equal(newAdapterAddress);
    expect(
      await dao.hasAdapterAccessToExtension(
        newAdapterAddress,
        bankExt.address,
        0 //ADD_TO_BALANCE
      )
    ).equal(true);
    expect(
      await dao.hasAdapterAccessToExtension(
        newAdapterAddress,
        bankExt.address,
        1 // SUB_FROM_BALANCE
      )
    ).equal(true);
    expect(
      await dao.hasAdapterAccessToExtension(
        newAdapterAddress,
        bankExt.address,
        2 // INTERNAL_TRANSFER
      )
    ).equal(true);

    expect(
      await dao.hasAdapterAccessToExtension(
        newAdapterAddress,
        bankExt.address,
        3 // WITHDRAW
      )
    ).equal(false);

    expect(
      await dao.hasAdapterAccessToExtension(
        newAdapterAddress,
        bankExt.address,
        4 // REGISTER_NEW_TOKEN
      )
    ).equal(false);

    expect(
      await dao.hasAdapterAccessToExtension(
        newAdapterAddress,
        bankExt.address,
        5 // REGISTER_NEW_INTERNAL_TOKEN
      )
    ).equal(false);

    expect(
      await dao.hasAdapterAccessToExtension(
        newAdapterAddress,
        bankExt.address,
        6 // UPDATE_TOKEN
      )
    ).equal(false);
  });

  it("should be possible to add a new extension", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const voting = adaptersInstance.voting;
    const erc1171Ext = await ERC1271Extension.new();

    const newExtensionId = sha3("testNewExtension");
    const newExtensionAddr = erc1171Ext.address;
    const proposalId = getProposalCounter();

    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: newExtensionId,
        adapterOrExtensionAddr: newExtensionAddr,
        updateType: 2, // 1 = Adapter, 2 = Extension
        flags: 0,
        keys: [],
        values: [],
        // Set the extension address which will be accessed by the new adapter
        extensionAddresses: [],
        // Set the acl flags so the new adapter can access the bank extension
        extensionAclFlags: [],
      },
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    await advanceTime(10000);

    await managing.processProposal(dao.address, proposalId, {
      from: owner,

    });

    expect(await dao.getExtensionAddress(newExtensionId)).equal(
      newExtensionAddr
    );
  });

  it("should be possible to remove an extension", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const voting = adaptersInstance.voting;
    const bankExt = extensionsInstance.bankExt;

    const removeExtensionId = sha3("bank");
    // Use 0 address to indicate we don't want to add, it is just a removal
    const removeExtensionAddr = ZERO_ADDRESS;
    const proposalId = getProposalCounter();

    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: removeExtensionId,
        adapterOrExtensionAddr: removeExtensionAddr,
        updateType: 2, // 1 = Adapter, 2 = Extension
        flags: 0,
        keys: [],
        values: [],
        // Set the extension address which will be accessed by the new adapter
        extensionAddresses: [],
        // Set the acl flags so the new adapter can access the bank extension
        extensionAclFlags: [],
      },
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    await advanceTime(10000);

    await managing.processProposal(dao.address, proposalId, {
      from: owner,

    });

    await expect(
      dao.getExtensionAddress(removeExtensionAddr)
    ).to.be.revertedWith("extension not found");
  });

  it("should revert if UpdateType is unknown", async () => {
    const dao = daoInstance;
    const managing = adaptersInstance.managing;
    const voting = adaptersInstance.voting;

    const removeExtensionId = sha3("bank");
    // Use 0 address to indicate we don't want to add, it is just a removal
    const removeExtensionAddr = ZERO_ADDRESS;
    const proposalId = getProposalCounter();

    await managing.submitProposal(
      dao.address,
      proposalId,
      {
        adapterOrExtensionId: removeExtensionId,
        adapterOrExtensionAddr: removeExtensionAddr,
        updateType: 0, //0 = Unknown 1 = Adapter, 2 = Extension
        flags: 0,
        keys: [],
        values: [],
        // Set the extension address which will be accessed by the new adapter
        extensionAddresses: [],
        // Set the acl flags so the new adapter can access the bank extension
        extensionAclFlags: [],
      },
      [],
      {
        from: owner,

      }
    );

    await voting.submitVote(dao.address, proposalId, 1, {
      from: owner,

    });

    await advanceTime(10000);

    await expect(
      managing.processProposal(dao.address, proposalId, {
        from: owner,

      })
    ).to.be.revertedWith("unknown update type");
  });
});

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
import { entryDao, entryExecutor, executorExtensionAclFlagsMap } from '../../utils/access-control-util';
import { sha3, toBN, web3Instance } from '../../utils/contract-util';

import { extensionsIdsMap } from '../../utils/dao-ids-util';

import {
  deployDefaultDao,
  hardhatContracts
} from '../../utils/hardhat-test-util';

const { ERC20MinterContract, ProxTokenContract } = hardhatContracts;

describe("Extension - Executor", () => {
  let accounts: any;
  let owner: any;

  before(async () => {
    accounts = await web3Instance.eth.getAccounts();
    owner = accounts[0];
  });

  it("should be possible to create a dao with an executor extension pre-configured", async () => {
    const { dao } = await deployDefaultDao({
      owner
    });
    const executorAddress = await dao.getExtensionAddress(sha3("executor-ext"));
    expect(executorAddress).to.not.be.null;
  });

  it("should be possible to mint tokens using a delegated call via executor extension", async () => {
    const { dao, factories, extensions } = await deployDefaultDao({
      owner,
      finalize: false,
    });

    const erc20Minter = await ERC20MinterContract.new();
    const executorExt = extensions.executorExt;

    await factories.daoFactory.addAdapters(
      dao.address,
      [entryDao("erc20Minter", erc20Minter.address, {
        dao: [],
        extensions: {},
      })],
      { from: owner }
    );

    await factories.daoFactory.configureExtension(
      dao.address,
      executorExt.address,
      [
        entryExecutor(erc20Minter.address, {
          extensions: {
            [extensionsIdsMap.EXECUTOR_EXT]: [
              executorExtensionAclFlagsMap.EXECUTE,
            ],
          }
        }),
      ],
      { from: owner }
    );

    await dao.finalizeDao({ from: owner });

    const minterAddress = await dao.getAdapterAddress(sha3("erc20Minter"));
    expect(minterAddress).to.not.be.null;

    const proxToken = await ProxTokenContract.new();
    expect(proxToken).to.not.be.null;

    await erc20Minter.execute(
      dao.address,
      proxToken.address,
      toBN("10000"),
      { from: owner }
    );
    // The token mint call should be triggered from the adapter, but the
    // sender is actually the proxy executor
    const pastEvents = await proxToken.getPastEvents();
    const event = pastEvents[1];
    const { owner: daoOwner, amount } = pastEvents[1].returnValues;
    expect(event.event).to.be.equal("MintedProxToken");
    expect(daoOwner).to.be.equal(executorExt.address);
    expect(amount).to.be.equal("10000");
  });
});

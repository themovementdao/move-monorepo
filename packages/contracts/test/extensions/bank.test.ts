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
import { ETH_TOKEN, sha3, web3Instance } from '../../utils/contract-util';

import {
  deployDefaultDao,
  takeChainSnapshot,
  revertChainSnapshot,
  hardhatContracts,
} from '../../utils/hardhat-test-util';

const { BankFactory } = hardhatContracts;

describe("Extension - Bank", () => {
  let accounts: any;
  let owner: any;
  let daoInstance: any;
  let extensionsInstance: any;
  let snapshotId: any;

  before("deploy dao", async () => {
    accounts = await web3Instance.eth.getAccounts();
    owner = accounts[0];

    const { dao, extensions } = await deployDefaultDao({
      owner: owner,
    });
    daoInstance = dao;
    extensionsInstance = extensions;
  });

  beforeEach(async () => {
    snapshotId = await takeChainSnapshot();
  });

  afterEach(async () => {
    await revertChainSnapshot(snapshotId);
  });

  it("should be possible to create a dao with a bank extension pre-configured", async () => {
    const dao = daoInstance;
    const bankAddress = await dao.getExtensionAddress(sha3("bank"));
    expect(bankAddress).to.not.be.null;
  });

  it("should be possible to get all the tokens registered in the bank", async () => {
    const bank = extensionsInstance.bankExt;
    const tokens = await bank.getTokens();
    expect(tokens.toString()).equal([ETH_TOKEN].toString());
  });

  it("should be possible to get a registered token using the token index", async () => {
    const bank = extensionsInstance.bankExt;
    const token = await bank.getToken(0);
    expect(token.toString()).equal(ETH_TOKEN.toString());
  });

  it("should be possible to get the total amount of tokens registered in the bank", async () => {
    const bank = extensionsInstance.bankExt;
    const totalTokens = await bank.nbTokens();
    expect(totalTokens.toString()).equal("1");
  });

  it("should not be possible to create a bank that supports more than 200 external tokens", async () => {
    const maxExternalTokens = 201;
    const identityBank = extensionsInstance.bankExt;
    const bankFactory = await BankFactory.new(identityBank.address);
    await expect(
      bankFactory.create(daoInstance.address, maxExternalTokens)
    ).to.be.revertedWith("max number of external tokens should be (0,200)");
  });

  it("should not be possible to create a bank that supports 0 external tokens", async () => {
    const maxExternalTokens = 0;
    const identityBank = extensionsInstance.bankExt;
    const bankFactory = await BankFactory.new(identityBank.address);
    await expect(
      bankFactory.create(daoInstance.address, maxExternalTokens)
    ).to.be.revertedWith("max number of external tokens should be (0,200)");
  });

  it("should not be possible to set the max external tokens if bank is already initialized", async () => {
    const bank = extensionsInstance.bankExt;
    await expect(
      bank.setMaxExternalTokens(10)
    ).to.be.revertedWith("bank already initialized");
  });
});

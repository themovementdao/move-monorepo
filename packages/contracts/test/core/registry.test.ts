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
import { ETH_TOKEN, fromUtf8, web3Instance } from '../../utils/contract-util';

import {
  hardhatContracts
} from '../../utils/hardhat-test-util';

const { DaoRegistry } = hardhatContracts;

describe("Core - Registry", () => {
  let owner: any;
  let accounts: any;

  before(async () => {
    accounts = await web3Instance.eth.getAccounts();
    owner = accounts[0];
  });

  it("should not be possible to add a module with invalid id", async () => {
    let moduleId = fromUtf8("");
    let moduleAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
    let registry = await DaoRegistry.new();
    await expect(
      registry.replaceAdapter(moduleId, moduleAddress, 0, [], [])
    ).to.be.revertedWith("adapterId must not be empty");
  });

  it("should not be possible to add an adapter with invalid id", async () => {
    let adapterId = fromUtf8("");
    let adapterAddr = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
    let registry = await DaoRegistry.new();
    await expect(
      registry.replaceAdapter(adapterId, adapterAddr, 0, [], [])
    ).to.be.revertedWith("adapterId must not be empty");
  });

  it("should not be possible to add an adapter with invalid address]", async () => {
    let adapterId = fromUtf8("1");
    let adapterAddr = "";
    let registry = await DaoRegistry.new();
    try {
      await registry.replaceAdapter(adapterId, adapterAddr, 0, [], []);
    } catch (e) {
      expect(e.message).to.contain('invalid address');
    }
  });

  it("should be possible to replace an adapter when the id is already in use", async () => {
    let adapterId = fromUtf8("1");
    let adapterAddr = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
    let newAdapterAddr = "0xd7bCe30D77DE56E3D21AEfe7ad144b3134438F5B";
    let registry = await DaoRegistry.new();
    //Add a module with id 1
    await registry.replaceAdapter(adapterId, adapterAddr, 0, [], []);
    await registry.replaceAdapter(adapterId, newAdapterAddr, 0, [], []);
    let address = await registry.getAdapterAddress(adapterId);
    expect(address).equal(newAdapterAddr);
  });

  it("should be possible to add an adapter with a valid id and address", async () => {
    let adapterId = fromUtf8("1");
    let adapterAddr = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
    let registry = await DaoRegistry.new();
    await registry.replaceAdapter(adapterId, adapterAddr, 0, [], []);
    let address = await registry.getAdapterAddress(adapterId);
    expect(address).equal(adapterAddr);
  });

  it("should be possible to remove an adapter", async () => {
    let adapterId = fromUtf8("2");
    let adapterAddr = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
    let registry = await DaoRegistry.new();
    await registry.replaceAdapter(adapterId, adapterAddr, 0, [], []);
    let address = await registry.getAdapterAddress(adapterId);
    expect(address).equal(adapterAddr);
    await registry.replaceAdapter(adapterId, ETH_TOKEN, 0, [], []);
    await expect(
      registry.getAdapterAddress(adapterId)
    ).to.be.revertedWith("adapter not found");
  });

  it("should not be possible to remove an adapter with an empty id", async () => {
    let adapterId = fromUtf8("");
    let registry = await DaoRegistry.new();
    await expect(
      registry.replaceAdapter(adapterId, ETH_TOKEN, 0, [], [])
    ).to.be.revertedWith("adapterId must not be empty");
  });

  it("should not be possible for a zero address to be considered a member", async () => {
    let registry = await DaoRegistry.new();
    let isMember = await registry.isMember(
      "0x0000000000000000000000000000000000000000"
    );
    expect(isMember).equal(false);
  });


  it('should be possible add vetoer', async () => {
    let registry = await DaoRegistry.new();
    await registry.initialize(owner, owner);

    let isMember = await registry.isMember(owner);
    let isVetoer = await registry.isVetoer(owner);

    expect(isVetoer).equal(false);
    expect(isMember).equal(true);

    await registry.addVetoer(owner);

    isVetoer = await registry.isVetoer(owner);
    expect(isVetoer).equal(true);
  });

  it('should be possible remove vetoer', async () => {
    let registry = await DaoRegistry.new();
    await registry.initialize(owner, owner);

    let isMember = await registry.isMember(owner);
    expect(isMember).equal(true);

    await registry.addVetoer(owner);
    let isVetoer = await registry.isVetoer(owner);

    expect(isVetoer).equal(true);

    await registry.removeVetoer(owner);
    isVetoer = await registry.isVetoer(owner);

    expect(isVetoer).equal(false);
  });

  it("should not be possible add vetoer if not member dao", async () => {
    let registry = await DaoRegistry.new();
    let isMember = await registry.isMember(accounts[1]);

    await registry.addVetoer(accounts[1])

    let isVetoer = await registry.isVetoer(accounts[1]);

    expect(isVetoer).equal(false);
    expect(isMember).equal(false);
  });

});

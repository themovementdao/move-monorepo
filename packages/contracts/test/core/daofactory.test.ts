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
import { web3Instance } from '../../utils/contract-util';
import {
  cloneDao,
} from '../../utils/deployment-util';

import {
  hardhatContracts,
  deployFunction,
} from '../../utils/hardhat-test-util';

const { DaoRegistry, DaoFactory } = hardhatContracts;

describe("Core - DaoFactory", () => {
  let accounts: any;
  let owner: any;
  let anotherOwner: any;

  before(async () => {
    accounts = await web3Instance.eth.getAccounts();
    owner = accounts[0];
    anotherOwner = accounts[1];
  });

  it("should be possible create an identity dao and clone it", async () => {
    let { daoName } = await cloneDao({
      owner: anotherOwner,
      creator: anotherOwner,
      name: "cloned-dao",
      DaoRegistry,
      DaoFactory,
      deployFunction,
    });

    expect(daoName).equal("cloned-dao");
  });

  it("should be possible to get a DAO address by its name if it was created by the factory", async () => {
    let { daoFactory, dao } = await cloneDao({
      owner: anotherOwner,
      creator: anotherOwner,
      name: "new-dao",
      DaoRegistry,
      DaoFactory,
      deployFunction,
    });

    let retrievedAddress = await daoFactory.getDaoAddress("new-dao", {
      from: anotherOwner
    });
    expect(retrievedAddress).equal(dao.address);
  });

  it("should not be possible to get a DAO address of it was not created by the factory", async () => {
    let { daoFactory } = await cloneDao({
      creator: anotherOwner,
      owner: anotherOwner,
      name: "new-dao",
      DaoRegistry,
      DaoFactory,
      deployFunction,
    });

    let retrievedAddress = await daoFactory.getDaoAddress("random-dao", {
      from: anotherOwner
    });

    expect(retrievedAddress).equal(
      "0x0000000000000000000000000000000000000000"
    );
  });
});

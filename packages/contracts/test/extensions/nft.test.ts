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
import { GUILD, web3Instance } from '../../utils/contract-util';
import {
  takeChainSnapshot,
  revertChainSnapshot,
  deployDefaultNFTDao
} from '../../utils/hardhat-test-util';

describe("Extension - NFT", () => {
  let accounts: any;
  let owner: any;

  let daoInstance: any;
  let extensionsInstance: { erc721Ext: any };
  let adaptersInstance: any;
  let snapshotId: any;
  let testContractsInstance: any;

  before("deploy dao", async () => {
    accounts = await web3Instance.eth.getAccounts();
    owner = accounts[0];

    const {
      dao,
      adapters,
      extensions,
      testContracts,
    } = await deployDefaultNFTDao({ owner: owner });
    daoInstance = dao;
    extensionsInstance = extensions;
    adaptersInstance = adapters
    testContractsInstance = testContracts;
  });

  beforeEach(async () => {
    snapshotId = await takeChainSnapshot();
  });

  afterEach(async () => {
    await revertChainSnapshot(snapshotId);
  });

  it("should be possible to create a dao with a nft extension pre-configured", async () => {
    const nftExtension = extensionsInstance.erc721Ext;
    expect(nftExtension).to.not.be.null;
  });

  it("should be possible check how many NFTs are in the collection", async () => {
    const nftExtension = extensionsInstance.erc721Ext;
    const pixelNFT = testContractsInstance.pixelNFT;
    const total = await nftExtension.nbNFTs(pixelNFT.address);
    expect(total.toString()).equal("0");
  });

  it("should not be possible get an NFT in the collection if it is empty", async () => {
    const nftExtension = extensionsInstance.erc721Ext;
    const pixelNFT = testContractsInstance.pixelNFT;
    await expect(
      nftExtension.getNFT(pixelNFT.address, 0)
    ).to.be.revertedWith('revert');
  });

  it("should not be possible to return a NFT without the RETURN permission", async () => {
    const nftExtension = extensionsInstance.erc721Ext;
    const pixelNFT = testContractsInstance.pixelNFT;
    await expect(
      nftExtension.withdrawNFT(accounts[1], pixelNFT.address, 1)
    ).to.be.revertedWith("nft::accessDenied");
  });

  it("should be possible check how many NFTs are in the collection", async () => {
    const nftExtension = extensionsInstance.erc721Ext;
    const total = await nftExtension.nbNFTAddresses();
    expect(total.toString()).equal("0");
  });

  it("should not be possible to initialize the extension if it was already initialized", async () => {
    const nftExtension = extensionsInstance.erc721Ext;
    await expect(
      nftExtension.initialize(daoInstance.address, accounts[0])
    ).to.be.revertedWith("already initialized");
  });

  it("should be possible to collect a NFT that is allowed", async () => {
    const pixelNFT = testContractsInstance.pixelNFT;

    const nftOwner = accounts[1];
    await pixelNFT.mintPixel(nftOwner, 1, 1);

    const pastEvents = await pixelNFT.getPastEvents();
    const { owner, tokenId, uri, metadata } = pastEvents[1].returnValues;

    expect(tokenId).equal("1");
    expect(uri).equal("https://www.openlaw.io/nfts/pix/1");
    expect(metadata).equal("pixel: 1,1");
    expect(owner).equal(nftOwner);

    const nftExtension = extensionsInstance.erc721Ext;
    await pixelNFT.approve(nftExtension.address, tokenId, {
      from: nftOwner
    });

    const nftAdapter = adaptersInstance.nftAdapter;
    await nftAdapter.collect(daoInstance.address, pixelNFT.address, tokenId, {
      from: nftOwner
    });

    // Make sure it was collected
    const nftAddr = await nftExtension.getNFTAddress(0);
    expect(nftAddr).equal(pixelNFT.address);
    const nftId = await nftExtension.getNFT(nftAddr, 0);
    expect(nftId.toString()).equal(tokenId.toString());
    const newOwner = await nftExtension.getNFTOwner(nftAddr, tokenId);
    expect(newOwner.toLowerCase()).equal(GUILD.toLowerCase());
  });
});

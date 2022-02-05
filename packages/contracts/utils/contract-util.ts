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
import { web3 } from "hardhat";

export const sha3 = web3.utils.sha3;
export const soliditySha3 = web3.utils.soliditySha3;
export const toBN = web3.utils.toBN;
export const toWei = web3.utils.toWei;
export const fromUtf8 = web3.utils.fromUtf8;
export const fromWei = web3.utils.fromWei;
export const hexToBytes = web3.utils.hexToBytes;
export const toAscii = web3.utils.toAscii;
export const fromAscii = web3.utils.fromAscii;
export const toUtf8 = web3.utils.toUtf8;
export const toHex = web3.utils.toHex;
export const web3Instance = web3;

export const GUILD = "0x000000000000000000000000000000000000dead";
export const TOTAL = "0x000000000000000000000000000000000000babe";
export const ESCROW = "0x0000000000000000000000000000000000004bec";
export const MEMBER_COUNT = "0x00000000000000000000000000000000DECAFBAD";
export const UNITS = "0x00000000000000000000000000000000000FF1CE";
export const LOOT = "0x00000000000000000000000000000000B105F00D";
export const ETH_TOKEN = "0x0000000000000000000000000000000000000000";
export const DAI_TOKEN = "0x95b58a6bff3d14b7db2f5cb5f0ad413dc2940658";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const numberOfUnits = toBN("1000000000000000");
export const unitPrice = toBN(toWei("120", "finney"));
export const remaining = unitPrice.sub(toBN("50000000000000"));
export const maximumChunks = toBN("11");
export const maxAmount = toBN("10000000000000000000");
export const maxUnits = toBN("10000000000000000000");

export const embedConfigs = (contractInstance, name, configs) => {
  return {
    ...contractInstance,
    configs: configs.find((c) => c.name === name),
  };
};


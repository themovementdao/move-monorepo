pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";


interface IUniswapV2Router is IUniswapV2Router02 {
}

interface IMyUniswapV2Factory is IUniswapV2Factory {
}

interface IMyUniswapV3Factory is IUniswapV3Factory {
}
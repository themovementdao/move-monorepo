pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT


interface IBank {
    function addToBalance(address member, address token, uint256 amount) external payable;
}
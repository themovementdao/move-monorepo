pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

interface IUnagiiVault {
    function token() external view returns(address);
    function uToken() external view returns(address);
    function deposit(uint256 amount, uint256 min) external returns(uint256);
    function calcWithdraw(uint256 shares) external view returns(uint256);
    function withdraw(uint256 amount, uint256 min) external returns(uint256);
}
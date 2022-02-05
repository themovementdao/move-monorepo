pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "../../core/DaoRegistry.sol";

interface IAddPool {
    function submitProposal(
        DaoRegistry dao,
        bytes32 proposalId,
        address tokenA,
        address tokenB,
        address to,    
        bytes memory data
    ) external;

    function processProposal(DaoRegistry dao, bytes32 proposalId) external payable
        returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    event ProposalSubmitted(
        address adapter,
        bytes32 proposalId);
    event ProposalProcessed(
        address adapter,
        bytes32 proposalId,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity);
}

interface ISubPool {
    function submitProposal(
        DaoRegistry dao,
        bytes32 proposalId,
        address tokenA,
        address tokenB,
        address to,    
        bytes memory data
    ) external;

    function processProposal(DaoRegistry dao, bytes32 proposalId) external
        returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    event ProposalSubmitted(
        address adapter,
        bytes32 proposalId);
    event ProposalProcessed(
        address adapter,
        bytes32 proposalId,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity);
}
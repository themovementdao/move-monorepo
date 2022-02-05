pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "../../core/DaoRegistry.sol";

interface IVault {
    function submitProposal(
        DaoRegistry dao,
        bytes32 proposalId,
        address vault,
        uint256 amount,
        bytes memory data
    ) external;

    function processProposal(DaoRegistry dao, bytes32 proposalId) external;

    event ProposalSubmitted(address adapter, bytes32 proposalId);
    event ProposalProcessed(address adapter, bytes32 proposalId);
}
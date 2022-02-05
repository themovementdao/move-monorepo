pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import '../../core/DaoRegistry.sol';
import '../../core/DaoConstants.sol';

interface IMovement {
    function processProposal(DaoRegistry dao, bytes32 proposalId) external;

    event ProposalSubmitted(address adapter, bytes32 proposalId);
    event ProposalProcessed(address adapter, bytes32 proposalId);
}

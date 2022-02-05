pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import '../../core/DaoRegistry.sol';

interface IServiceProvider {
    function submitProposal(
        DaoRegistry dao,
        bytes32 proposalId,
        address serviceProvider,
        uint8 action,
        bytes memory data
    ) external;

    function processProposal(DaoRegistry dao, bytes32 proposalId) external;

    event ProposalSubmitted(address adapter, bytes32 proposalId);
    event ProposalProcessed(address adapter, bytes32 proposalId);
}

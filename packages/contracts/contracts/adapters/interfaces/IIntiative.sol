pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT
import '../../core/DaoRegistry.sol';

interface IIntiative {
    struct Milestones {
        uint256 date;
        uint256 amount;
    }

    function submitProposal(
        DaoRegistry dao,
        bytes32 proposalId,
        address token,
        address _receive,
        Milestones[] calldata milestones,
        bytes memory data
    ) external;

    function processProposal(DaoRegistry dao, bytes32 proposalId) external;

    function executeMilestone(
        DaoRegistry dao,
        bytes32 proposalId,
        uint256 index
    ) external;

    event ProposalSubmitted(address adapter, bytes32 proposalId);
    event ProposalProcessed(address adapter, bytes32 proposalId);
}

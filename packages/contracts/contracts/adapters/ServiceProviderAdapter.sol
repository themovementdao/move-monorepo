pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import './interfaces/IServiceProvider.sol';
import './interfaces/IVoting.sol';

import '../guards/MemberGuard.sol';
import '../guards/AdapterGuard.sol';

contract ServiceProviderAdapter is IServiceProvider, MemberGuard, AdapterGuard {
    bytes32 internal constant SERVICE_PROVIDER_ADAPTER =
        keccak256('service-provider-adpt');

    struct ProposalDetails {
        address serviceProvider;
        uint8 action;
    }

    // keeps track of all vault proposals handled by each dao
    mapping(address => mapping(bytes32 => ProposalDetails)) public proposals;

    /**
     * @notice default fallback function to prevent from sending ether to the contract.
     */
    receive() external payable {
        revert('fallback revert');
    }

    function submitProposal(
        DaoRegistry dao,
        bytes32 proposalId,
        address serviceProvider,
        uint8 action,
        bytes memory data
    ) external override reentrancyGuard(dao) {
        dao.submitProposal(proposalId);

        ProposalDetails storage proposal = proposals[address(dao)][proposalId];

        proposal.serviceProvider = serviceProvider;
        proposal.action = action;

        IVoting votingContract = IVoting(dao.getAdapterAddress(VOTING));

        address sponsoredBy = votingContract.getSenderAddress(
            dao,
            address(this),
            data,
            msg.sender
        );

        dao.sponsorProposal(proposalId, sponsoredBy, address(votingContract));

        votingContract.startNewVotingForProposal(dao, proposalId, data);

        emit ProposalSubmitted(address(this), proposalId);
    }

    function processProposal(DaoRegistry dao, bytes32 proposalId)
        external
        override
        reentrancyGuard(dao)
    {
        ProposalDetails memory details = proposals[address(dao)][proposalId];

        IVoting votingContract = IVoting(dao.votingAdapter(proposalId));

        require(address(votingContract) != address(0), 'adapter not found');

        require(
            votingContract.voteResult(dao, proposalId) ==
                IVoting.VotingState.PASS,
            'proposal has not been voted on yet'
        );

        dao.processProposal(proposalId);

        if (details.action == 1) {
            dao.addServiceProvider(details.serviceProvider);
        } else {
            dao.removeServiceProvider(details.serviceProvider);
        }

        emit ProposalProcessed(address(this), proposalId);
    }
}

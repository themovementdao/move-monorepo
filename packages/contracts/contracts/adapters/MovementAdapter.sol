pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

// SPDX-License-Identifier: MIT

import './interfaces/IMovement.sol';
import './interfaces/IVoting.sol';

import '../core/DaoConstants.sol';

import '../guards/MemberGuard.sol';
import '../guards/AdapterGuard.sol';

contract MovementAdapter is IMovement, MemberGuard, AdapterGuard {
    struct ProposalDetails {
        Movememt movement;
        string name;
        address creator;
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
        Movememt calldata movement,
        string calldata name,
        bytes memory data
    ) external payable reentrancyGuard(dao) {
        dao.submitProposal(proposalId);
        ProposalDetails storage proposal = proposals[address(dao)][proposalId];

        require(msg.value >= 0.1 ether, 'min 0.1 ETH');

        (bool success, ) = dao.getExtensionAddress(ENDOWMENT_BANK).call{value: msg.value}("");

        require(success, 'failed transfer');

        uint256 offset = 288;
        uint256 _fundingGoal = _sliceBytesUint(movement.dataBondingCurve, offset);
        require(_fundingGoal >= 50000 * 10 ** 18, "revert");


        proposal.movement = movement;
        proposal.name = name;
        proposal.creator = address(msg.sender);
        

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

        dao.createMovement(proposalId, details.movement, details.name, details.creator);

        delete proposals[address(dao)][proposalId];

        emit ProposalProcessed(address(this), proposalId);
    }

    function _sliceBytesUint(bytes memory bs, uint256 start) internal pure returns (uint256) {
        start += 0x20;
        require(bs.length >= start, "slicing out of range");
        uint256 x;
        assembly {
            x := mload(add(bs, start))
        }
        return x;
    }
}

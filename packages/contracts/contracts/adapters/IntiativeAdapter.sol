pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

// SPDX-License-Identifier: MIT

import './interfaces/IIntiative.sol';
import './interfaces/IVoting.sol';
import '../extensions/interfaces/IEndowment.sol';
import '../core/DaoConstants.sol';
import '../core/interfaces/IDaoRegistry.sol';
import '../guards/MemberGuard.sol';
import '../guards/AdapterGuard.sol';

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

contract IntiativeAdapter is IIntiative, DaoConstants, MemberGuard, AdapterGuard {
    using SafeERC20 for IERC20;

    bytes32 internal constant INTIATIVE_ADAPTER = keccak256('intiative-adpt');

    struct ProposalDetails {
        address _receive;
        address token;
    }

    // keeps track of all vault proposals handled by each dao
    mapping(address => mapping(bytes32 => ProposalDetails)) public proposals;

    mapping(bytes32 => Milestones[]) public _milestones;

    event ExecuteMilestone(
        bytes32 proposalId,
        address token,
        address _receive,
        uint256 amount
    );

    /**
     * @notice default fallback function to prevent from sending ether to the contract.
     */
    receive() external payable {
        revert('fallback revert');
    }

    function submitProposal(
        DaoRegistry dao,
        bytes32 proposalId,
        address token,
        address _receive,
        Milestones[] calldata milestones,
        bytes memory data
    ) external override reentrancyGuard(dao) {
        require(milestones.length != 0, 'milestones must be non empty');

        dao.submitProposal(proposalId);
        ProposalDetails storage proposal = proposals[address(dao)][proposalId];

        proposal.token = token;
        proposal._receive = _receive;

        IVoting votingContract = IVoting(dao.getAdapterAddress(VOTING));
        address sponsoredBy = votingContract.getSenderAddress(
            dao,
            address(this),
            data,
            msg.sender
        );
        
        Milestones[] storage milestone = _milestones[proposalId];

        for (uint256 i = 0; i < milestones.length; i++) {
            milestone.push(milestones[i]);
        }

        dao.sponsorProposal(proposalId, sponsoredBy, address(votingContract));

        votingContract.startNewVotingForProposal(dao, proposalId, data);

        emit ProposalSubmitted(address(this), proposalId);
    }

    function processProposal(DaoRegistry dao, bytes32 proposalId)
        external
        override
        reentrancyGuard(dao)
    {
        IVoting votingContract = IVoting(dao.votingAdapter(proposalId));
        require(address(votingContract) != address(0), 'adapter not found');

        require(
            votingContract.voteResult(dao, proposalId) ==
                IVoting.VotingState.PASS,
            'proposal has not been voted on yet'
        );

        dao.processProposal(proposalId);

        emit ProposalProcessed(address(this), proposalId);
    }

    function getMilestone(bytes32 proposalId, uint256 index)
        public
        view
        returns (uint256, uint256)
    {
        Milestones[] memory milestones = _milestones[proposalId];
        require(milestones.length != 0, 'not found milestones');
        return (milestones[index].date, milestones[index].amount);
    }

    function getCountMilestone(bytes32 proposalId)
        public
        view
        returns (uint256)
    {
        return _milestones[proposalId].length;
    }

    function executeMilestone(
        DaoRegistry dao,
        bytes32 proposalId,
        uint256 index
    ) external override   {
        Milestones[] memory milestones = _milestones[proposalId];

        require(milestones.length != 0, 'not found milestones');
        require(
            milestones[index].date < block.timestamp,
            'unable to complete the request'
        );

        ProposalDetails memory details = proposals[address(dao)][proposalId];

        IEndowment(IDaoRegistry(dao.getMemberAddress(1)).getExtensionAddress(ENDOWMENT_BANK))
            .subERC20Balance(
                address(dao),
                details.token,
                details._receive,
                milestones[index].amount,
                IEndowment.BALANCE_TYPE.INITIATIVE_BALANCE
            );
        milestones[index].date = 0;
        emit ExecuteMilestone(
            proposalId,
            details.token,
            details._receive,
            milestones[index].amount
        );    
    }
}

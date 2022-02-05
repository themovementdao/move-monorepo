pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "./interfaces/IUnagiiVault.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IVoting.sol";

import "../guards/MemberGuard.sol";
import "../guards/AdapterGuard.sol";


contract UnagiiVaultWithdrawAdapter is
    IVault,
    MemberGuard,
    AdapterGuard
{
    using SafeERC20 for IERC20;

    struct ProposalDetails {
        uint256 amount; // the amount requested for funding
        address vault; // the vault address in which the funding must be sent to
        uint256 strategy; // withdraw funds when change strategy count equal to inpur value
    }

    // keeps track of all vault proposals handled by each dao
    mapping(address => mapping(bytes32 => ProposalDetails)) public proposals;
    
    /**
     * @notice default fallback function to prevent from sending ether to the contract.
     */
    receive() external payable {
        revert("fallback revert");
    }
    
    function submitProposal(
        DaoRegistry dao,
        bytes32 proposalId,
        address vault,
        uint256 amount,
        bytes memory data
    ) external override reentrancyGuard(dao) {
        require(amount > 0, "invalid requested amount");

        dao.submitProposal(proposalId);

        ProposalDetails storage proposal = proposals[address(dao)][proposalId];
        proposal.vault = vault;
        proposal.amount = amount;
        proposal.strategy = sliceBytesUint(data, 0);

        IVoting votingContract = IVoting(dao.getAdapterAddress(VOTING));
        address sponsoredBy =
            votingContract.getSenderAddress(
                dao,
                address(this),
                data,
                msg.sender
            );

        dao.sponsorProposal(proposalId, sponsoredBy, address(votingContract));
        votingContract.startNewVotingForProposal(dao, proposalId, data);
        
        emit ProposalSubmitted(address(this), proposalId);
    }

    function processProposal(
        DaoRegistry dao,
        bytes32 proposalId
    ) external override reentrancyGuard(dao) {
        ProposalDetails memory details = proposals[address(dao)][proposalId];

        IVoting votingContract = IVoting(dao.votingAdapter(proposalId));
        require(address(votingContract) != address(0), "adapter not found");

        require(
            votingContract.voteResult(dao, proposalId) ==
                IVoting.VotingState.PASS,
            "proposal has not been voted on yet"
        );

        IUnagiiVault vault = IUnagiiVault(details.vault);
        address token = vault.token();
        address utoken = vault.uToken();

        uint256 uamount = details.amount;

        dao.processProposal(proposalId);

        IERC20(utoken).safeApprove(address(vault), uamount);
        uint256 amount = vault.withdraw(uamount, 0);

        BankExtension bank = BankExtension(dao.getExtensionAddress(BANK));
        IERC20(token).safeTransfer(address(bank), amount);
        bank.addToBalance(GUILD, token, amount);

        delete proposals[address(dao)][proposalId];

        emit ProposalProcessed(address(this), proposalId);
    }

    function sliceBytesUint(bytes memory bs, uint256 start) internal pure returns (uint256)
    {
        require(bs.length >= start + 32, "slicing out of range");
        uint256 x;
        assembly {
            x := mload(add(bs, add(0x20, start)))
        }
        return x;
    }
}
pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./interfaces/IVoting.sol";
import "./interfaces/IPool.sol";

import "../guards/MemberGuard.sol";
import "../guards/AdapterGuard.sol";


contract UniswapAddPoolAdapter is
    IAddPool,
    MemberGuard,
    AdapterGuard {
    using SafeERC20 for IERC20;
    bytes32 internal constant UNISWAP_ADDPOOL_ADAPTER = keccak256("uniswap-addpool-adpt");

    struct ProposalDetails {
        address tokenA;
        address tokenB;
        uint amountADesired;
        uint amountBDesired;
        uint amountAMin;
        uint amountBMin;
        address to;
        uint deadline;
    }

    // keeps track of all vault proposals handled by each dao
    mapping(address => mapping(bytes32 => ProposalDetails)) public proposals;

    /**
     * @notice default fallback function to prevent from sending ether to the contract.
     */
    receive() external payable {
    }

    function submitProposal(
        DaoRegistry dao,
        bytes32 proposalId,
        address tokenA,
        address tokenB,
        address to,
        bytes memory data
    ) external override reentrancyGuard(dao) {
        require(tokenA != address(0), "use tokenB as ETH");
        require(to != address(0), "invalid addresses");

        dao.submitProposal(proposalId);

        ProposalDetails storage proposal = proposals[address(dao)][proposalId];

        uint256 offset = 0;
        proposal.tokenA = tokenA;
        proposal.tokenB = tokenB;
        proposal.to = to;
        proposal.amountADesired = _sliceBytesUint(data, offset);
        offset += 32;
        proposal.amountBDesired = _sliceBytesUint(data, offset);
        offset += 32;
        proposal.amountAMin = _sliceBytesUint(data, offset);
        offset += 32;
        proposal.amountBMin = _sliceBytesUint(data, offset);
        offset += 32;
        proposal.deadline = _sliceBytesUint(data, offset);

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
    ) external payable override reentrancyGuard(dao) returns (uint amountA, uint amountB, uint liquidity) {

        ProposalDetails memory details = proposals[address(dao)][proposalId];

        IVoting votingContract = IVoting(dao.votingAdapter(proposalId));
        require(address(votingContract) != address(0), "adapter not found");

        require(
            votingContract.voteResult(dao, proposalId) ==
                IVoting.VotingState.PASS,
            "proposal has not been voted on yet"
        );

        dao.processProposal(proposalId);

        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        IERC20(details.tokenA).safeTransferFrom(details.to, address(this), details.amountADesired);
        IERC20(details.tokenA).safeApprove(address(_uniswapV2Router), details.amountADesired);

        if (details.tokenB == address(0)) {
            require(details.amountBDesired == msg.value, "bad ETH income");
            (amountA, amountB, liquidity) = _uniswapV2Router.addLiquidityETH{ value: details.amountBDesired }(
                details.tokenA,
                details.amountADesired,
                details.amountAMin,
                details.amountBMin,
                details.to,
                details.deadline
            );
        } else {
            IERC20(details.tokenB).safeTransferFrom(details.to, address(this), details.amountBDesired);
            IERC20(details.tokenB).safeApprove(address(_uniswapV2Router), details.amountBDesired);
            (amountA, amountB, liquidity) = _uniswapV2Router.addLiquidity(
                details.tokenA,
                details.tokenB,
                details.amountADesired,
                details.amountBDesired,
                details.amountAMin,
                details.amountBMin,
                details.to,
                details.deadline
            );
        }

        delete proposals[address(dao)][proposalId];

        emit ProposalProcessed(address(this), proposalId, details.tokenA, details.tokenB, amountA, amountB, liquidity);
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
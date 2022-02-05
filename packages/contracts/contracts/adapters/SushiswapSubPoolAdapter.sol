pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./interfaces/IVoting.sol";
import "./interfaces/IPool.sol";

import "../guards/MemberGuard.sol";
import "../guards/AdapterGuard.sol";


contract SushiswapSubPoolAdapter is
    ISubPool,
    MemberGuard,
    AdapterGuard {
    using SafeERC20 for IERC20;

    bytes32 internal constant UNISWAP_SUBPOOL_ADAPTER = keccak256("uniswap-subpool-adpt");

    struct ProposalDetails {
        address tokenA;
        address tokenB;
        uint256 amountAMin;
        uint256 amountBMin;
        address to;
        uint256 deadline;        
        uint256 liquidity;
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
        proposal.liquidity = _sliceBytesUint(data, offset);
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
    ) external override reentrancyGuard(dao) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {

        ProposalDetails memory details = proposals[address(dao)][proposalId];

        IVoting votingContract = IVoting(dao.votingAdapter(proposalId));
        require(address(votingContract) != address(0), "adapter not found");

        require(
            votingContract.voteResult(dao, proposalId) ==
                IVoting.VotingState.PASS,
            "proposal has not been voted on yet"
        );

        dao.processProposal(proposalId);

        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F);

        if (details.tokenB == address(0)) {
            address pair = IUniswapV2Factory(_uniswapV2Router.factory()).getPair(details.tokenA, _uniswapV2Router.WETH());
            IERC20(pair).safeTransferFrom(details.to, address(this), details.liquidity);
            IERC20(pair).safeApprove(address(_uniswapV2Router), details.liquidity);
            (amountA, amountB) = _uniswapV2Router.removeLiquidityETH(
                details.tokenA,
                details.liquidity,
                details.amountAMin,
                details.amountBMin,
                details.to,
                details.deadline
            );
        } else {
            address pair = IUniswapV2Factory(_uniswapV2Router.factory()).getPair(details.tokenA, details.tokenB);
            IERC20(pair).safeTransferFrom(details.to, address(this), details.liquidity);
            IERC20(pair).safeApprove(address(_uniswapV2Router), details.liquidity);
            (amountA, amountB) = _uniswapV2Router.removeLiquidity(
                details.tokenA,
                details.tokenB,
                details.liquidity,
                details.amountAMin,
                details.amountBMin,
                details.to,
                details.deadline
            );
        }

        liquidity = details.liquidity;
        
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
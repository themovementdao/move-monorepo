pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

import "./interfaces/IVoting.sol";
import "./interfaces/IPool.sol";

import "../guards/MemberGuard.sol";
import "../guards/AdapterGuard.sol";


contract UniswapV3SubPoolAdapter is
    ISubPool,
    MemberGuard,
    AdapterGuard
{
    bytes32 internal constant UNISWAPV3_SUBPOOL_ADAPTER = keccak256("uniswapV3-subpool-adpt");

    struct ProposalDetails {
        address tokenA;
        address tokenB;
        uint24 tickLower;
        uint24 tickUpper;
        uint128 amountARequested;
        uint128 amountBRequested;
        address pool;
        address to;
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

        require(
            tokenA != address(0) &&
            tokenB != address(0) &&
            to != address(0),
            "invalid addresses"
        );

        dao.submitProposal(proposalId);

        ProposalDetails storage proposal = proposals[address(dao)][proposalId];

        uint256 offset = 0;
        proposal.tokenA = tokenA;
        proposal.tokenB = tokenB;
        proposal.to = to;
        proposal.tickLower = uint24(_sliceBytesUint(data, offset));
        offset += 32;
        proposal.tickUpper = uint24(_sliceBytesUint(data, offset));
        offset += 32;
        proposal.amountARequested = uint128(_sliceBytesUint(data, offset));
        offset += 32;
        proposal.amountBRequested = uint128(_sliceBytesUint(data, offset));
        offset += 32;
        proposal.pool = address(uint160(_sliceBytesUint(data, offset)));

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

        (amountA, amountB) = IUniswapV3Pool(details.pool).collect(
            details.to,
            int24(details.tickLower),
            int24(details.tickUpper),
            details.amountARequested,
            details.amountBRequested
        );

        liquidity = uint256(uint160(details.pool));

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
pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3MintCallback.sol";

import "./interfaces/IVoting.sol";
import "./interfaces/IPool.sol";

import "../guards/MemberGuard.sol";
import "../guards/AdapterGuard.sol";


interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
}

contract UniswapV3AddPoolAdapter is
    IUniswapV3MintCallback,
    IAddPool,
    MemberGuard,
    AdapterGuard {
    using SafeERC20 for IERC20;
    bytes32 internal constant UNISWAPV3_ADDPOOL_ADAPTER = keccak256("uniswapV3-addpool-adpt");
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    struct ProposalDetails {
        address tokenA;
        address tokenB;
        uint24 tickLower;
        uint24 tickUpper;
        uint128 amount;
        address to;
        address pool;
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
        proposal.tickLower = uint24(_sliceBytesUint(data, offset));
        offset += 32;
        proposal.tickUpper = uint24(_sliceBytesUint(data, offset));
        offset += 32;
        proposal.amount = uint128(_sliceBytesUint(data, offset));

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
    ) external payable override reentrancyGuard(dao) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {

        ProposalDetails storage details = proposals[address(dao)][proposalId];

        IVoting votingContract = IVoting(dao.votingAdapter(proposalId));
        require(address(votingContract) != address(0), "adapter not found");

        require(
            votingContract.voteResult(dao, proposalId) ==
                IVoting.VotingState.PASS,
            "proposal has not been voted on yet"
        );

        dao.processProposal(proposalId);

        IERC20(details.tokenA).safeTransferFrom(details.to, address(this), details.amount);

        if (details.tokenB == address(0)) {
            IWETH(WETH).deposit{value: msg.value}();
            details.tokenB = WETH;
        } else {
            IERC20(details.tokenB).safeTransferFrom(details.to, address(this), details.amount);
        }

        IUniswapV3Factory _uniswapV3Factory = IUniswapV3Factory(0x1F98431c8aD98523631AE4a59f267346ea31F984);
        
        details.pool = _uniswapV3Factory.getPool(
            details.tokenA,
            details.tokenB,
            500
        );

        if (details.pool == address(0)) {
            details.pool = _uniswapV3Factory.createPool(
                details.tokenA,
                details.tokenB,
                500
            );
        }

        (amountA, amountB) = IUniswapV3Pool(details.pool).mint(
            details.to,
            int24(details.tickLower),
            int24(details.tickUpper),
            details.amount,
            abi.encodePacked(uint256(uint160(address(dao))), uint256(proposalId))
        );

        liquidity = details.amount;

        IERC20(details.tokenA).safeTransfer(details.to, details.amount - amountA);
        IERC20(details.tokenB).safeTransfer(details.to, details.amount - amountB);

        delete proposals[address(dao)][proposalId];

        emit ProposalProcessed(address(this), proposalId, details.tokenA, details.tokenB, amountA, amountB, liquidity);
    }

    function uniswapV3MintCallback(uint256 amountAOwed, 
        uint256 amountBOwed, bytes calldata data) external override {
        address dao = address(uint160(_sliceBytesUint(data, 0)));
        bytes32 proposalId = bytes32(_sliceBytesUint(data, 32));
        ProposalDetails storage details = proposals[dao][proposalId];
        require(msg.sender == details.pool, "UniswapV3AddPoolAdapter: bad pool");
        IERC20(details.tokenA).safeTransfer(msg.sender, amountAOwed);
        IERC20(details.tokenB).safeTransfer(msg.sender, amountBOwed);
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
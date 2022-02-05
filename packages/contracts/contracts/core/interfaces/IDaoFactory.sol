pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT
import '../DaoConstants.sol';

interface IDaoFactory {
    function createDao(string calldata daoName, address creator)
        external
        returns (address daoAddr);

    function initializeClone(
        address dao,
        DaoConstants.Movememt calldata movement,
        address creator
    ) external;
}

pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import '../../core/DaoRegistry.sol';

interface IOffchainVoting {
    function configureDao(
        DaoRegistry dao,
        uint256 votingPeriod,
        uint256 gracePeriod,
        uint256 fallbackThreshold
    ) external;
}

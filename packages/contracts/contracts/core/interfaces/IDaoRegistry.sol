pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "../../extensions/IExtension.sol";

interface IDaoRegistry {
    function addExtension(
        bytes32 extensionId,
        IExtension extension,
        address creator
    ) external;

    function isServiceProvider(address addr) external returns (bool);
    
    function getExtensionAddress(bytes32 extensionId) external view returns (address);
}
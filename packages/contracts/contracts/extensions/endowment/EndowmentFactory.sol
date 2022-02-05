pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

// SPDX-License-Identifier: MIT

import "../../core/DaoConstants.sol";
import "../../core/CloneFactory.sol";
import "./Endowment.sol";

contract EndowmentFactory is CloneFactory, DaoConstants {
    address public identityAddress;

    event EndowmentCreated(address endowmentAddress);

    mapping(address => address) private _extensions;


    constructor(address _identityAddress) {
        identityAddress = _identityAddress;
    }

    /**
     * @notice Create and initialize a new EndowmnetExtension
     */
    function create(address dao) external returns(address endowmnetAddress) {
        require(dao != address(0x0), "invalid dao addr");
        Endowment endowmnet = Endowment(_createClone(identityAddress));
        _extensions[dao] = address(endowmnet);
        emit EndowmentCreated(address(endowmnet));
        return address(endowmnet);
    }

    /**
     * @notice Returns the extension address created for that DAO, or 0x0... if it does not exist.
     */
    function getExtensionAddress(address dao)
        external
        view
        returns (address)
    {
        return _extensions[dao];
    }
}

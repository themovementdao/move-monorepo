pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "../../core/DaoConstants.sol";
import "../../core/CloneFactory.sol";

contract BondingCurveFactory is CloneFactory, DaoConstants {
    address public identityAddress;
    address public token;
    
    mapping(address => address) private _extensions;

    event BondingCurveCreated(address bondingCurveAddress);

    constructor(address _identityAddress, address _token) {
        identityAddress = _identityAddress;
        token = _token;
    }

    /**
     * @notice Create and initialize a new BondingCurve
     */
    function create(address dao) external returns(address bondingCurve) {
        require(dao != address(0x0), "invalid dao addr");
        bondingCurve = _createClone(identityAddress);
        _extensions[dao] = bondingCurve;
        emit BondingCurveCreated(bondingCurve);
    }

    function getExtensionAddress(address dao)
        external
        view
        returns (address)
    {
        return _extensions[dao];
    }

}

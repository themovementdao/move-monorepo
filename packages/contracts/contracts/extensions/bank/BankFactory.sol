pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

// SPDX-License-Identifier: MIT

import "../../core/DaoConstants.sol";
import "../../core/CloneFactory.sol";
import "./Bank.sol";

contract BankFactory is CloneFactory, DaoConstants {
    address public identityAddress;

    event BankCreated(address bankAddress);

    mapping(address => address) private _extensions;


    constructor(address _identityAddress) {
        identityAddress = _identityAddress;
    }

    /**
     * @notice Create and initialize a new BankExtension
     * @param maxExternalTokens The maximum number of external tokens stored in the Bank
     */
    function create(address dao, uint8 maxExternalTokens) external returns(address bankAddress) {
        require(dao != address(0x0), "invalid dao addr");
        BankExtension bank = BankExtension(_createClone(identityAddress));
        _extensions[dao] = address(bank);
        bank.setMaxExternalTokens(maxExternalTokens);
        emit BankCreated(address(bank));
        return address(bank);
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

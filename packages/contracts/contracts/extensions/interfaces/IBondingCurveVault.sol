pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT


/**
 * @dev Interface of the Vault.
 */
interface IBondingCurveVault {
    event ReceiveETH(address from, uint256 value);
    event TransferToken(address indexed token, address indexed to, uint256 value);
    event ApproveToken(address indexed token, address indexed to, uint256 value);
    event TransferETH(address indexed to, uint256 value);

    /**
    * @notice Transfer `_value` `_token` from the Vault to `_to`
    * @param _token Address of the token being transferred
    * @param _to Address of the recipient of tokens
    * @param _value Amount of tokens being transferred
    */
    function transfer(address _token, address _to, uint256 _value) external;

    /**
    * @notice Approve `_value` `_token` from the Vault to `_to`
    * @param _token Address of the token being transferred
    * @param _to Address of the recipient of tokens
    * @param _value Amount of tokens being transferred
    */
    function approve(address _token, address _to, uint256 _value) external;

    /**
    * @notice Transfer `_value` of ETH from the Vault to `_to`
    * @param _to Address of the recipient of tokens
    * @param _value Amount of tokens being transferred
    */
    function transferETH(address _to, uint256 _value) external;
}

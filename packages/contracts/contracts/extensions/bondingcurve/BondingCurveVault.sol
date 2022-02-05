pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IBondingCurveVault.sol";


contract BondingCurveVault is 
    IBondingCurveVault,
    Ownable {
    using SafeERC20 for IERC20;
    
    receive() external payable {
        emit ReceiveETH(msg.sender, msg.value);
    } 

    /**
    * @notice Transfer `_value` `_token` from the Vault to `_to`
    * @param _token Address of the token being transferred
    * @param _to Address of the recipient of tokens
    * @param _value Amount of tokens being transferred
    */
    function transfer(address _token, address _to, uint256 _value) external override onlyOwner {
        IERC20(_token).safeTransfer(_to, _value);
        emit TransferToken(_token, _to, _value);
    }

    /**
    * @notice Approve `_value` `_token` from the Vault to `_to`
    * @param _token Address of the token being transferred
    * @param _to Address of the recipient of tokens
    * @param _value Amount of tokens being transferred
    */
    function approve(address _token, address _to, uint256 _value) external override onlyOwner {
        IERC20(_token).safeApprove(_to, _value);
        emit ApproveToken(_token, _to, _value);
    }

    /**
    * @notice Transfer `_value` of ETH from the Vault to `_to`
    * @param _to Address of the recipient of tokens
    * @param _value Amount of tokens being transferred
    */
    function transferETH(address _to, uint256 _value) external override onlyOwner {
        require(address(this). balance >= _value, "BONDINGCURVEVAULT: not enought funds");
        (bool success, ) = _to.call{ value: _value}("1");
        require(success, 'ETH_TRANSFER_FAILED');
        emit TransferETH(_to, _value);
    }
}
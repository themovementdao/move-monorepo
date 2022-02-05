pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

interface IEndowment {
    enum BALANCE_TYPE {
        INITIATIVE_BALANCE,
        ENDOWMENT_BALANCE
    }

    function balanceOf(address _movement) external view returns(address, uint256[2] memory);
    function balanceOfErc20(address _movement, address _token) 
        external view returns(address, uint256[2] memory);

    function addMovement(
        address _movement,
        address _token,
        address _creator
    ) external;

    function addBalance(
        address _movement,
        uint256 _amount,
        BALANCE_TYPE _type
    ) external;

    function subBalance(
        address _movement,
        uint256 _amount,
        BALANCE_TYPE _type
    ) external;

    function addERC20Balance(
        address _movement,
        address _token,
        address _from,
        uint256 _amount,
        BALANCE_TYPE _type
    ) external payable;

    function subERC20Balance(
        address _movement,
        address _token,
        address _to,
        uint256 _amount,
        BALANCE_TYPE _type
    ) external;

    function addERC721(
        address _movement,
        address _token,
        address _from,
        uint256 _tokenId,
        BALANCE_TYPE _type
    ) external;

    function subERC721(
        address _movement,
        address _token,
        address _to,
        uint256 _tokenId,
        BALANCE_TYPE _type
    ) external;
}
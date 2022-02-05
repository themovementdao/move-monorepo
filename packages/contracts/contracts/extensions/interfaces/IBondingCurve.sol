pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "./IBancorFormula.sol";

/*
    Bancor Formula interface
*/
interface IBondingCurve {

    function initializeCurve(
        IBancorFormula               _formula,
        address                      _movement,
        address                      _endowment,
        uint256                      _endowment_ppm,
        address                      _beneficiary,
        uint256                      _buyFeePct,
        uint256                      _sellFeePct,
        uint64                       _timeStart,
        uint64                       _timeCooldown,
        uint64                       _timeEnd
    ) external;

    function addCollateralToken(
        address _collateral, 
        uint256 _virtualSupply, 
        uint256 _virtualBalance, 
        uint32 _reserveRatio
    ) external;
    
    function setTokenAndFundingGoal(address _token, uint256 _fundingGoal) external;
}
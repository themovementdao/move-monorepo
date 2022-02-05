pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./BondingCurveToken.sol";
import "./BondingCurveVault.sol";
import "../interfaces/IBancorFormula.sol";
import "../interfaces/IBondingCurve.sol";
import "../interfaces/IEndowment.sol";
import "../IExtension.sol";
import "../../utils/Arrays.sol";
import "../../core/DaoRegistry.sol";
import "../../core/DaoConstants.sol";
import "../../guards/MemberGuard.sol";
import "../interfaces/IBank.sol";

contract BondingCurve is 
    IExtension,
    IBondingCurve,
    DaoConstants,
    MemberGuard,
    Initializable,
    Context,
    Ownable,
    Pausable,
    ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath  for uint256;
    using Address   for address;
    using Arrays    for address[];

    uint256 public constant PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10 ** 16; 100% = 10 ** 18
    uint32  public constant PPM      = 1000000;
    address public constant ETH = address(0);
    

    string private constant ERROR_CONTRACT_IS_EOA                = "MM_CONTRACT_IS_EOA";
    string private constant ERROR_INVALID_BENEFICIARY            = "MM_INVALID_BENEFICIARY";
    string private constant ERROR_INVALID_VESTING                = "MM_INVALID_VESTING";
    string private constant ERROR_INVALID_STAKING                = "MM_INVALID_STAKING";
    string private constant ERROR_INVALID_PERCENTAGE             = "MM_INVALID_PERCENTAGE";
    string private constant ERROR_INVALID_RESERVE_RATIO          = "MM_INVALID_RESERVE_RATIO";
    string private constant ERROR_INVALID_TM_SETTING             = "MM_INVALID_TM_SETTING";
    string private constant ERROR_INVALID_COLLATERAL             = "MM_INVALID_COLLATERAL";
    string private constant ERROR_INVALID_COLLATERAL_VALUE       = "MM_INVALID_COLLATERAL_VALUE";
    string private constant ERROR_INVALID_BOND_AMOUNT            = "MM_INVALID_BOND_AMOUNT";
    string private constant ERROR_COLLATERAL_ALREADY_WHITELISTED = "MM_COLLATERAL_ALREADY_WHITELISTED";
    string private constant ERROR_COLLATERAL_NOT_WHITELISTED     = "MM_COLLATERAL_NOT_WHITELISTED";
    string private constant ERROR_SLIPPAGE_EXCEEDS_LIMIT         = "MM_SLIPPAGE_EXCEEDS_LIMIT";
    string private constant ERROR_TRANSFER_FAILED                = "MM_TRANSFER_FAILED";
    string private constant ERROR_NOT_BUY_FUNCTION               = "MM_NOT_BUY_FUNCTION";
    string private constant ERROR_BUYER_NOT_FROM                 = "MM_BUYER_NOT_FROM";
    string private constant ERROR_COLLATERAL_NOT_SENDER          = "MM_COLLATERAL_NOT_SENDER";
    string private constant ERROR_DEPOSIT_NOT_AMOUNT             = "MM_DEPOSIT_NOT_AMOUNT";
    string private constant ERROR_NO_PERMISSION                  = "MM_NO_PERMISSION";
    string private constant ERROR_TOKEN_NOT_SENDER               = "MM_TOKEN_NOT_SENDER";
    string private constant ERROR_INVALID_BUY_ORDER_DATA         = "MM_INVALID_BUY_ORDER_DATA";
    string private constant ERROR_BAD_TIMES                      = "MM_BAD_TIMES";

    string private constant ERROR_AUTH_FAILED = "APP_AUTH_FAILED";

    uint256 public funding_goal; // = 50000 * 10 ** 18;

    modifier timeBuy {
        require(block.timestamp >= timeStart && block.timestamp < timeCooldown, ERROR_BAD_TIMES);
        _;
    }

    modifier timeSell {
        uint256 _amount;
        if (_collaterals[0] == ETH) {
            _amount = address(reserve).balance;
        }else {
           _amount = IERC20(_collaterals[0]).balanceOf(address(reserve));
        }
        require(block.timestamp >= timeStart && (block.timestamp < timeEnd || _amount < funding_goal), ERROR_BAD_TIMES);
        _;
    }

    modifier timeClaim {
        require(block.timestamp >= timeEnd, ERROR_BAD_TIMES);
        _;
    }

    modifier timeClaimAndFundingGoal {
        uint256 _amount;
        if (_collaterals[0] == ETH) {
            _amount = address(reserve).balance;
        }else {
           _amount = IERC20(_collaterals[0]).balanceOf(address(reserve));
        }
        require(block.timestamp >= timeEnd && _amount >= funding_goal, ERROR_BAD_TIMES);
        _;
    }

    struct Collateral {
        uint256 virtualSupply;
        uint256 virtualBalance;
        bool    whitelisted;
        uint32  reserveRatio;
    }

    IERC20 public token;
    IBondingCurveToken public bondingToken;
    IBondingCurveVault public reserve;
    address public movement;
    IEndowment public endowment;
    uint256 public intiative_goal;
    address public beneficiary;
    IBancorFormula public formula;

    uint256 public buyFeePct;
    uint256 public sellFeePct;
    uint64 public timeStart;
    uint64 public timeCooldown;
    uint64 public timeEnd;
    bool private _bonding_initialized;

    address public vesting;
    address public staking;
    uint256 public vestingPercent = 2;
    uint256 public stakingPercent = 2;
    
    DaoRegistry public _dao;

    mapping(address => Collateral) public collaterals;
    address[] private _collaterals;

    event Withdraw(
        address endowment,
        address[] _collaterals,
        uint256[] balances);
    event UpdateBeneficiary(address indexed beneficiary);
    event UpdateFormula(address indexed formula);
    event UpdateFees(
        uint256 buyFeePct,
        uint256 sellFeePct);
    event AddCollateralToken(
        address indexed collateral,
        uint256 virtualSupply,
        uint256 virtualBalance,
        uint32  reserveRatio);
    event RemoveCollateralToken(
        address indexed collateral);
    event UpdateCollateralToken(
        address indexed collateral,
        uint256 virtualSupply,
        uint256 virtualBalance,
        uint32  reserveRatio);
    event MakeBuyOrder(
        address indexed buyer,
        address indexed collateral,
        uint256 fee,
        uint256 purchaseAmount,
        uint256 returnedAmount,
        uint256 feePct);
    event MakeSellOrder(
        address indexed seller,
        address indexed collateral,
        uint256 fee,
        uint256 sellAmount,
        uint256 returnedAmount,
        uint256 feePct);
    event ClaimTokens(
        address indexed seller,
        uint256 amount
    );

    /***** external function *****/

    function initialize(DaoRegistry dao, address creator) external override initializer {
        _dao = dao;
        _transferOwnership(creator);
    }

    /**
     * @notice Initialize market maker
     * @param _formula      The address of the BancorFormula [computation] contract
     * @param _movement     The address of the Movement contract
     * @param _endowment    The address of the Endowment contract
     * @param _intiative_goal The amount sent to Endowment contract Endowment balance in ppm
     * @param _beneficiary  The address of the beneficiary [to whom fees are to be sent]
     * @param _buyFeePct    The fee to be deducted from buy orders [in PCT_BASE]
     * @param _sellFeePct   The fee to be deducted from sell orders [in PCT_BASE]
     * @param _timeStart    The timestamp when bonding starts
     * @param _timeCooldown The timestamp when only token sales available
     * @param _timeEnd      The timestamp when bonding ends
    */
    function initializeCurve(
        IBancorFormula               _formula,
        address                      _movement,
        address                      _endowment,
        uint256                      _intiative_goal,
        address                      _beneficiary,
        uint256                      _buyFeePct,
        uint256                      _sellFeePct,
        uint64                       _timeStart,
        uint64                       _timeCooldown,
        uint64                       _timeEnd
    )
        external override 
    {
        require(!_bonding_initialized, "already initialized");
        require(address(_formula).isContract(), ERROR_CONTRACT_IS_EOA);
        require(address(_endowment).isContract(), ERROR_CONTRACT_IS_EOA);
        require(_beneficiaryIsValid(_beneficiary), ERROR_INVALID_BENEFICIARY);
        require(_feeIsValid(_buyFeePct) && _feeIsValid(_sellFeePct), ERROR_INVALID_PERCENTAGE);
        require(block.timestamp < _timeStart && _timeStart < _timeCooldown && _timeCooldown < _timeEnd, ERROR_BAD_TIMES);

        bondingToken = new BondingCurveToken();
        formula = _formula;
        reserve = new BondingCurveVault();
        movement = _movement;
        endowment = IEndowment(_endowment);
        intiative_goal = _intiative_goal;
        beneficiary = _beneficiary;
        buyFeePct = _buyFeePct;
        sellFeePct = _sellFeePct;
        timeStart = _timeStart;
        timeCooldown = _timeCooldown;
        timeEnd = _timeEnd;
        _bonding_initialized = true;
    }

    fallback(bytes calldata data) external payable returns (bytes memory) {
        if (data.length == 0) {
            makeBuyOrder(msg.sender, address(0), msg.value, 1);
        }
    }

    function setTokenAndFundingGoal(address _token, uint256 _fundingGoal) external override onlyOwnerOrServiceProvider(owner(), _dao) {
        token = IERC20(_token);
        funding_goal = _fundingGoal;
    }

    function withdraw() external timeClaimAndFundingGoal onlyOwnerOrServiceProvider(owner(), _dao) {
       IBank bank = IBank(_dao.getExtensionAddress(BANK));
       bank.addToBalance(
            address(this),
            UNITS,
            bondingToken.totalSupply()
        );

        if (address(reserve).balance > 0) {
            reserve.transferETH(address(this), address(reserve).balance);
        } 

        uint256[] memory balances = new uint256[](_collaterals.length);
        for (uint256 i = 0; i < _collaterals.length;) {
            address tkn = _collaterals[i];
            if (tkn == address(0)) {
                uint256 balance = address(this).balance;
                balances[i] = balance;
                if (balance > 0) {
                    endowment.addERC20Balance{ value: intiative_goal }(movement, address(0), address(0),
                    intiative_goal, IEndowment.BALANCE_TYPE.INITIATIVE_BALANCE);
                    endowment.addERC20Balance{ value: balance - intiative_goal }(movement, address(0), address(0),
                        balance - intiative_goal, IEndowment.BALANCE_TYPE.ENDOWMENT_BALANCE);
                }
            } else {
                uint256 tbalance = IERC20(tkn).balanceOf(address(reserve));
                balances[i] = tbalance;
                if (tbalance > 0) {
                    reserve.approve(tkn, address(endowment), tbalance);
                    endowment.addERC20Balance(movement, tkn, address(reserve),
                        intiative_goal, IEndowment.BALANCE_TYPE.INITIATIVE_BALANCE);
                    endowment.addERC20Balance(movement, tkn, address(reserve),
                        tbalance - intiative_goal, IEndowment.BALANCE_TYPE.ENDOWMENT_BALANCE);
                }
            }
            unchecked{ i++; }
        }
        emit Withdraw(address(endowment), _collaterals, balances);
    }

    /**
     * @notice Put contract on pause [buy, sell, claim stopped]
    */
    function pause() external onlyOwnerOrServiceProvider(owner(), _dao) {
        super._pause();
    }

    /**
     * @notice Resume contract from pause [buy, sell, claim allowed]
    */
    function resume() external onlyOwnerOrServiceProvider(owner(), _dao) {
        super._unpause();
    }

    /* generic settings related function */

    /**
     * @notice Update formula to `_formula`. COMMENTED DUE TO CONTRACT SIZE.
     * @param _formula The address of the new BancorFormula [computation] contract
    */
    /*function updateFormula(IBancorFormula _formula) external onlyOwner {
        require(address(_formula).isContract(), ERROR_CONTRACT_IS_EOA);

        _updateFormula(_formula);
    }*/

    /**
     * @notice Update beneficiary to `_beneficiary`. COMMENTED DUE TO CONTRACT SIZE.
     * @param _beneficiary The address of the new beneficiary [to whom fees are to be sent]
    */
    /*function updateBeneficiary(address _beneficiary) external onlyOwner {
        require(_beneficiaryIsValid(_beneficiary), ERROR_INVALID_BENEFICIARY);

        _updateBeneficiary(_beneficiary);
    }*/

    /**
     * @notice Update fees deducted from buy and sell orders to respectively `@formatPct(_buyFeePct)`% and `@formatPct(_sellFeePct)`%
     * @param _buyFeePct  The new fee to be deducted from buy orders [in PCT_BASE]
     * @param _sellFeePct The new fee to be deducted from sell orders [in PCT_BASE]
    */
/*    function updateFees(uint256 _buyFeePct, uint256 _sellFeePct) external onlyOwnerOrServiceProvider(owner(), _dao) {
        require(_feeIsValid(_buyFeePct) && _feeIsValid(_sellFeePct), ERROR_INVALID_PERCENTAGE);

        _updateFees(_buyFeePct, _sellFeePct);
    }
*/
    /* collateral tokens related functions */

    /**
     * @notice Add `_collateral.symbol(): string` as a whitelisted collateral token
     * @param _collateral     The address of the collateral token to be whitelisted
     * @param _virtualSupply  The virtual supply to be used for that collateral token [in wei]
     * @param _virtualBalance The virtual balance to be used for that collateral token [in wei]
     * @param _reserveRatio   The reserve ratio to be used for that collateral token [in PPM]
    */
    function addCollateralToken(address _collateral, uint256 _virtualSupply, uint256 _virtualBalance, uint32 _reserveRatio)
        external override onlyOwnerOrServiceProvider(owner(), _dao)
    {
        require(_collateral == ETH || IERC20(_collateral).totalSupply() > 0, ERROR_INVALID_COLLATERAL);
        require(!_collateralIsWhitelisted(_collateral),                     ERROR_COLLATERAL_ALREADY_WHITELISTED);
        require(_reserveRatioIsValid(_reserveRatio),                        ERROR_INVALID_RESERVE_RATIO);

        _addCollateralToken(_collateral, _virtualSupply, _virtualBalance, _reserveRatio);
    }

    /**
      * COMMENTED DUE TO CONTRACT SIZE.
      * @notice Remove `_collateral.symbol(): string` as a whitelisted collateral token
      * @param _collateral The address of the collateral token to be un-whitelisted
    */
    /*function removeCollateralToken(address _collateral) external onlyOwner {
        require(_collateralIsWhitelisted(_collateral), ERROR_COLLATERAL_NOT_WHITELISTED);

        _removeCollateralToken(_collateral);
    }*/

    /**
     * COMMENTED DUE TO CONTRACT SIZE.
     * @notice Update `_collateral.symbol(): string` collateralization settings
     * @param _collateral     The address of the collateral token whose collateralization settings are to be updated
     * @param _virtualSupply  The new virtual supply to be used for that collateral token [in wei]
     * @param _virtualBalance The new virtual balance to be used for that collateral token [in wei]
     * @param _reserveRatio   The new reserve ratio to be used for that collateral token [in PPM]
    */
    /*function updateCollateralToken(address _collateral, uint256 _virtualSupply, uint256 _virtualBalance, uint32 _reserveRatio)
        external onlyOwner
    {
        require(_collateralIsWhitelisted(_collateral), ERROR_COLLATERAL_NOT_WHITELISTED);
        require(_reserveRatioIsValid(_reserveRatio),   ERROR_INVALID_RESERVE_RATIO);

        _updateCollateralToken(_collateral, _virtualSupply, _virtualBalance, _reserveRatio);
    }*/

    /**
     * @notice Update vesting to `_vesting`
     * @param _vesting The address of the new vesting [to whom vesting amount are to be sent]
    */
    function updateVesting(
        address _vesting, 
        uint256 _percentVesting,
        address _staking, 
        uint256 _percentStaking
    ) external onlyOwnerOrServiceProvider(owner(), _dao) {
        staking = _staking;
        stakingPercent = _percentStaking;

        vesting = _vesting;
        vestingPercent = _percentVesting;
    }


    /* market making related functions */

    /**
     * @notice Make a buy order worth `@tokenAmount(_collateral, _depositAmount)` for atleast `@tokenAmount(self.token(): address, _minReturnAmountAfterFee)`
     * @param _buyer The address of the buyer
     * @param _collateral The address of the collateral token to be deposited
     * @param _depositAmount The amount of collateral token to be deposited
     * @param _minReturnAmountAfterFee The minimum amount of the returned bonded tokens
     */
    function makeBuyOrder(address _buyer, address _collateral, uint256 _depositAmount, uint256 _minReturnAmountAfterFee)
        public payable nonReentrant whenNotPaused timeBuy
    {
        require(_collateralIsWhitelisted(_collateral), ERROR_COLLATERAL_NOT_WHITELISTED);
        require(_collateralValueIsValid(_collateral, _depositAmount), ERROR_INVALID_COLLATERAL_VALUE);

        uint256 fee = _depositAmount.mul(buyFeePct).div(PCT_BASE);
        uint256 depositAmountLessFee = _depositAmount.sub(fee);

        uint256 collateralSupply = bondingToken.totalSupply().add(collaterals[_collateral].virtualSupply);
        uint256 collateralBalanceOfReserve = _balanceOf(address(reserve), _collateral).add(collaterals[_collateral].virtualBalance);
        uint32 reserveRatio = collaterals[_collateral].reserveRatio;
        uint256 returnAmount = formula.calculatePurchaseReturn(collateralSupply, collateralBalanceOfReserve, reserveRatio, depositAmountLessFee);

        // collect fee and collateral
        if (_collateral == ETH) {
            (bool success, ) = address(reserve).call{value: _depositAmount}(new bytes(0));
            require(success, ERROR_TRANSFER_FAILED);
        } else {
            IERC20(_collateral).safeTransferFrom(_buyer, address(reserve), _depositAmount);
        }

        // deduct fee
        if (fee > 0) {
            reserve.transfer(_collateral, beneficiary, fee);
        }

        require(returnAmount >= _minReturnAmountAfterFee, ERROR_SLIPPAGE_EXCEEDS_LIMIT);

        if (returnAmount > 0) {
            bondingToken.mint(_buyer, returnAmount);
        }

        emit MakeBuyOrder(_buyer, _collateral, fee, depositAmountLessFee, returnAmount, buyFeePct);
    }

    /**
     * @notice Make a sell order worth `@tokenAmount(self.token(): address, _sellAmount)` for atleast `@tokenAmount(_collateral, _minReturnAmountAfterFee)`
     * @param _seller The address of the seller
     * @param _collateral The address of the collateral token to be returned
     * @param _sellAmount The amount of bonded token to be spent
     * @param _minReturnAmountAfterFee The minimum amount of the returned collateral tokens
     */
    function makeSellOrder(address _seller, address _collateral, uint256 _sellAmount, uint256 _minReturnAmountAfterFee)
        external nonReentrant whenNotPaused timeSell
    {
        require(_collateralIsWhitelisted(_collateral), ERROR_COLLATERAL_NOT_WHITELISTED);
        require(_bondAmountIsValid(_seller, _sellAmount), ERROR_INVALID_BOND_AMOUNT);

        uint256 collateralSupply = bondingToken.totalSupply().add(collaterals[_collateral].virtualSupply);
        uint256 collateralBalanceOfReserve = _balanceOf(address(reserve), _collateral).add(collaterals[_collateral].virtualBalance);
        uint32 reserveRatio = collaterals[_collateral].reserveRatio;
        uint256 returnAmount = formula.calculateSaleReturn(collateralSupply, collateralBalanceOfReserve, reserveRatio, _sellAmount);

        uint256 fee = returnAmount.mul(sellFeePct).div(PCT_BASE);
        uint256 returnAmountLessFee = returnAmount.sub(fee);

        require(returnAmountLessFee >= _minReturnAmountAfterFee, ERROR_SLIPPAGE_EXCEEDS_LIMIT);

        bondingToken.burn(_seller, _sellAmount);

        if (returnAmountLessFee > 0) {
            if (_collateral == ETH) {
                reserve.transferETH(_seller, returnAmountLessFee);
            } else {
                reserve.transfer(_collateral, _seller, returnAmountLessFee);
            }
        }
        if (fee > 0) {
            if (_collateral == ETH) {
                reserve.transferETH(beneficiary, returnAmountLessFee);
            } else {
               reserve.transfer(_collateral, beneficiary, fee);
            }
        }

        emit MakeSellOrder(_seller, _collateral, fee, _sellAmount, returnAmountLessFee, sellFeePct);
    }

    /**
     * @notice Claims user tokens depends on internal balance
     */
    function claimTokens() external whenNotPaused timeClaim {
        address sender = _msgSender();
        uint256 balance = bondingToken.balanceOf(sender);
        require(balance != 0, 'insufficient funds');
        DaoRegistry(payable(movement)).potentialNewMember(sender);
        bondingToken.burn(sender, balance);
        token.safeTransfer(sender, balance);
        if (stakingPercent > 0 && vestingPercent > 0) {
            token.safeTransfer(vesting, balance * vestingPercent / PPM );
            token.safeTransfer(staking, balance * stakingPercent / PPM );
        }
        emit ClaimTokens(sender, balance);
    }

    /***** public view functions *****/

    function getCollateralToken(address _collateral) public view returns (bool, uint256, uint256, uint32) {
        Collateral storage collateral = collaterals[_collateral];

        return (collateral.whitelisted, collateral.virtualSupply, collateral.virtualBalance, collateral.reserveRatio);
    }

    function getStaticPricePPM(uint256 _supply, uint256 _balance, uint32 _reserveRatio)
        public pure returns (uint256)
    {
        return uint256(PPM).mul(uint256(PPM)).mul(_balance).div(_supply.mul(uint256(_reserveRatio)));
    }

    /**
     * @notice Evaluate a buy order amount
     * @param _collateral The address of the collateral token to be deposited
     * @param _depositAmount The amount of collateral token to be deposited
     */
    function evaluateBuyOrder(address _collateral, uint256 _depositAmount) public view returns (uint256 returnAmount)
    {
        uint256 fee = _depositAmount.mul(buyFeePct).div(PCT_BASE);
        uint256 depositAmountLessFee = _depositAmount.sub(fee);

        uint256 collateralSupply = bondingToken.totalSupply().add(collaterals[_collateral].virtualSupply);
        uint256 collateralBalanceOfReserve = _balanceOf(address(reserve), _collateral).add(collaterals[_collateral].virtualBalance);
        uint32 reserveRatio = collaterals[_collateral].reserveRatio;
        returnAmount = formula.calculatePurchaseReturn(collateralSupply, collateralBalanceOfReserve, reserveRatio, depositAmountLessFee);
    }

    /**
     * @notice Evaluate a sell order amount
     * @param _collateral The address of the collateral token to be returned
     * @param _sellAmount The amount of bonded token to be spent
     */
    function evaluateSellOrder(address _collateral, uint256 _sellAmount) public view returns (uint256 returnAmount)
    {
        uint256 collateralSupply = bondingToken.totalSupply().add(collaterals[_collateral].virtualSupply);
        uint256 collateralBalanceOfReserve = _balanceOf(address(reserve), _collateral).add(collaterals[_collateral].virtualBalance);
        uint32 reserveRatio = collaterals[_collateral].reserveRatio;
        returnAmount = formula.calculateSaleReturn(collateralSupply, collateralBalanceOfReserve, reserveRatio, _sellAmount);

        uint256 fee = returnAmount.mul(sellFeePct).div(PCT_BASE);
        returnAmount = returnAmount.sub(fee);
    }

    /***** internal functions *****/

    /* check functions */

    function _balanceOf(address _who, address _token) internal view returns (uint256) {
        return _token == ETH ? _who.balance : IERC20(_token).balanceOf(_who);
    }

    function _beneficiaryIsValid(address _beneficiary) internal pure returns (bool) {
        return _beneficiary != address(0);
    }

    function _feeIsValid(uint256 _fee) internal pure returns (bool) {
        return _fee < PCT_BASE;
    }

    function _reserveRatioIsValid(uint32 _reserveRatio) internal pure returns (bool) {
        return _reserveRatio <= PPM;
    }

    function _collateralValueIsValid(address _collateral, uint256 _value)
        internal view returns (bool)
    {
        if (_value == 0) {
            return false;
        }

        if (_collateral == ETH) {
            return msg.value == _value;
        }

        return msg.value == 0;
    }

    function _bondAmountIsValid(address _seller, uint256 _amount) internal view returns (bool) {
        return _amount != 0 && bondingToken.balanceOf(_seller) >= _amount;
    }

    function _collateralIsWhitelisted(address _collateral) internal view returns (bool) {
        return collaterals[_collateral].whitelisted;
    }

    /* state modifiying functions */

    /*function _updateBeneficiary(address _beneficiary) internal {
        beneficiary = _beneficiary;

        emit UpdateBeneficiary(_beneficiary);
    }*/

    /*function _updateFormula(IBancorFormula _formula) internal {
        formula = _formula;

        emit UpdateFormula(address(_formula));
    }*/

    function _updateFees(uint256 _buyFeePct, uint256 _sellFeePct) internal {
        buyFeePct = _buyFeePct;
        sellFeePct = _sellFeePct;

        emit UpdateFees(_buyFeePct, _sellFeePct);
    }

    function _addCollateralToken(address _collateral, uint256 _virtualSupply, uint256 _virtualBalance, uint32 _reserveRatio)
        internal
    {
        Collateral storage collateral = collaterals[_collateral];
        collateral.whitelisted = true;
        collateral.virtualSupply = _virtualSupply;
        collateral.virtualBalance = _virtualBalance;
        collateral.reserveRatio = _reserveRatio;
        _collaterals.push(_collateral);
        emit AddCollateralToken(_collateral, _virtualSupply, _virtualBalance, _reserveRatio);
    }

    /*function _removeCollateralToken(address _collateral) internal {
        delete collaterals[_collateral];
        _collaterals.removeOne(_collateral);

        emit RemoveCollateralToken(_collateral);
    }*/

    /*function _updateCollateralToken(
        address _collateral,
        uint256 _virtualSupply,
        uint256 _virtualBalance,
        uint32  _reserveRatio
    )
        internal
    {
        collaterals[_collateral].virtualSupply = _virtualSupply;
        collaterals[_collateral].virtualBalance = _virtualBalance;
        collaterals[_collateral].reserveRatio = _reserveRatio;

        emit UpdateCollateralToken(_collateral, _virtualSupply, _virtualBalance, _reserveRatio);
    }*/
}
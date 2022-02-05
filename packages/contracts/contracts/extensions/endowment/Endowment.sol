pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../interfaces/IEndowment.sol";
import "../IExtension.sol";
import "../../guards/MemberGuard.sol";
import "../../core/DaoConstants.sol";


contract Endowment is 
    IExtension,
    IEndowment,
    DaoConstants,
    Initializable,
    MemberGuard {
    using SafeERC20 for IERC20;

    DaoRegistry public dao;

    struct Movement {
        address token;
        uint256[2] tbalances;
        uint256[2] ebalances;
        mapping(address => uint256[2]) erc20s;
        mapping(address => mapping(uint256 => bool[2])) erc721s;
    }

    mapping(address => Movement) private movements;
    address[] private _movements;

    fallback() external payable {}
    receive() external payable {}
   
    modifier onlyServiceProviderOrIntiativeAdapter() {
        require(dao.getAdapterAddress(INTIATIVE_ADAPT) == msg.sender 
        || IDaoRegistry(dao.getMemberAddress(1)).isServiceProvider(msg.sender), "accessDenided");
        _;
    }

    function initialize(DaoRegistry _dao, address creator) external override initializer {
        require(_dao.isMember(creator), "endowment::not member");
        dao = _dao;
    }

    function balanceOf(address _movement) 
        public view override returns(address, uint256[2] memory) 
    {
        Movement storage movement = movements[_movement];
        return (movement.token, movement.tbalances);
    }

    function balanceOfErc20(address _movement, address _token) 
        public view override returns(address, uint256[2] memory) 
    {
         Movement storage movement = movements[_movement];
         return (movement.token, movement.erc20s[_token]);
    }

    function addMovement(
        address _movement,
        address _token,
        address _creator
    ) external override onlyMember2(dao, _creator) {
        Movement storage movement = movements[_movement];
        require(movement.token == address(0), "already exists");
        movement.token = _token;
        _movements.push(_movement);
    }

    function addBalance(
        address _movement,
        uint256 _amount,
        BALANCE_TYPE _type
    ) external override {
        Movement storage movement = movements[_movement];
        movement.tbalances[uint256(_type)] += _amount;
    }

    function subBalance(
        address _movement,
        uint256 _amount,
        BALANCE_TYPE _type
    ) external override onlyServiceProvider(dao, msg.sender) {
        Movement storage movement = movements[_movement];
        require(movement.tbalances[uint256(_type)] - _amount >= 0, 'revert');
        movement.tbalances[uint256(_type)] -= _amount;
    }

    function addERC20Balance(
        address _movement,
        address _token,
        address _from,
        uint256 _amount,
        BALANCE_TYPE _type
    ) external payable override {
        Movement storage movement = movements[_movement];
        if (_token == address(0)) {
            require(msg.value == _amount, "wrong eth amount");
            movement.ebalances[uint256(_type)] += _amount;
        } else {
            IERC20(_token).safeTransferFrom(_from, address(this), _amount);
            movement.erc20s[_token][uint256(_type)] += _amount;
        }
    }

    function subERC20Balance(
        address _movement,
        address _token,
        address _to,
        uint256 _amount,
        BALANCE_TYPE _type
    ) external override onlyServiceProviderOrIntiativeAdapter {
        Movement storage movement = movements[_movement];
        if (_token == address(0)) {
            require(movement.ebalances[uint256(_type)] - _amount >= 0, 'revert');
            movement.ebalances[uint256(_type)] -= _amount;
            (bool success, ) = _to.call{ value: _amount }(new bytes(0));
            require(success, 'ETH_TRANSFER_FAILED'); 
        } else {
            require(movement.erc20s[_token][uint256(_type)] - _amount >= 0, 'revert');
            movement.erc20s[_token][uint256(_type)] -= _amount;
            IERC20(_token).safeTransfer(_to, _amount);
        }
    }

    function addERC721(
        address _movement,
        address _token,
        address _from,
        uint256 _tokenId,
        BALANCE_TYPE _type
    ) external override {
        require(_token != address(0), "bad input");
        IERC721(_token).safeTransferFrom(_from, address(this), _tokenId);
        Movement storage movement = movements[_movement];
        movement.erc721s[_token][_tokenId][uint256(_type)] = true;
    }

    function subERC721(
        address _movement,
        address _token,
        address _to,
        uint256 _tokenId,
        BALANCE_TYPE _type
    ) external override onlyServiceProvider(dao, msg.sender) {
        require(_token != address(0), "bad input");
        Movement storage movement = movements[_movement];
        require(movement.erc721s[_token][_tokenId][uint256(_type)], 'revert');
        movement.erc721s[_token][_tokenId][uint256(_type)] = false;
        IERC721(_token).approve(_to, _tokenId);
    }

    /**
      * @notice Borrow the asset
      * @param asset The underlying asset to borrow
      * @param to The address to send the funds
      * @param amount The amount of the underlying asset to borrow
      */
    function borrow(address asset, address to, uint56 amount) external onlyServiceProvider(dao, msg.sender) {
        if (asset == address(0)) {
            (bool success, ) = to.call{ value: amount }(new bytes(0));
            require(success, 'ETH_TRANSFER_FAILED'); 
        } else {
            IERC20(asset).safeApprove(to, amount);
        }
    }

    /**
      * @notice Repay the borrow
      * @param asset The underlying asset to repay
      * @param amount The amount of the underlying asset to repay
     */
    function repayBorrow(address asset, uint256 amount) external payable onlyServiceProvider(dao, msg.sender) {
        uint256 intern;
        uint256 actual;
        if (asset == address(0)) {
            require(msg.value == amount, 'bad input'); 
            intern = _balance(asset);
            actual = address(this).balance;
        } else {
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
            intern = _balance(asset);
            actual = IERC20(asset).balanceOf(asset);
        }
        if (actual > intern) {
            _repayBorrow(asset, actual - intern, intern);
        }
    }

    function _balance(address asset) internal view returns (uint256 amount) {
        if (asset == address(0)) {
            for (uint256 i = 0; i < _movements.length;) {
                uint256[2] storage balances = movements[_movements[i]].ebalances;
                amount += balances[0] + balances[1];
                unchecked { i++; }
            }
        } else {
            for (uint256 i = 0; i < _movements.length;) {
                uint256[2] storage balances = movements[_movements[i]].erc20s[asset];
                amount += balances[0] + balances[1];
                unchecked { i++; }
            }
        }
    }

    function _repayBorrow(address asset, uint256 amount, uint256 total) internal {
        if (asset == address(0)) {
            for (uint256 i = 0; i < _movements.length;) {
                uint256[2] storage balances = movements[_movements[i]].ebalances;
                balances[0] += balances[0] * amount / total;
                balances[1] += balances[1] * amount / total;
                unchecked { i++; }
            }
        } else {
            for (uint256 i = 0; i < _movements.length;) {
                uint256[2] storage balances = movements[_movements[i]].erc20s[asset];
                balances[0] += balances[0] * amount / total;
                balances[1] += balances[1] * amount / total;
                unchecked { i++; }
            }
        }
    }
}
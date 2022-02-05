pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

// SPDX-License-Identifier: MIT
import './DaoConstants.sol';
import './DaoRegistry.sol';
import './CloneFactory.sol';
import '../extensions/IExtension.sol';
import '../extensions/interfaces/IBondingCurve.sol';
import '../extensions/interfaces/IBancorFormula.sol';
import '../extensions/bondingcurve/BondingCurveFactory.sol';
import '../extensions/bank/BankFactory.sol';
import '../extensions/bank/Bank.sol';
import '../extensions/token/erc20/ERC20TokenExtensionFactory.sol';
import '../extensions/token/erc20/ERC20TokenExtension.sol';
import '../adapters/voting/Voting.sol';
import '../extensions/interfaces/IEndowment.sol';
/**
MIT License

Copyright (c) 2020 Openlaw

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

contract DaoFactory is CloneFactory, DaoConstants {
    struct Adapter {
        bytes32 id;
        address addr;
        uint128 flags;
    }

    // daoAddr => hashedName
    mapping(address => bytes32) public daos;
    // hashedName => daoAddr
    mapping(bytes32 => address) public addresses;

    address public identityAddress;

    /**
     * @notice Event emitted when a new DAO has been created.
     * @param _address The DAO address.
     * @param _name The DAO name.
     */
    event DAOCreated(address _address, string _name);

    constructor(address _identityAddress) {
        identityAddress = _identityAddress;
    }

    /**
     * @notice Creates and initializes a new DaoRegistry with the DAO creator and the transaction sender.
     * @notice Enters the new DaoRegistry in the DaoFactory state.
     * @dev The daoName must not already have been taken.
     * @param daoName The name of the DAO which, after being hashed, is used to access the address.
     * @param creator The DAO's creator, who will be an initial member.
     */
    function createDao(string calldata daoName, address creator)
        external
        returns (address daoAddr)
    {
        bytes32 hashedName = keccak256(abi.encode(daoName));
        require(
            addresses[hashedName] == address(0x0),
            string(abi.encodePacked('name ', daoName, ' already taken'))
        );
        DaoRegistry dao = DaoRegistry(_createClone(identityAddress));

        daoAddr = address(dao);
        dao.initialize(creator, msg.sender);

        addresses[hashedName] = daoAddr;
        daos[daoAddr] = hashedName;

        emit DAOCreated(daoAddr, daoName);
    }

    /**
     * @notice Returns the DAO address based on its name.
     * @return The address of a DAO, given its name.
     * @param daoName Name of the DAO to be searched.
     */
    function getDaoAddress(string calldata daoName)
        public
        view
        returns (address)
    {
        return addresses[keccak256(abi.encode(daoName))];
    }

    /**
     * @notice Adds adapters and sets their ACL for DaoRegistry functions.
     * @dev A new DAO is instantiated with only the Core Modules enabled, to reduce the call cost. This call must be made to add adapters.
     * @dev The message sender must be an active member of the DAO.
     * @dev The DAO must be in `CREATION` state.
     * @param dao DaoRegistry to have adapters added to.
     * @param adapters Adapter structs to be added to the DAO.
     */
    function addAdapters(DaoRegistry dao, Adapter[] calldata adapters)
        external
    {
        require(dao.isMember(msg.sender), 'not member');
        //Registring Adapters
        require(
            dao.state() == DaoRegistry.DaoState.CREATION,
            'this DAO has already been setup'
        );

        for (uint256 i = 0; i < adapters.length; i++) {
            dao.replaceAdapter(
                adapters[i].id,
                adapters[i].addr,
                adapters[i].flags,
                new bytes32[](0),
                new uint256[](0)
            );
        }
    }

    /**
     * @notice Configures extension to set the ACL for each adapter that needs to access the extension.
     * @dev The message sender must be an active member of the DAO.
     * @dev The DAO must be in `CREATION` state.
     * @param dao DaoRegistry for which the extension is being configured.
     * @param extension The address of the extension to be configured.
     * @param adapters Adapter structs for which the ACL is being set for the extension.
     */
    function configureExtension(
        DaoRegistry dao,
        address extension,
        Adapter[] calldata adapters
    ) external {
        require(dao.isMember(msg.sender), 'not member');
        //Registring Adapters
        require(
            dao.state() == DaoRegistry.DaoState.CREATION,
            'this DAO has already been setup'
        );

        for (uint256 i = 0; i < adapters.length; i++) {
            dao.setAclToExtensionForAdapter(
                extension,
                adapters[i].addr,
                adapters[i].flags
            );
        }
    }

    /**
     * @notice Removes an adapter with a given ID from a DAO, and adds a new one of the same ID.
     * @dev The message sender must be an active member of the DAO.
     * @dev The DAO must be in `CREATION` state.
     * @param dao DAO to be updated.
     * @param adapter Adapter that will be replacing the currently-existing adapter of the same ID.
     */
    function updateAdapter(DaoRegistry dao, Adapter calldata adapter) external {
        require(dao.isMember(msg.sender), 'not member');
        require(
            dao.state() == DaoRegistry.DaoState.CREATION,
            'this DAO has already been setup'
        );

        dao.replaceAdapter(
            adapter.id,
            adapter.addr,
            adapter.flags,
            new bytes32[](0),
            new uint256[](0)
        );
    }

    function initializeClone(
        address cloneDaoAddress,
        Movememt memory movement,
        address creator
    ) external {
        DaoRegistry cloneDao = DaoRegistry(payable(cloneDaoAddress));
        DaoRegistry dao = DaoRegistry(payable(msg.sender));

        ERC20Extension cloneERC20 = ERC20Extension(
            ERC20TokenExtensionFactory(dao.getFactoryAddress(ERC20_FACTORY)).create(
                address(cloneDao),
                movement.tokenName,
                UNITS,
                movement.tokenSymbol,
                18
            )
        );

        BankExtension cloneBank = BankExtension(BankFactory(
            dao.getFactoryAddress(BANK_FACTORY)
        ).create(cloneDaoAddress,100));

        cloneDao.addExtension(BANK, cloneBank, creator);
        cloneDao.addExtension(ERC20_EXT, cloneERC20, creator);
        
        // Add bondingCurve 
        address bondingCurveClone = BondingCurveFactory(
            dao.getFactoryAddress(BONDING_CURVE_FACTORY)
        ).create(address(cloneDao));

        cloneDao.potentialNewMember(bondingCurveClone);

        cloneDao.addExtension(
            BONDING_CURVE,
            IExtension(bondingCurveClone),
            address(this)
        );

        this.updateAdapter(cloneDao, Adapter(BONDING_CURVE, address(bondingCurveClone), 64));

        IEndowment(dao.getExtensionAddress(ENDOWMENT_BANK)).addMovement(
            address(cloneDao),
            address(cloneERC20),
            creator
        );

        _setupBondingCurve(
            address(cloneDao),
            bondingCurveClone, 
            dao.getAdapterAddress(BANKOR_FORMULA), 
            dao.getExtensionAddress(ENDOWMENT_BANK),
            movement.dataBondingCurve
        );
        
        _addCollateralTokenBondingCurve( 
            BondingCurveFactory(
                dao.getFactoryAddress(BONDING_CURVE_FACTORY)
            ).token(),
            bondingCurveClone, 
            movement.dataBondingCurve
        );

        _setTokenBondingCurve(bondingCurveClone, address(cloneERC20), movement.dataBondingCurve);

        // Settings Voting

        VotingContract _voting = new VotingContract();

        this.updateAdapter(cloneDao, Adapter(VOTING, address(_voting), 0));

        cloneDao.setAclToExtensionForAdapter(
            address(cloneBank),
            address(_voting),
            7
        );

        _voting.configureDao(
            cloneDao,
            movement.votingPeriod,
            600
        );

        // Add & Settings intiative
        this.updateAdapter(cloneDao, Adapter(INTIATIVE_ADAPT, dao.getAdapterAddress(INTIATIVE_ADAPT), 2));

        cloneDao.setAclToExtensionForAdapter(
            address(cloneBank),
            dao.getAdapterAddress(INTIATIVE_ADAPT),
            27
        );
    }

    function _setupBondingCurve(
        address dao,
        address bondingCurve,
        address bankorFormula,
        address endowmentBank,
        bytes memory data
    ) internal { 
        uint256 offset;
        
        uint256 _buyFeePct = _sliceBytesUint(data, offset);
        offset += 32;
        uint256 _sellFeePct = _sliceBytesUint(data, offset);
        offset += 32;
        uint256 _intiative_goal = _sliceBytesUint(data, offset);
        offset += 32;
        uint64 _timeStart = uint64(_sliceBytesUint(data, offset));
        offset += 32;
        uint64 _timeCooldown = uint64(_sliceBytesUint(data, offset));
        offset += 32;
        uint64 _timeEnd = uint64(_sliceBytesUint(data, offset));

        IBondingCurve(bondingCurve).initializeCurve(
            IBancorFormula(bankorFormula),
            dao,
            endowmentBank,
            _intiative_goal,
            endowmentBank,
            _buyFeePct,
            _sellFeePct,
            _timeStart,
            _timeCooldown,
            _timeEnd
        );
        
    }

    function _addCollateralTokenBondingCurve(
        address _token,
        address bondingCurve,
        bytes memory data
    ) internal {
        uint256 offset = 192;

        uint256 _virtualSupply = _sliceBytesUint(data, offset);
        offset += 32;
        uint256 _virtualBalance = _sliceBytesUint(data, offset);
        offset += 32;
        uint32 _reserveRatio = uint32(_sliceBytesUint(data, offset));
        
        IBondingCurve(bondingCurve).addCollateralToken(
            _token,
            _virtualSupply,
            _virtualBalance,
            _reserveRatio
        );
    }

    function _setTokenBondingCurve( address bondingCurve, address _token, bytes memory data) internal {
        uint256 offset = 288;
        uint256 _fundingGoal = _sliceBytesUint(data, offset);

        IBondingCurve(bondingCurve).setTokenAndFundingGoal(_token, _fundingGoal);
    }

    function _sliceBytesUint(bytes memory bs, uint256 start) internal pure returns (uint256) {
        start += 0x20;
        require(bs.length >= start, "slicing out of range");
        uint256 x;
        assembly {
            x := mload(add(bs, start))
        }
        return x;
    }
}

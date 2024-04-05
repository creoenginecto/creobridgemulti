// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IBridgeAssist} from './interfaces/IBridgeAssist.sol';
import {AccessControlUpgradeable} from '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';

import {ClonesUpgradeable} from '@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol';
import {EnumerableSetUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol';
import {StringsUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol';

/**
 * @title BridgeFactory
 * @author gotbit
 * @notice Contract for creating BridgeAssist contracts
 * @dev Creates BridgeAssists using the openzeppelin/Clones library
 */
contract BridgeFactory is AccessControlUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    struct BridgeAssistInfo {
        address bridgeAssist;
        address token;
    }

    bytes32 public constant CREATOR_ROLE = keccak256('CREATOR_ROLE');
    uint256 public constant ADD_REMOVE_LIMIT_PER_TIME = 100;

    address public bridgeAssistImplementation;

    EnumerableSetUpgradeable.AddressSet private _createdBridges;
    mapping(address token => EnumerableSetUpgradeable.AddressSet bridges)
        private _bridgesByToken;

    event BridgeAssistCreated(
        address indexed bridgeAssist,
        address indexed token
    );
    event BridgeAssistAdded(
        address indexed bridgeAssist,
        address indexed token
    );
    event BridgeAssistRemoved(
        address indexed bridgeAssist,
        address indexed token
    );

    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the BridgeFactory contract.
     * @param bridgeAssistImplementation_ BridgeAssist implementation
     * @param owner DEFAULT_ADMIN_ROLE holder
     */
    function initialize(
        address bridgeAssistImplementation_,
        address owner
    ) external initializer {
        require(
            bridgeAssistImplementation_ != address(0),
            'BR_ASST_IMPL: zero address'
        );
        require(owner != address(0), 'Owner: zero address');

        bridgeAssistImplementation = bridgeAssistImplementation_;
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
    }

    /**
     * @notice Creates new BridgeAssist contract
     * @param token Supported token to send
     * @param limitPerSend Limit per one send
     * @param feeWallet Platform fee wallet
     * @param feeSend Fee numerator (send)
     * @param feeFulfill Fee numerator (fulfill)
     * @param owner Bridge DEFAULT_ADMIN_ROLE holder
     * @param relayers Backend signers
     * @param relayerConsensusThreshold Number of signers required
     * to complete a transaction
     */
    function createBridgeAssist(
        address token,
        uint256 limitPerSend,
        address feeWallet,
        uint256 feeSend,
        uint256 feeFulfill,
        address owner,
        address[] memory relayers,
        uint256 relayerConsensusThreshold
    ) external onlyRole(CREATOR_ROLE) returns (address bridge) {
        bridge = ClonesUpgradeable.clone(bridgeAssistImplementation);
        IBridgeAssist(bridge).initialize(
            token,
            limitPerSend,
            feeWallet,
            feeSend,
            feeFulfill,
            owner,
            relayers,
            relayerConsensusThreshold
        );

        _createdBridges.add(bridge);
        _bridgesByToken[token].add(bridge);

        emit BridgeAssistCreated(bridge, token);
    }

    /**
     * @notice Allows to add third-party bridges to the stored list
     * @dev Third-party bridges interface must match the implementation bridge
     * @param bridges Bridge addresses to add
     */
    function addBridgeAssists(
        address[] memory bridges
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = bridges.length;
        require(length != 0, 'Zero length array');
        require(
            length <= ADD_REMOVE_LIMIT_PER_TIME,
            'Array length exceeds limit'
        );

        for (uint256 i = 0; i < length; ) {
            if (bridges[i] == address(0)) {
                revert(
                    string.concat(
                        'Bridge zero address at index: ',
                        StringsUpgradeable.toString(i)
                    )
                );
            }
            if (!_createdBridges.add(bridges[i])) {
                revert(
                    string.concat(
                        'Bridge duplicate at index: ',
                        StringsUpgradeable.toString(i)
                    )
                );
            }

            address token = IBridgeAssist(bridges[i]).TOKEN();
            if (token == address(0)) {
                revert(
                    string.concat(
                        'Token zero address at index: ',
                        StringsUpgradeable.toString(i)
                    )
                );
            }
            _bridgesByToken[token].add(bridges[i]);

            emit BridgeAssistAdded(bridges[i], token);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Allows to remove bridges from the stored list
     * @param bridges Bridge addresses to remove
     */
    function removeBridgeAssists(
        address[] memory bridges
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = bridges.length;
        require(length != 0, 'Zero length array');
        require(
            length <= ADD_REMOVE_LIMIT_PER_TIME,
            'Array length exceeds limit'
        );

        for (uint256 i = 0; i < length; ) {
            if (!_createdBridges.remove(bridges[i])) {
                revert(
                    string.concat(
                        'Bridge not found at index: ',
                        StringsUpgradeable.toString(i)
                    )
                );
            }

            address token = IBridgeAssist(bridges[i]).TOKEN();
            _bridgesByToken[token].remove(bridges[i]);

            emit BridgeAssistRemoved(bridges[i], token);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Allows to change template for creating new bridges
     * @dev Changes the implementation address for future proxy bridges
     * @param bridgeAssistImplementation_ New bridge implementaion address
     */
    function changeBridgeAssistImplementation(
        address bridgeAssistImplementation_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            bridgeAssistImplementation_ != address(0),
            'BR_ASST_IMPL: zero address'
        );
        bridgeAssistImplementation = bridgeAssistImplementation_;
    }

    /**
     * @notice Gets created bridges info
     * @param offset Offset to start with
     * @param limit Return size limit
     *
     * Requirements:
     * {offset} + {limit} must be less than or equal to {getCreatedBridgesLength}.
     */
    function getCreatedBridgesInfo(
        uint256 offset,
        uint256 limit
    ) external view returns (BridgeAssistInfo[] memory) {
        require(limit != 0, 'Limit: zero');
        require(offset + limit <= _createdBridges.length(), 'Invalid offset-limit');

        BridgeAssistInfo[] memory bridgesInfo = new BridgeAssistInfo[](limit);

        for (uint256 i = 0; i < limit; ) {
            address bridge = _createdBridges.at(i + offset);
            bridgesInfo[i] = BridgeAssistInfo({
                bridgeAssist: bridge,
                token: IBridgeAssist(bridge).TOKEN()
            });

            unchecked {
                ++i;
            }
        }

        return bridgesInfo;
    }

    /**
     * @notice Gets created bridge info by index
     * @param index Bridge index to get
     *
     * Requirements:
     * {index} must be less than {getCreatedBridgesLength}.
     */
    function getCreatedBridgeInfo(
        uint256 index
    ) external view returns (BridgeAssistInfo memory) {
        require(index < _createdBridges.length(), 'Invalid index');

        address bridge = _createdBridges.at(index);
        return
            BridgeAssistInfo({
                bridgeAssist: bridge,
                token: IBridgeAssist(bridge).TOKEN()
            });
    }

    /**
     * @notice Gets list of bridge addresses by token address
     * @param token Token address
     * @param offset Offset to start with
     * @param limit Return size limit
     *
     * Requirements:
     * {offset} + {limit} must be less than or equal to {getBridgesByTokenLength}.
     */
    function getBridgesByToken(
        address token,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory) {
        require(token != address(0), 'Token: zero address');
        require(limit != 0, 'Limit: zero');
        require(offset + limit <= _bridgesByToken[token].length(), 'Invalid offset-limit');

        address[] memory bridges = new address[](limit);

        for (uint256 i = 0; i < limit; ) {
            bridges[i] = _bridgesByToken[token].at(i + offset);

            unchecked {
                ++i;
            }
        }

        return bridges;
    }

    /**
     * @notice Gets bridge address by token address
     * @param token Token address
     * @param index Bridge index to get
     *
     * Requirements:
     * {index} must be less than or equal to {getBridgesByTokenLength}.
     */
    function getBridgeByToken(
        address token,
        uint256 index
    ) external view returns (address) {
        require(token != address(0), 'Token: zero address');
        require(index < _bridgesByToken[token].length(), 'Invalid index');

        return _bridgesByToken[token].at(index);
    }

    /**
     * @notice Gets the number of created bridges
     */
    function getCreatedBridgesLength() external view returns (uint256) {
        return _createdBridges.length();
    }

    /**
     * @notice Gets the number of created bridges for the specified token
     * @param token Token address
     */
    function getBridgesByTokenLength(
        address token
    ) external view returns (uint256) {
        return _bridgesByToken[token].length();
    }
}

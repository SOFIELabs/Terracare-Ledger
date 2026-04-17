// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TokenEngine.sol";
import "./IHiveMetadata.sol";
import "./HiveLogic.sol";

/**
 * @title IdentityRegistry
 * @dev Sovereign version upgraded to support Hexagonal Hive metadata.
 * v2.2: Restored isActive() and get() for AccessControl compatibility.
 */
contract IdentityRegistry is IHiveMetadata {
    using HiveLogic for IHiveMetadata.HiveWall;

    enum Role { Unknown, Patient, Caregiver, Admin, System, CooperativeMember }

    struct Identity {
        Role role;
        bool active;
        uint256 createdAt;
        bytes32 userId;
        bool isCooperativeMember;
        uint256 memberSince;
        // The 6-wall Hexagonal Hive container
        mapping(WallType => HiveWall) hiveWalls; 
    }

    address public owner;
    mapping(address => Identity) private identities;
    mapping(bytes32 => address) public userIdToAddress;
    
    TokenEngine public tokenEngine;
    uint256 public constant MEMBERSHIP_MINE_THRESHOLD = 1000 * 10**18;

    event HiveWallUpdated(address indexed account, WallType wall, bytes32 dataHash);
    event IdentityRegistered(address indexed account, Role role, bytes32 userId);
    event CooperativeMemberAdded(address indexed account, uint256 mineBalance);
    event CooperativeMemberRemoved(address indexed account);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ============================================
    // HEXAGONAL HIVE LOGIC
    // ============================================

    /**
     * @dev Updates a specific wall in a user's Hexagonal Hive.
     */
    function updateHiveWall(
        address account, 
        WallType wall, 
        bytes32 dataHash, 
        bool encrypted
    ) external {
        require(msg.sender == owner || msg.sender == account, "Unauthorized");
        require(identities[account].createdAt != 0, "Not registered");

        identities[account].hiveWalls[wall].updateWall(dataHash, encrypted);
        
        emit WallUpdated(account, wall, dataHash);
    }

    /**
     * @dev Retrieves data for a specific wall in the hive.
     */
    function getHiveWall(address account, WallType wall) external view returns (
        bytes32 dataHash,
        uint256 lastUpdated,
        address updater,
        bool encrypted
    ) {
        HiveWall storage hWall = identities[account].hiveWalls[wall];
        return (hWall.dataHash, hWall.lastUpdated, hWall.updater, hWall.encrypted);
    }

    // ============================================
    // CORE IDENTITY & ACCESS CONTROL COMPATIBILITY
    // ============================================

    /**
     * @dev REQUIRED BY AccessControl.sol
     * Checks if an account is active and matches a specific role.
     */
    function isActive(address account, Role role) external view returns (bool) {
        Identity storage id = identities[account];
        return id.active && id.role == role;
    }

    function register(address account, Role role) external onlyOwner {
        require(account != address(0), "Bad account");
        require(identities[account].createdAt == 0, "Already registered");
        
        bytes32 userId = keccak256(abi.encodePacked(account, block.timestamp));
        
        Identity storage id = identities[account];
        id.role = role;
        id.active = true;
        id.createdAt = block.timestamp;
        id.userId = userId;
        id.isCooperativeMember = false;
        
        userIdToAddress[userId] = account;
        
        emit IdentityRegistered(account, role, userId);
    }

    /**
     * @dev REQUIRED BY AccessControl.sol
     */
    function get(address account) external view returns (
        Role role, 
        bool active, 
        uint256 createdAt,
        bytes32 userId,
        bool isCooperativeMember
    ) {
        Identity storage id = identities[account];
        return (id.role, id.active, id.createdAt, id.userId, id.isCooperativeMember);
    }

    function getUserId(address account) external view returns (bytes32) {
        return identities[account].userId;
    }

    function getAddressByUserId(bytes32 userId) external view returns (address) {
        return userIdToAddress[userId];
    }

    function checkMembershipStatus(address account) external view returns (bool) {
        return identities[account].isCooperativeMember;
    }

    function checkCooperativeMembership(address account) external returns (bool) {
        Identity storage id = identities[account];
        require(id.createdAt != 0, "Not registered");
        require(address(tokenEngine) != address(0), "TokenEngine not set");
        
        uint256 mineBalance = tokenEngine.getTotalMINE(account);
        bool shouldBeMember = mineBalance >= MEMBERSHIP_MINE_THRESHOLD;
        
        if (shouldBeMember && !id.isCooperativeMember) {
            id.isCooperativeMember = true;
            id.memberSince = block.timestamp;
            emit CooperativeMemberAdded(account, mineBalance);
        } else if (!shouldBeMember && id.isCooperativeMember) {
            id.isCooperativeMember = false;
            id.memberSince = 0;
            emit CooperativeMemberRemoved(account);
        }
        
        return id.isCooperativeMember;
    }

    function setTokenEngine(address _tokenEngine) external onlyOwner {
        require(_tokenEngine != address(0), "Invalid address");
        tokenEngine = TokenEngine(_tokenEngine);
    }
}
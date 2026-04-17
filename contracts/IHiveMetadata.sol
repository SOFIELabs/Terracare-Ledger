// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IHiveMetadata
 * @dev Interface for the 6-wall Hexagonal Hive metadata structure.
 * This defines the standard domains for Sovereign Health.
 */
interface IHiveMetadata {
    // The 6 Walls of the Sovereign Hive
    enum WallType { 
        Vital,   // Biometrics & Health
        Echo,    // Social & Alliances
        Pulse,   // Wellbeing & Care Pathways
        Tone,    // Frequency & Therapy
        Flow,    // Transactional & Audit Logs
        Realm    // Geographic & Jurisdictional
    }

    struct HiveWall {
        bytes32 dataHash;       // IPFS/Arweave reference
        uint256 lastUpdated;    // Latest timestamp
        address updater;        // The adapter/system that performed the update
        bool encrypted;         // Privacy flag
    }

    // This event notifies the Oriana app when a wall changes
    event WallUpdated(address indexed account, WallType wall, bytes32 dataHash);
}
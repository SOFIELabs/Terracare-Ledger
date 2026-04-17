// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IHiveMetadata.sol";

/**
 * @title HiveLogic
 * @dev Internal logic for managing Hexagonal Hive walls.
 */
library HiveLogic {
    /**
     * @dev Core function to update a specific wall.
     * Use this in SovereignIdentity or Adapters.
     */
    function updateWall(
        IHiveMetadata.HiveWall storage wall,
        bytes32 _dataHash,
        bool _encrypted
    ) internal {
        wall.dataHash = _dataHash;
        wall.lastUpdated = block.timestamp;
        wall.updater = msg.sender;
        wall.encrypted = _encrypted;
    }

    /**
     * @dev Generates the "Sovereign Watermark" for identity verification.
     */
    function generateWatermark(address _account, bytes32 _userId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("TERRACARE_HIVE_v1", _account, _userId));
    }
}
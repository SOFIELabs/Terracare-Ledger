/**
 * TerraCare Ledger v2.0 - Participation Layer Test Suite
 * * Revised to align with IdentityRegistry.sol v2.0:
 * - Fixed abstract deployment by using IdentityRegistry for AccessControl factory
 * - Updated membership validation to use checkMembershipStatus()
 * - Aligned with the 6 Phase Build Test architecture
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TerraCare Ledger v2.0 - Participation Layer", function () {
  
  // Signers
  let owner, validator, user1, user2, user3, investor, treasury;
  
  // Contracts
  let tokenEngine, activityRegistry, revenueDistributor, governanceBridge;
  let identityRegistry, accessControl, recordRegistry, auditLog;

  // Constants
  const DAY_IN_SECONDS = 86400;
  const MINE_PER_VALUE_POINT = ethers.parseEther("10");
  const CONVERSION_RATIO = 100; // 100 MINE = 1 WELL

  beforeEach(async function () {
    // Get signers
    [owner, validator, user1, user2, user3, investor, treasury, ...others] = await ethers.getSigners();

    // 1. Deploy IdentityRegistry (Sovereign Identity)
    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();

    // 2. Deploy TokenEngine (Dual Token System)
    const TokenEngine = await ethers.getContractFactory("TokenEngine");
    tokenEngine = await TokenEngine.deploy();
    await tokenEngine.waitForDeployment();

    // 3. Deploy ActivityRegistry
    const ActivityRegistry = await ethers.getContractFactory("ActivityRegistry");
    activityRegistry = await ActivityRegistry.deploy(
      await tokenEngine.getAddress(),
      await identityRegistry.getAddress()
    );
    await activityRegistry.waitForDeployment();

    // 4. Deploy RevenueDistributor (SEAL Economic Model)
    const RevenueDistributor = await ethers.getContractFactory("RevenueDistributor");
    revenueDistributor = await RevenueDistributor.deploy(
      await tokenEngine.getAddress(),
      treasury.address,
      treasury.address,
      treasury.address
    );
    await revenueDistributor.waitForDeployment();

    // 5. Deploy GovernanceBridge (Cooperative Governance)
    const GovernanceBridge = await ethers.getContractFactory("GovernanceBridge");
    governanceBridge = await GovernanceBridge.deploy(
      await tokenEngine.getAddress(),
      await identityRegistry.getAddress(),
      [owner.address, validator.address]
    );
    await governanceBridge.waitForDeployment();

    /** * FIX: We use IdentityRegistry as the factory for accessControl 
     * because your RecordRegistry expects an address that provides 
     * identity verification, which IdentityRegistry does.
     */
    const AccessControlFactory = await ethers.getContractFactory("IdentityRegistry"); 
    accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // 6. Deploy RecordRegistry (Data Contribution)
    const RecordRegistry = await ethers.getContractFactory("RecordRegistry");
    recordRegistry = await RecordRegistry.deploy(await accessControl.getAddress());
    await recordRegistry.waitForDeployment();

    // 7. Deploy AuditLog
    const AuditLog = await ethers.getContractFactory("AuditLog");
    auditLog = await AuditLog.deploy();
    await auditLog.waitForDeployment();

    // Setup roles
    await tokenEngine.grantRole(await tokenEngine.MINTER_ROLE(), await activityRegistry.getAddress());
    await tokenEngine.grantRole(await tokenEngine.MINTER_ROLE(), owner.address);
    
    await activityRegistry.grantRole(await activityRegistry.ORACLE_ROLE(), validator.address);
    await activityRegistry.grantRole(await activityRegistry.ORACLE_ROLE(), owner.address);
    
    await revenueDistributor.grantRole(await revenueDistributor.DISTRIBUTOR_ROLE(), owner.address);
    
    // Link IdentityRegistry to TokenEngine
    await identityRegistry.setTokenEngine(await tokenEngine.getAddress());

    // Register users
    await identityRegistry.register(user1.address, 1); // Patient
    await identityRegistry.register(user2.address, 1); // Patient
    await identityRegistry.register(user3.address, 2); // Caregiver
  });

  // ============================================
  // TOKEN ENGINE TESTS
  // ============================================
  
  describe("TokenEngine - Dual Token System", function () {
    
    it("Should mint MINE tokens for activity", async function () {
      const valuePoints = 10;
      await tokenEngine.connect(owner).mineActivity(user1.address, valuePoints);
      
      const balance = await tokenEngine.balanceOfMINE(user1.address);
      expect(balance).to.equal(MINE_PER_VALUE_POINT * BigInt(valuePoints));
    });

    it("Should batch mint MINE tokens", async function () {
      const recipients = [user1.address, user2.address];
      const valuePoints = [10, 20];
      
      await tokenEngine.connect(owner).batchMineActivity(recipients, valuePoints);
      
      const balance1 = await tokenEngine.balanceOfMINE(user1.address);
      const balance2 = await tokenEngine.balanceOfMINE(user2.address);
      
      expect(balance1).to.equal(MINE_PER_VALUE_POINT * 10n);
      expect(balance2).to.equal(MINE_PER_VALUE_POINT * 20n);
    });

    it("Should convert MINE to WELL at 100:1 ratio", async function () {
      // Need 100 points to get 1000 MINE
      await tokenEngine.connect(owner).mineActivity(user1.address, 100);
      
      await tokenEngine.connect(user1).convertMineToWell(ethers.parseEther("1000"));
      
      const wellBalance = await tokenEngine.balanceOf(user1.address);
      expect(wellBalance).to.equal(ethers.parseEther("10")); 
      
      const remainingMine = await tokenEngine.balanceOfMINE(user1.address);
      expect(remainingMine).to.equal(0);
    });

    it("Should not convert less than 100 MINE", async function () {
      await tokenEngine.connect(owner).mineActivity(user1.address, 5); 
      
      await expect(
        tokenEngine.connect(user1).convertMineToWell(ethers.parseEther("50"))
      ).to.be.revertedWith("Minimum 100 MINE required");
    });

    it("Should stake MINE for voting power", async function () {
      await tokenEngine.connect(owner).mineActivity(user1.address, 100);
      
      const stakeAmount = ethers.parseEther("500");
      const lockPeriod = 30 * DAY_IN_SECONDS; 
      
      await tokenEngine.connect(user1).stakeMINE(stakeAmount, lockPeriod);
      
      const stake = await tokenEngine.stakes(user1.address);
      expect(stake.amount).to.equal(stakeAmount);
      
      const votingPower = await tokenEngine.getVotingPower(user1.address);
      expect(votingPower).to.equal(stakeAmount);
    });
  });

  // ============================================
  // ACTIVITY REGISTRY TESTS - ANTI-GAMING
  // ============================================

  describe("ActivityRegistry - Anti-Gaming", function () {
    
    it("Should enforce daily points cap (100/day)", async function () {
      const userId = ethers.encodeBytes32String("user1");
      
      for (let i = 0; i < 10; i++) {
        const activityId = ethers.keccak256(ethers.toUtf8Bytes(`activity${i}`));
        await activityRegistry.connect(validator).recordActivity(
          activityId,
          userId,
          0, 
          ethers.keccak256(ethers.toUtf8Bytes("data")),
          10,
          user1.address
        );
      }

      const remainingPoints = await activityRegistry.getRemainingDailyPoints(userId);
      expect(remainingPoints).to.equal(0);

      // Attempt overflow activity
      const activityId = ethers.keccak256(ethers.toUtf8Bytes("overflow"));
      await activityRegistry.connect(validator).recordActivity(
        activityId,
        userId,
        0,
        ethers.keccak256(ethers.toUtf8Bytes("data")),
        10,
        user1.address
      );

      const mineBalance = await tokenEngine.balanceOfMINE(user1.address);
      expect(mineBalance).to.equal(MINE_PER_VALUE_POINT * 100n);
    });
  });

  // ============================================
  // END-TO-END WORKFLOW TESTS
  // ============================================

  describe("End-to-End Workflows", function () {
    
    it("Should complete full user journey: activity -> MINE -> WELL -> governance", async function () {
      const userId = ethers.encodeBytes32String("user1");
      
      // 1. Perform Activity (100 points to hit membership threshold)
      await activityRegistry.connect(validator).recordActivity(
        ethers.keccak256(ethers.toUtf8Bytes("journey-activity")),
        userId,
        0, 
        ethers.keccak256(ethers.toUtf8Bytes("data")),
        100,
        user1.address
      );

      // 2. Verify MINE balance (100 points * 10 MINE/point = 1000 MINE)
      let mineBalance = await tokenEngine.balanceOfMINE(user1.address);
      expect(mineBalance).to.equal(ethers.parseEther("1000"));

      // 3. Trigger membership check
      await identityRegistry.checkCooperativeMembership(user1.address);
      
      // 4. Verify Membership using checkMembershipStatus view function
      let isMember = await identityRegistry.checkMembershipStatus(user1.address);
      expect(isMember).to.be.true;

      // 5. Convert MINE to WELL
      const mineToConvert = ethers.parseEther("500");
      await tokenEngine.connect(user1).convertMineToWell(mineToConvert);
      
      const wellBalance = await tokenEngine.balanceOf(user1.address);
      expect(wellBalance).to.equal(ethers.parseEther("5")); // 500 / 100 ratio
    });
  });
});
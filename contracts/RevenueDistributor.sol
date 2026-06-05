// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TokenEngine.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RevenueDistributor
 * @dev Terracare ecosystem revenue distribution — confirmed split 70/15/5/4/6
 *
 * ORIANA TRANSACTIONS / MARKETPLACE / LIVE STREAMING / GIFTS:
 *   70% — Creator          (direct to creator Pollen wallet)
 *   15% — Terracare Ledger (operations, governance, infrastructure)
 *    5% — Conservation Pool (100% deployed to four sub-categories)
 *    4% — Team Pool         (multisig, TBD allocation)
 *    6% — Architect Wallet  (sovereign founder, designated private address)
 *
 * CONSERVATION POOL INTERNAL ALLOCATION (governance-adjustable):
 *   40% — Species Protection Programs
 *   30% — Habitat Restoration
 *   20% — Community Education
 *   10% — Research and Monitoring
 *
 * AGENT SUBSCRIPTIONS:
 *   100% — Conservation Pool (entire subscription fee)
 */
contract RevenueDistributor is AccessControl, ReentrancyGuard {

    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant ADMIN_ROLE        = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNANCE_ROLE   = keccak256("GOVERNANCE_ROLE");

    TokenEngine public tokenEngine;

    // ── Revenue split (must sum to 100) ─────────────────────────────────────
    uint256 public constant PERCENTAGE_BASE       = 100;
    uint256 public creatorShare       = 70;
    uint256 public ledgerShare        = 15;
    uint256 public conservationShare  =  5;
    uint256 public teamPoolShare      =  4;
    uint256 public architectWalletShare =  6;

    // ── Conservation pool internal allocation (must sum to 100) ─────────────
    uint256 public conservationSpeciesProtection = 40;
    uint256 public conservationHabitatRestoration = 30;
    uint256 public conservationCommunityEducation = 20;
    uint256 public conservationResearchMonitoring = 10;

    // ── Wallet addresses ─────────────────────────────────────────────────────
    address public ledgerTreasury;       // Terracare Ledger operations wallet
    address public conservationPool;     // Conservation pool multisig
    address public teamPool;             // Team pool multisig (TBD allocation)
    address public ARCHITECT_WALLET;     // Sovereign founder — designated private address

    // Conservation sub-wallets (deployed from conservationPool by governance)
    address public speciesProtectionWallet;
    address public habitatRestorationWallet;
    address public communityEducationWallet;
    address public researchMonitoringWallet;

    // ── Revenue tracking ─────────────────────────────────────────────────────
    uint256 public totalRevenueReceived;
    uint256 public totalDistributedToCreators;
    uint256 public totalDistributedToLedger;
    uint256 public totalDistributedToConservation;
    uint256 public totalDistributedToTeamPool;
    uint256 public totalDistributedToArchitect;

    uint256 public totalSubscriptionConservation;  // 100% subscription fees

    // ── Events ───────────────────────────────────────────────────────────────
    event RevenueReceived(uint256 amount, string source, address indexed creator);
    event RevenueDistributed(
        address indexed creator,
        uint256 creatorAmount,
        uint256 ledgerAmount,
        uint256 conservationAmount,
        uint256 teamPoolAmount,
        uint256 architectAmount
    );
    event SubscriptionReceived(uint256 amount, address indexed subscriber);
    event ConservationDeployed(
        uint256 speciesProtection,
        uint256 habitatRestoration,
        uint256 communityEducation,
        uint256 researchMonitoring
    );
    event SplitUpdated(
        uint256 creator,
        uint256 ledger,
        uint256 conservation,
        uint256 teamPool,
        uint256 architectWallet
    );
    event ConservationAllocationUpdated(
        uint256 speciesProtection,
        uint256 habitatRestoration,
        uint256 communityEducation,
        uint256 researchMonitoring
    );
    event ArchitectWalletUpdated(address indexed newAddress);

    constructor(
        address _tokenEngine,
        address _ledgerTreasury,
        address _conservationPool,
        address _teamPool,
        address _architectWallet
    ) {
        require(_tokenEngine       != address(0), "Invalid TokenEngine");
        require(_ledgerTreasury    != address(0), "Invalid ledger treasury");
        require(_conservationPool  != address(0), "Invalid conservation pool");
        require(_teamPool          != address(0), "Invalid team pool");
        require(_architectWallet   != address(0), "Invalid architect wallet");

        tokenEngine      = TokenEngine(_tokenEngine);
        ledgerTreasury   = _ledgerTreasury;
        conservationPool = _conservationPool;
        teamPool         = _teamPool;
        ARCHITECT_WALLET = _architectWallet;

        // Default conservation sub-wallets point to pool until governance deploys
        speciesProtectionWallet  = _conservationPool;
        habitatRestorationWallet = _conservationPool;
        communityEducationWallet = _conservationPool;
        researchMonitoringWallet = _conservationPool;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE,         msg.sender);
        _grantRole(GOVERNANCE_ROLE,    msg.sender);
        _grantRole(DISTRIBUTOR_ROLE,   msg.sender);
    }

    // ── Core: distribute a transaction (Oriana / marketplace / gifts / streams)
    /**
     * @dev Distribute revenue for a completed transaction.
     * @param creator Address of the content creator (70% recipient).
     */
    function distribute(address creator) external payable onlyRole(DISTRIBUTOR_ROLE) nonReentrant {
        require(msg.value > 0,           "No revenue to distribute");
        require(creator != address(0),   "Invalid creator address");

        totalRevenueReceived += msg.value;

        uint256 creatorAmount       = (msg.value * creatorShare)        / PERCENTAGE_BASE;
        uint256 ledgerAmount        = (msg.value * ledgerShare)          / PERCENTAGE_BASE;
        uint256 conservationAmount  = (msg.value * conservationShare)    / PERCENTAGE_BASE;
        uint256 teamPoolAmount      = (msg.value * teamPoolShare)         / PERCENTAGE_BASE;
        // Architect gets the remainder to avoid rounding dust
        uint256 architectAmount     = msg.value
                                      - creatorAmount
                                      - ledgerAmount
                                      - conservationAmount
                                      - teamPoolAmount;

        _send(creator,          creatorAmount,       "Creator transfer failed");
        _send(ledgerTreasury,   ledgerAmount,        "Ledger transfer failed");
        _send(teamPool,         teamPoolAmount,       "Team pool transfer failed");
        _send(ARCHITECT_WALLET, architectAmount,     "Architect transfer failed");

        _deployConservation(conservationAmount);

        totalDistributedToCreators    += creatorAmount;
        totalDistributedToLedger      += ledgerAmount;
        totalDistributedToConservation += conservationAmount;
        totalDistributedToTeamPool    += teamPoolAmount;
        totalDistributedToArchitect   += architectAmount;

        emit RevenueReceived(msg.value, "transaction", creator);
        emit RevenueDistributed(creator, creatorAmount, ledgerAmount, conservationAmount, teamPoolAmount, architectAmount);
    }

    // ── Subscription revenue: 100% to conservation pool ─────────────────────
    /**
     * @dev Process an agent subscription payment — entire fee goes to conservation.
     * @param subscriber Address of the subscribing user (for event logging).
     */
    function distributeSubscription(address subscriber) external payable onlyRole(DISTRIBUTOR_ROLE) nonReentrant {
        require(msg.value > 0, "No subscription amount");

        _deployConservation(msg.value);
        totalSubscriptionConservation += msg.value;
        totalDistributedToConservation += msg.value;

        emit SubscriptionReceived(msg.value, subscriber);
    }

    // ── Internal: deploy conservation funds to four sub-categories ───────────
    function _deployConservation(uint256 amount) internal {
        if (amount == 0) return;

        uint256 speciesAmount   = (amount * conservationSpeciesProtection) / PERCENTAGE_BASE;
        uint256 habitatAmount   = (amount * conservationHabitatRestoration) / PERCENTAGE_BASE;
        uint256 educationAmount = (amount * conservationCommunityEducation) / PERCENTAGE_BASE;
        uint256 researchAmount  = amount - speciesAmount - habitatAmount - educationAmount;

        _send(speciesProtectionWallet,  speciesAmount,   "Species protection transfer failed");
        _send(habitatRestorationWallet, habitatAmount,   "Habitat restoration transfer failed");
        _send(communityEducationWallet, educationAmount, "Community education transfer failed");
        _send(researchMonitoringWallet, researchAmount,  "Research monitoring transfer failed");

        emit ConservationDeployed(speciesAmount, habitatAmount, educationAmount, researchAmount);
    }

    function _send(address to, uint256 amount, string memory errMsg) internal {
        if (amount == 0) return;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, errMsg);
    }

    // ── Governance: update split (must sum to 100) ───────────────────────────
    function setRevenueSplit(
        uint256 _creator,
        uint256 _ledger,
        uint256 _conservation,
        uint256 _teamPool,
        uint256 _architectWallet
    ) external onlyRole(GOVERNANCE_ROLE) {
        require(
            _creator + _ledger + _conservation + _teamPool + _architectWallet == 100,
            "Split must sum to 100"
        );
        creatorShare          = _creator;
        ledgerShare           = _ledger;
        conservationShare     = _conservation;
        teamPoolShare         = _teamPool;
        architectWalletShare  = _architectWallet;
        emit SplitUpdated(_creator, _ledger, _conservation, _teamPool, _architectWallet);
    }

    // ── Governance: update conservation allocation (must sum to 100) ─────────
    function setConservationAllocation(
        uint256 _speciesProtection,
        uint256 _habitatRestoration,
        uint256 _communityEducation,
        uint256 _researchMonitoring
    ) external onlyRole(GOVERNANCE_ROLE) {
        require(
            _speciesProtection + _habitatRestoration + _communityEducation + _researchMonitoring == 100,
            "Conservation allocation must sum to 100"
        );
        conservationSpeciesProtection  = _speciesProtection;
        conservationHabitatRestoration = _habitatRestoration;
        conservationCommunityEducation = _communityEducation;
        conservationResearchMonitoring = _researchMonitoring;
        emit ConservationAllocationUpdated(_speciesProtection, _habitatRestoration, _communityEducation, _researchMonitoring);
    }

    // ── Admin: update wallet addresses ───────────────────────────────────────
    function setLedgerTreasury(address _wallet) external onlyRole(ADMIN_ROLE) {
        require(_wallet != address(0), "Invalid address");
        ledgerTreasury = _wallet;
    }

    function setConservationPool(address _wallet) external onlyRole(ADMIN_ROLE) {
        require(_wallet != address(0), "Invalid address");
        conservationPool = _wallet;
    }

    function setTeamPool(address _wallet) external onlyRole(ADMIN_ROLE) {
        require(_wallet != address(0), "Invalid address");
        teamPool = _wallet;
    }

    function setArchitectWallet(address _wallet) external onlyRole(ADMIN_ROLE) {
        require(_wallet != address(0), "Invalid address");
        ARCHITECT_WALLET = _wallet;
        emit ArchitectWalletUpdated(_wallet);
    }

    function setConservationSubWallets(
        address _species,
        address _habitat,
        address _education,
        address _research
    ) external onlyRole(ADMIN_ROLE) {
        require(_species   != address(0), "Invalid species wallet");
        require(_habitat   != address(0), "Invalid habitat wallet");
        require(_education != address(0), "Invalid education wallet");
        require(_research  != address(0), "Invalid research wallet");
        speciesProtectionWallet  = _species;
        habitatRestorationWallet = _habitat;
        communityEducationWallet = _education;
        researchMonitoringWallet = _research;
    }

    // ── Views ────────────────────────────────────────────────────────────────
    function getSplitAmounts(uint256 grossAmount) external view returns (
        uint256 creator,
        uint256 ledger,
        uint256 conservation,
        uint256 teamPoolAmt,
        uint256 architectWallet
    ) {
        creator        = (grossAmount * creatorShare)         / PERCENTAGE_BASE;
        ledger         = (grossAmount * ledgerShare)           / PERCENTAGE_BASE;
        conservation   = (grossAmount * conservationShare)     / PERCENTAGE_BASE;
        teamPoolAmt    = (grossAmount * teamPoolShare)          / PERCENTAGE_BASE;
        architectWallet = grossAmount - creator - ledger - conservation - teamPoolAmt;
    }

    function getConservationBreakdown(uint256 conservationAmount) external view returns (
        uint256 species,
        uint256 habitat,
        uint256 education,
        uint256 research
    ) {
        species   = (conservationAmount * conservationSpeciesProtection)  / PERCENTAGE_BASE;
        habitat   = (conservationAmount * conservationHabitatRestoration) / PERCENTAGE_BASE;
        education = (conservationAmount * conservationCommunityEducation) / PERCENTAGE_BASE;
        research  = conservationAmount - species - habitat - education;
    }

    function getRevenueSummary() external view returns (
        uint256 totalReceived,
        uint256 toCreators,
        uint256 toLedger,
        uint256 toConservation,
        uint256 toTeamPool,
        uint256 toArchitect,
        uint256 fromSubscriptions
    ) {
        return (
            totalRevenueReceived,
            totalDistributedToCreators,
            totalDistributedToLedger,
            totalDistributedToConservation,
            totalDistributedToTeamPool,
            totalDistributedToArchitect,
            totalSubscriptionConservation
        );
    }

    // ── Emergency withdraw (admin only) ─────────────────────────────────────
    function emergencyWithdraw(address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid address");
        _send(to, amount, "Emergency withdraw failed");
    }

    receive() external payable {
        emit RevenueReceived(msg.value, "direct", address(0));
    }
}

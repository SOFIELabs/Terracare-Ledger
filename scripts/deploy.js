/**
 * Terracare Ledger - Sovereign Health Infrastructure Deployment
 * * Revised: Added BigInt serialization support for JSON.stringify
 * Pillar-7: Automated deployment - zero manual steps
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Helper to handle BigInt serialization (The Fix)
const bigIntReplacer = (key, value) => 
  typeof value === 'bigint' ? value.toString() : value;

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║    TERRACARE SOVEREIGN HEALTH INFRASTRUCTURE DEPLOYMENT    ║");
  console.log("║            Tokenless • Gasless • Hash-Only                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\nDeploying with:", await deployer.getAddress());
  console.log("Network:", hre.network.name);
  
  const networkInfo = await hre.ethers.provider.getNetwork();
  const chainId = networkInfo.chainId;
  console.log("Chain ID:", chainId);
  console.log("\n");

  const deployments = {
    network: hre.network.name,
    chainId: chainId,
    deployer: await deployer.getAddress(),
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  // ============ PHASE 1: Core Infrastructure ============
  console.log("📦 PHASE 1: Deploying Core Infrastructure...\n");

  console.log("Deploying SovereignIdentity...");
  const SovereignIdentity = await hre.ethers.getContractFactory("SovereignIdentity");
  const sovereignIdentity = await SovereignIdentity.deploy();
  await sovereignIdentity.waitForDeployment();
  const sovereignIdentityAddress = await sovereignIdentity.getAddress();
  deployments.contracts.SovereignIdentity = {
    address: sovereignIdentityAddress,
    name: "SovereignIdentity"
  };
  console.log("✓ SovereignIdentity:", sovereignIdentityAddress);

  console.log("Deploying AccessGovernor...");
  const AccessGovernor = await hre.ethers.getContractFactory("AccessGovernor");
  const accessGovernor = await AccessGovernor.deploy();
  await accessGovernor.waitForDeployment();
  const accessGovernorAddress = await accessGovernor.getAddress();
  deployments.contracts.AccessGovernor = {
    address: accessGovernorAddress,
    name: "AccessGovernor"
  };
  console.log("✓ AccessGovernor:", accessGovernorAddress);

  console.log("Deploying AuditTrail...");
  const AuditTrail = await hre.ethers.getContractFactory("AuditTrail");
  const auditTrail = await AuditTrail.deploy();
  await auditTrail.waitForDeployment();
  const auditTrailAddress = await auditTrail.getAddress();
  deployments.contracts.AuditTrail = {
    address: auditTrailAddress,
    name: "AuditTrail"
  };
  console.log("✓ AuditTrail:", auditTrailAddress);

  // ============ PHASE 2: System Adapters ============
  console.log("\n📦 PHASE 2: Deploying System Adapters...\n");

  const adapters = [
    { name: "TholosAdapter", system: "Tholos" },
    { name: "HarmonicAdapter", system: "Harmonic" },
    { name: "TerratoneAdapter", system: "Terratone" },
    { name: "SofieOSAdapter", system: "SofieOS" },
    { name: "LlamaAdapter", system: "LlamaBackend" },
    { name: "MapAdapter", system: "MapSystem" }
  ];

  const deployedAdapters = {};

  for (const adapter of adapters) {
    console.log(`Deploying ${adapter.name}...`);
    const Factory = await hre.ethers.getContractFactory(adapter.name);
    const instance = await Factory.deploy(
      sovereignIdentityAddress,
      accessGovernorAddress,
      auditTrailAddress
    );
    await instance.waitForDeployment();
    const addr = await instance.getAddress();
    
    deployments.contracts[adapter.name] = {
      address: addr,
      name: adapter.name,
      system: adapter.system
    };
    deployedAdapters[adapter.name] = addr;
    console.log(`✓ ${adapter.name}:`, addr);
  }

  // ============ PHASE 3: PoA Consensus ============
  console.log("\n📦 PHASE 3: Deploying PoA Consensus...\n");

  console.log("Deploying PoAConsensus...");
  const PoAConsensus = await hre.ethers.getContractFactory("PoAConsensus");
  const poaConsensus = await PoAConsensus.deploy(
    sovereignIdentityAddress,
    auditTrailAddress
  );
  await poaConsensus.waitForDeployment();
  const poaConsensusAddress = await poaConsensus.getAddress();
  deployments.contracts.PoAConsensus = {
    address: poaConsensusAddress,
    name: "PoAConsensus",
    system: "SandIronNode"
  };
  console.log("✓ PoAConsensus:", poaConsensusAddress);

  // ============ PHASE 4: Generate Configuration ============
  console.log("\n📦 PHASE 4: Generating Configuration Files...\n");

  const artifactsDir = path.join(__dirname, "..", "artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // Save deployment info with BigInt Fix
  const deploymentPath = path.join(artifactsDir, "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, bigIntReplacer, 2));
  console.log("✓ Deployment saved to:", deploymentPath);

  // Generate .env file
  const envContent = `
# Terracare Ledger Deployment Configuration
# Generated: ${deployments.timestamp}
# Network: ${deployments.network}
# Chain ID: ${chainId}

TERRACARE_SOVEREIGN_IDENTITY=${sovereignIdentityAddress}
TERRACARE_ACCESS_GOVERNOR=${accessGovernorAddress}
TERRACARE_AUDIT_TRAIL=${auditTrailAddress}

TERRACARE_THOLOS_ADAPTER=${deployedAdapters.TholosAdapter}
TERRACARE_HARMONIC_ADAPTER=${deployedAdapters.HarmonicAdapter}
TERRACARE_TERRATONE_ADAPTER=${deployedAdapters.TerratoneAdapter}
TERRACARE_SOFIEOS_ADAPTER=${deployedAdapters.SofieOSAdapter}
TERRACARE_LLAMA_ADAPTER=${deployedAdapters.LlamaAdapter}
TERRACARE_MAP_ADAPTER=${deployedAdapters.MapAdapter}
TERRACARE_POA_CONSENSUS=${poaConsensusAddress}

TERRACARE_CHAIN_ID=${chainId}
TERRACARE_RPC_URL=${hre.network.config.url || "http://localhost:8545"}
`;

  const envPath = path.join(artifactsDir, ".env.deployed");
  fs.writeFileSync(envPath, envContent.trim());
  console.log("✓ Environment file saved to:", envPath);

  // Generate ABIs package with BigInt Fix
  const abiPackage = {
    name: "terracare-contracts",
    version: "0.1.0-sovereign",
    contracts: {}
  };

  const contractNames = [
    "SovereignIdentity", "AccessGovernor", "AuditTrail",
    "TholosAdapter", "HarmonicAdapter", "TerratoneAdapter",
    "SofieOSAdapter", "LlamaAdapter", "MapAdapter", "PoAConsensus"
  ];

  for (const name of contractNames) {
    const artifact = await hre.artifacts.readArtifact(name);
    abiPackage.contracts[name] = {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      address: deployments.contracts[name]?.address
    };
  }

  const abiPath = path.join(artifactsDir, "abis.json");
  fs.writeFileSync(abiPath, JSON.stringify(abiPackage, bigIntReplacer, 2));
  console.log("✓ ABIs package saved to:", abiPath);

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                   DEPLOYMENT COMPLETE                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error);
  process.exitCode = 1;
});
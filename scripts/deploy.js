const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, validator2] = await ethers.getSigners();
  console.log("\n  Terracare-Ledger Contract Deployment");
  console.log(`  Deployer: ${deployer.address}\n`);

  const addresses = {};

  console.log("  [1/7] TokenEngine...");
  const TokenEngine = await ethers.getContractFactory("TokenEngine");
  const tokenEngine = await TokenEngine.deploy();
  await tokenEngine.waitForDeployment();
  addresses.TokenEngine = await tokenEngine.getAddress();
  console.log(`       ${addresses.TokenEngine}`);

  console.log("  [2/7] IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  addresses.IdentityRegistry = await identityRegistry.getAddress();
  console.log(`       ${addresses.IdentityRegistry}`);

  console.log("  [3/7] TerracareAccessControl...");
  const TerracareAccessControl = await ethers.getContractFactory("TerracareAccessControl");
  const accessControl = await TerracareAccessControl.deploy(addresses.IdentityRegistry);
  await accessControl.waitForDeployment();
  addresses.TerracareAccessControl = await accessControl.getAddress();
  console.log(`       ${addresses.TerracareAccessControl}`);

  console.log("  [4/7] ActivityRegistry...");
  const ActivityRegistry = await ethers.getContractFactory("ActivityRegistry");
  const activityRegistry = await ActivityRegistry.deploy(addresses.TokenEngine, addresses.IdentityRegistry);
  await activityRegistry.waitForDeployment();
  addresses.ActivityRegistry = await activityRegistry.getAddress();
  console.log(`       ${addresses.ActivityRegistry}`);

  console.log("  [5/7] GovernanceBridge...");
  const GovernanceBridge = await ethers.getContractFactory("GovernanceBridge");
  const governanceBridge = await GovernanceBridge.deploy(addresses.TokenEngine, addresses.IdentityRegistry, [deployer.address, validator2.address]);
  await governanceBridge.waitForDeployment();
  addresses.GovernanceBridge = await governanceBridge.getAddress();
  console.log(`       ${addresses.GovernanceBridge}`);

  console.log("  [6/7] RecordRegistry...");
  const RecordRegistry = await ethers.getContractFactory("RecordRegistry");
  const recordRegistry = await RecordRegistry.deploy(addresses.TerracareAccessControl);
  await recordRegistry.waitForDeployment();
  addresses.RecordRegistry = await recordRegistry.getAddress();
  console.log(`       ${addresses.RecordRegistry}`);

  console.log("  [7/7] RevenueDistributor...");
  const RevenueDistributor = await ethers.getContractFactory("RevenueDistributor");
  const revenueDistributor = await RevenueDistributor.deploy(addresses.TokenEngine, deployer.address, deployer.address, deployer.address);
  await revenueDistributor.waitForDeployment();
  addresses.RevenueDistributor = await revenueDistributor.getAddress();
  console.log(`       ${addresses.RevenueDistributor}`);

  const MINTER_ROLE = await tokenEngine.MINTER_ROLE();
  const ORACLE_ROLE = await tokenEngine.ORACLE_ROLE();
  await (await tokenEngine.grantRole(MINTER_ROLE, addresses.ActivityRegistry)).wait();
  await (await tokenEngine.grantRole(ORACLE_ROLE, addresses.ActivityRegistry)).wait();

  const network = await ethers.provider.getNetwork();
  const output = { network: network.name, chainId: network.chainId.toString(), deployer: deployer.address, deployedAt: new Date().toISOString(), addresses };
  fs.writeFileSync(path.join(__dirname, "..", "deployed_addresses.json"), JSON.stringify(output, null, 2));

  console.log("\n  DEPLOYMENT COMPLETE — addresses saved to deployed_addresses.json");
  for (const [name, addr] of Object.entries(addresses)) console.log(`  ${name.padEnd(28)}: ${addr}`);
  return output;
}

main().catch((e) => { console.error(e); process.exit(1); });

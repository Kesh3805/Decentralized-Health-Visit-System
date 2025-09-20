const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying VisitLogger contract...");

  // Get the ContractFactory and Signers here.
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the contract
  const VisitLogger = await ethers.getContractFactory("VisitLogger");
  const visitLogger = await VisitLogger.deploy();

  await visitLogger.deployed();

  console.log("VisitLogger deployed to:", visitLogger.address);
  console.log("Transaction hash:", visitLogger.deployTransaction.hash);

  // Save deployment info
  const deploymentInfo = {
    contractAddress: visitLogger.address,
    deployerAddress: deployer.address,
    network: hre.network.name,
    blockNumber: visitLogger.deployTransaction.blockNumber,
    transactionHash: visitLogger.deployTransaction.hash,
    timestamp: new Date().toISOString()
  };

  const fs = require('fs');
  const path = require('path');
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Save deployment info to file
  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Deployment info saved to deployments/", hre.network.name + ".json");

  // Verify contract on Polygonscan if on testnet/mainnet
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await visitLogger.deployTransaction.wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: visitLogger.address,
        constructorArguments: [],
      });
      console.log("Contract verified on Polygonscan");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  // Register some sample CHWs for testing
  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    console.log("Registering sample CHWs for testing...");
    
    const sampleCHWs = [
      {
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        name: "Dr. Sarah Johnson",
        license: "CHW001"
      },
      {
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        name: "Nurse Michael Chen",
        license: "CHW002"
      }
    ];

    for (const chw of sampleCHWs) {
      try {
        await visitLogger.registerCHW(chw.address, chw.name, chw.license);
        console.log(`Registered CHW: ${chw.name} (${chw.address})`);
      } catch (error) {
        console.log(`Failed to register CHW ${chw.name}:`, error.message);
      }
    }
  }

  console.log("Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

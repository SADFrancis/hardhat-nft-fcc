const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
const fs = require("fs");

module.exports = async function ({ getNamedAccounts, deployments }) {
    
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    const chainId = network.config.chainId;
    let ethUsdPriceFeedAddress;

    console.log(`Deploying to network: ${network.name}`);


    if (developmentChains.includes(network.name)) {
        const MockV3AggregatorContract = await deployments.get("MockV3Aggregator");
        const EthUsdAggregator = await ethers.getContractAt(
            MockV3AggregatorContract.abi,
            MockV3AggregatorContract.address
        );
        ethUsdPriceFeedAddress = EthUsdAggregator.address;
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeedAddress;
    }

    const lowSVG = await fs.readFileSync("./images/dynamicNFT/frown.svg", { encoding: "utf-8" });
    const highSVG = await fs.readFileSync("./images/dynamicNFT/happy.svg", { encoding: "utf-8" });

    args = [ethUsdPriceFeedAddress, lowSVG, highSVG];

    const dynamicSvgNft = await deploy("DynamicSvgNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    // verify
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifing...");
        await verify(dynamicSvgNft.address, args);
    }    
    console.log("Completed 03-deploy-dynamic-svg-nft script");
    console.log("------------------------------");

}

module.exports.tags = ["all", "dynamicsvg", "main", "03", "003"];
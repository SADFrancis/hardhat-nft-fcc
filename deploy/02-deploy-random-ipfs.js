const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata");

const imagesLocation = "./images/randomNft";

const metadataTemplate = {
    name: "",
    description: "",
    image: "", //image URI
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        }
    ]
}

const FUND_AMOUNT = ethers.utils.parseUnits("10.0", "ether"); /*"10.000 000 000 000 000 000"  18 decimal places */

module.exports = async function ({ getNamedAccounts, deployments }) {

    console.log("deploying random NFT contract");
    console.log(imagesLocation);

    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;


    // get IPFS hashes of images
    let tokenUris;

    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris();
    } else {
        tokenUris =
        [
            'ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo',
            'ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d',
            'ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm'
        ];
    }

    let vrfCoordinatorV2Address, subscriptionId; 
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2MockContract = await deployments.get("VRFCoordinatorV2Mock");
        const vrfCoordinatorV2Mock = await ethers.getContractAt(
            vrfCoordinatorV2MockContract.abi,
            vrfCoordinatorV2MockContract.address
            );
        vrfCoordinatorV2Address = vrfCoordinatorV2MockContract.address;
        const tx = await vrfCoordinatorV2Mock.createSubscription();
        const txReceipt = await tx.wait(1);
        subscriptionId = txReceipt.events[0].args.subId;
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
        console.log("Retrieved Mocks for Random NFT");
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2;
        subscriptionId = networkConfig[chainId].subscriptionId;
    }

    console.log("------------------------------");
    const args = [
        vrfCoordinatorV2Address,
        networkConfig[chainId]["gasLane"], /* same as networkConfig[chainId].gasLane */ /* also keyhash*/
        subscriptionId,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee,
    ];

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    console.log("------------------------------");

    // verify
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifing...");
        await verify(randomIpfsNft.address, args);
    }    
    console.log("------------------------------");

    console.log("Completed 02-deploy-random-ipfs script")


}

async function handleTokenUris() {
    tokenUris = [];
    // store image in IPFS
    // store metadata in IPFS

    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation);
    for (imageUploadResponseIndex in imageUploadResponses)
    {
        // create metadata
        // upload the metadata
        let tokenUriMetadata = { ...metadataTemplate }
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "");
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`;
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`;
        console.log(`Uploading ${tokenUriMetadata.name}...`);

        // store JSON 
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata);
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`);
    }
    console.log("Token URIs uploaded:");
    console.log(tokenUris);
    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main", "02", "002"];
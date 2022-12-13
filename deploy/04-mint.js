const { ethers, network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

module.exports = async function ({ getNamedAccounts }) {
    const { deployer } = await getNamedAccounts();
    const { deploy, log } = deployments;

    // Basic NFT


    const basicNft = await ethers.getContract("BasicNft", deployer);
    /* vvvvvvvv Because the getContract() function doesn't work vvvvvvvv*/
    //await deployments.fixture(["BasicNft"]);
    //const basicNftContract = await deployments.get("BasicNft");
    //basicNft = await ethers.getContractAt(basicNftContract.abi, basicNftContract.address);
    /* ^^^^^^ Because the getContract() function doesn't work  ^^^^^^^^^^ */

    const basicMintTx = await basicNft.mintNft();
    await basicMintTx.wait(1);
    //const basicMintTokenCount = await basicNft.getTokenCounter().toString();
    console.log(`Basic NFT has tokenURI: ${await basicNft.tokenURI(0)}`);

    // Dynamic SVG NFT
    const highValue = ethers.utils.parseEther("4000")
    const dynamicSvgNft = await ethers.getContract("DynamicSvgNft", deployer)
    const dynamicSvgNftMintTx = await dynamicSvgNft.mintNft(highValue, {gasLimit: 2 * 10 ** 6})
    await dynamicSvgNftMintTx.wait(1)
    console.log(
        `Dynamic SVG NFT index 0 tokenURI: ${await dynamicSvgNft.tokenURI(0)}`
    )
    
    // Random IPS NFT    
    const randomIpfsNft = await ethers.getContract("RandomIpfsNft", deployer);
    const mintFee = await randomIpfsNft.getMintFee();
    await new Promise(async (resolve, reject) => { 
        setTimeout(resolve, 300000) // 5 Minutes
        randomIpfsNft.once("NftMinted", async function () {
            resolve();
        });
            
        const randomIpfsNftMintTx = await randomIpfsNft.requestNft({value: mintFee.toString(), gasLimit: 2 * 10 ** 6});
        const randomIpfsNftMintTxReceipt = await randomIpfsNftMintTx.wait(1); // get requestId 
        if (developmentChains.includes(network.name)) {
            const requestId = randomIpfsNftMintTxReceipt.events[1].args.requestId.toString();
            const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomIpfsNft.address);
        }
    })
    //const randomIpfsNftTokenCounter = await randomIpfsNft.getTokenCounter().toString();
    console.log(`Random IPFS NFT tokenURI: ${await randomIpfsNft.tokenURI(0)}`);

}

module.exports.tags = ["all", "mint"];
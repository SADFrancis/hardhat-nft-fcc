const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

const NAME = "Dogie";
const SYMBOL = "DOG";
const TOKEN_URI = "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json";

!developmentChains.includes(network.name) // if we're not on development chain
    ? describe.skip // SKIP
    : describe("BasicNft Unit Tests", async function () {
    
        // time to do some tests on a local blockchain
        console.log(`Testing on: ${network.name}`);
        const chainId = network.config.chainId;

        let basicNft, deployer;

        // Before we test, let's grab the contract
        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer;
            await deployments.fixture(["BasicNft"]);
            const basicNftContract = await deployments.get("BasicNft");
            basicNft = await ethers.getContractAt(basicNftContract.abi, basicNftContract.address);
            //basicNft = await ethers.getContract("BasicNft", deployer); // doesn't work with module versions
        });

        describe("constructor", async function () {
            it("00 Initializes the Basic NFT contract correctly", async function () {
                const tokenCounter = await basicNft.getTokenCounter();
                assert.equal(tokenCounter.toString(), "0");
            });
        }); // 00 conclude constructor test

        describe("tokenURI", function () {
            it("01 Can retrieve name, symbol and tokenURI as hardcoded in", async function () {
                const name = await basicNft.name();
                const symbol = await basicNft.symbol();
                const tokenURI = await basicNft.tokenURI(0);
                assert.equal(name.toString(), NAME);
                assert.equal(symbol.toString(), SYMBOL);
                assert.equal(tokenURI.toString(), TOKEN_URI);
            });
        }); // 01 conclude return tokenURI test

        describe("mintNft", function () {
            it("02 Can mint an NFT and update the token counter", async function () {
                const returnNftCount = await basicNft.mintNft();
                const tokenCounter = await basicNft.getTokenCounter();
                assert.equal(tokenCounter.toString(), "1");
            });
        }); // 02 conclude mintNft function test
    });
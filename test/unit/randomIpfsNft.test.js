const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

TOKEN_URIS =
[
    'ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo',
    'ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d',
    'ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm'
];

!developmentChains.includes(network.name) // if we're not on development chain
    ? describe.skip // SKIP
    : describe("Random IPFS NFT Unit Tests", async function () {
    
        // time to do some tests on a local blockchain
        console.log(`Testing on: ${network.name}`);
        const chainId = network.config.chainId;
    
        let RandomIpfsNft, deployer;

        // Before we test, let's grab the contract
        beforeEach(async function () {

            //  Grab contract
            deployer = (await getNamedAccounts()).deployer;
            await deployments.fixture(["mocks", "randomipfs"]); // deploys the contracts per tags
            const vrfCoordinatorV2MockContract = await deployments.get("VRFCoordinatorV2Mock"); // gets the contracts
            vrfCoordinatorV2Mock = await ethers.getContractAt(vrfCoordinatorV2MockContract.abi, vrfCoordinatorV2MockContract.address);
            const RandomIpfsNftContract = await deployments.get("RandomIpfsNft");
            RandomIpfsNft = await ethers.getContractAt(RandomIpfsNftContract.abi, RandomIpfsNftContract.address);
            //await vrfCoordinatorV2Mock.addConsumer(networkConfig[chainId].subscriptionId, RandomIpfsNft.address);
        });

        describe("constructor", async function () {
            it("00 Initializes the Random IPFS NFT contract correctly", async function () {
                const tokenCounter = await RandomIpfsNft.getTokenCounter();
                const tokenUri_0 = await RandomIpfsNft.getDogTokenUris(0);
                assert.equal(tokenCounter.toString(), "0");
                assert.equal(tokenUri_0.toString(),TOKEN_URIS[0])
            });
        }); // 00 conclude constructor test


        describe("requestNFT", async function () {
            it("01 It emits an event signaling it kicked off the random request correctly", async function () {
                const mintFee = await RandomIpfsNft.getMintFee();
                await expect(RandomIpfsNft.requestNft({ value: mintFee.toString() })).to.emit(
                    RandomIpfsNft,
                    "NftRequested"
                );
            });

        });

        describe("fulfillRandomWords", async function () {
            it("02 It emits the event NftMinted and mints the NFT when requested", async function () {
                await new Promise(async (resolve, reject) => {
                    RandomIpfsNft.once("NftMinted", async () => {
                        try {
                            const tokenUri_0 = await RandomIpfsNft.getDogTokenUris(0);
                            const tokenCounter = await RandomIpfsNft.getTokenCounter();
                            assert.equal(tokenUri_0.toString().includes("ipfs://"), true);
                            assert.equal(tokenCounter.toString(), "1");
                            resolve();
                        } catch (error) {
                            console.log(error);
                            reject(error);
                        }
                    }); // This takes place once event has been emitted
                    
                    try { // Before the event...
                        const mintFee = await RandomIpfsNft.getMintFee();
                        const mintNftResponse = await RandomIpfsNft.requestNft({ value: mintFee.toString() });
                        const mintNftReceipt = await mintNftResponse.wait(1);
                        console.log("received receipt of NFt mint request");
                        await vrfCoordinatorV2Mock.fulfillRandomWords(
                            mintNftReceipt.events[1].args.requestId,
                            RandomIpfsNft.address
                        );
                    } catch (error) {
                        console.log(error);
                        reject(error);
                    }
                });
            });
        }); // conclude Describe Fulfill RandomWords test

        //0 - 99
        // Ex: 7 - PUG
        // Ex: 88 -> St. Bernard
        // Ex: 45 -> St. Bernard
        // Ex: 12 -> Shiba Inu
        // 10% of Pug, 30% of Shiba Inu, 60% chance of St. Bernard        
        describe("getBreedFromModdedRng", async function () {
            it("03 It returns the breed Pug when passing in 7", async function () {
                const ExpectedValue = await RandomIpfsNft.getBreedFromModdedRng(7);
                assert.equal(0, ExpectedValue); // Enum Breed Pug = 0;
            });
            it("04 It returns the breed Shiba Inu when passing in 32", async function () {
                const ExpectedValue = await RandomIpfsNft.getBreedFromModdedRng(32);
                assert.equal(1, ExpectedValue); // Enum Breed Shiba Inu = 1;
            });
            it("05 It returns the breed St. Bernard when passing in 75", async function () {
                const ExpectedValue = await RandomIpfsNft.getBreedFromModdedRng(75);
                assert.equal(2, ExpectedValue); // Enum Breed St. Bernard = 2;
            });

        }); // conclude getBreedFromMiddedRng tests



    }) // conclude Random IPFS NFT unit tests
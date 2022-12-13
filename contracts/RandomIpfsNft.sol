// SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';
import '@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/ConfirmedOwner.sol';


pragma solidity ^0.8.7;

error RandomIpfsNft__RangeOutOfBounds();
error RandomIpfsNft__NotEnoughETHToCoverMintFee();
error RandomIpfsNft__ContractBalanceTransferFailed();


contract RandomIpfsNft is ERC721URIStorage, VRFConsumerBaseV2, Ownable {

    // Type Declaration
    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNARD
    }


    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyhash; //gas Lane
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    
    // VRF helpers
    mapping(uint256 => address) public s_requestIdToSender;

    // NFT variables
    uint256 private s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_dogTokenUris;
    uint256 internal i_mintFee;

    // Events
    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Breed dogBreed, address minter);

    constructor(
        address vrfCoodrindatorV2, 
        bytes32 keyhash, /* gasLane */ 
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        string[3] memory dogTokenUris,
        uint256 mintFee
        ) 
        VRFConsumerBaseV2(vrfCoodrindatorV2)
        ERC721("Random IPFS NFT", "RIN") 
        {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoodrindatorV2);
        i_keyhash = keyhash;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_mintFee = mintFee; 
        s_dogTokenUris = dogTokenUris;
        s_tokenCounter = 0;
    }

    function requestNft() public payable returns(uint256 requestId){
        if(msg.value < i_mintFee){
            revert RandomIpfsNft__NotEnoughETHToCoverMintFee();}
        requestId = i_vrfCoordinator.requestRandomWords(
            i_keyhash, /* Or gasLane once again */
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        s_requestIdToSender[requestId] = msg.sender;
        emit NftRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address dogOwner = s_requestIdToSender[requestId];
        uint256 newTokenId = s_tokenCounter;
        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;
        //0 - 99
        // 7 - PUG
        // 88 -> St. Bernard
        // 45 -> St. Bernard
        // 12 -> Shiba Inu
        // 10% of Pug, 30% of Shiba Inu, 60% chance of St. Bernard

        Breed dogBreed = getBreedFromModdedRng(moddedRng);
        _safeMint(dogOwner, newTokenId);
        _setTokenURI(newTokenId,s_dogTokenUris[uint256(dogBreed)]);
        s_tokenCounter += 1;
        emit NftMinted(dogBreed, dogOwner);
        }

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success,) = payable(msg.sender).call{value: amount}("");
        if(!success){revert RandomIpfsNft__ContractBalanceTransferFailed();}
    }

    function getBreedFromModdedRng(uint256 moddedRng) public pure returns(Breed){
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();
        for(uint256 i=0; i<chanceArray.length; i++){
            if(moddedRng >= cumulativeSum && moddedRng < cumulativeSum + chanceArray[i]){
                return Breed(i);
            }
            cumulativeSum += chanceArray[i];
        } 
        revert RandomIpfsNft__RangeOutOfBounds();
    }

    function getChanceArray() public pure returns(uint256[3] memory) {
        return [10,30, MAX_CHANCE_VALUE];
    }

    function getTokenCounter() public view returns (uint256){
        return s_tokenCounter;
    }

    function getMintFee() public view returns(uint256){
        return i_mintFee;
    }

    function getDogTokenUris(uint256 index) public view returns (string memory) {
        return s_dogTokenUris[index];
    }
}
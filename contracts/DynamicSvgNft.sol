// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "base64-sol/base64.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";


contract DynamicSvgNft is ERC721{
    // mint
    // store our SVG information somewhere
    // Some logic to say "Show X Logic" or "Show Y image"

    uint256 private s_tokenCounter;
    string private i_lowImageUri;
    string private i_highImageUri;
    string private constant base64EncodedSvgPrefix= "data:image/svg+xml;base64,";
    AggregatorV3Interface internal immutable i_priceFeed;
    mapping(uint256 => int256) public s_tokenIdToHighValue;

    event CreatedNFT(uint256 indexed tokenId, int256 highValue);

    constructor(address priceFeedAddress, string memory lowSvg, string memory highSvg) ERC721("Dynamic SVG NFT", "DSN"){
        s_tokenCounter = 0;
        i_lowImageUri = svgToImageURI(lowSvg);
        i_highImageUri = svgToImageURI(highSvg);
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    function svgToImageURI(string memory svg) public pure returns (string memory){
        string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(svg))));
        return string(abi.encodePacked(base64EncodedSvgPrefix,svgBase64Encoded));

    }

    function mintNft(int256 highValue) public {
        s_tokenIdToHighValue[s_tokenCounter]= highValue;
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter +=1; // best practice to increment before minting or emitting? Tests say before emission, after minting
        emit CreatedNFT(s_tokenCounter,highValue);
    }


    function _baseURI() internal pure override returns(string memory){
        return "data:application/json;base64,";
    }

    // the plan is to encode the svg as a compressed string, then place it in the JSON 
    // then encode the JSON to be the string for the token URI
    // _exists 
    function tokenURI(uint256 tokenId) public view virtual override returns(string memory) {
        require(_exists(tokenId), "URI Query for nonexistent token");        
        
        //(/*uint80 roundId*/, uint256 price, /*uint256 startAt*/, /*uint256 updatedAt*/, /*uint80 answeredInRound*/  )
        (,int256 price,,,) = i_priceFeed.latestRoundData();
        string memory imageURI = i_lowImageUri;
        if (price >= s_tokenIdToHighValue[tokenId]){
            imageURI = i_highImageUri;
        }
        // data:image/svg+xml;base64, ---> prefix for images
        // data:application/json;base64, ----> prefix for json
        // base64 encode for SVG
         
        //returns a string of a concatenated JSON prefix and encoded JSON data from string to bytes to base64 
        // This will produce a string that can be depacked by browser to restore original data
        return string(        
            abi.encodePacked(
                _baseURI(),
                Base64.encode(
                    bytes(
                            abi.encodePacked(
                                '{"name":"',
                                name(), // You can add whatever name here
                                '", "description":"An NFT that changes based on the Chainlink Feed", ',
                                '"attributes": [{"trait_type": "coolness", "value": 100}], "image":"',
                                imageURI,
                                '"}'
                        )
                    )
                )
            )
        ); 
    }


    function getTokenCounter() public view returns (uint256){
        return s_tokenCounter;
    }
    function getLowImageUri() public view returns (string memory){
        return i_lowImageUri;
    }
    function getHighImageUri() public view returns (string memory){
        return i_highImageUri;
    }    

}
// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";

/**
 * @title SpacePanda contract
 * @dev Extends ERC721 Non-Fungible Token Standard basic implementation
 */
contract SpacePanda is ERC721, Ownable, AccessControl {
    using SafeMath for uint256;

    uint256 public constant MAX_SPECIAL_NFT_ROUND = 3;
    uint256 public constant SPECIAL_NFT_PRICE = 50 * (10 ** 18);
    enum MintType { AIRDROP, COMMON, SPECIAL, AUCTION, CUSTOM }

    // airdrop
    uint256 public constant MAX_AIRDROP_NFT_SUPPLY = 500;

    // common edition
    uint256 public constant MAX_COMMON_NFT_SUPPLY = 46120;

    // special edition
    uint256 public constant MAX_SPECIAL_NFT_SUPPLY = 366 * MAX_SPECIAL_NFT_ROUND;

    // the number of space pandas on this planet. airdrop + common edition + special edition
    uint256 public constant MAX_TOTAL_NFT_SUPPLY = 47718;

    // minter role for auction contract, game contract
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // governance role for space panda, this role will be from community
    bytes32 public constant GOVERN_ROLE = keccak256("GOVERN_ROLE");

    bool public commonNftStart = false;
    bool public specialNftStart = false;

    // total three rounds for special edition auction
    uint256 public currentSpecialNftRound = 1;
    uint256 public nftIndex = 0;
    uint256 public airDropNftCount = 0;
    uint256 public commonNftCount = 0;
    uint256 public specialNftCount = 0;
    // in order to accept space pandas from other planets, the total capacity should be governed.
    uint256 public maxCapacity = MAX_TOTAL_NFT_SUPPLY;

    event SpacePandaMinted(address dest, uint256 fromIndex, uint256 amount, MintType mintType);

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     */
    constructor (string memory name, string memory symbol) ERC721(name, symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(GOVERN_ROLE, _msgSender());
    }

    /**
     * @dev Gets current common NFT price
     */
    function getCommonNftPrice() public view returns (uint256) {
        uint currentSupply = commonNftCount;
        if (currentSupply < 30000) {
            return 8 * (10 ** 16);  //  0 - 29999 0.08 BNB, total 30000
        } else if (currentSupply < 42000) {
            return 12 * (10 ** 16);  //  30000 - 41999 0.12 BNB, total 12000
        } else if (currentSupply < 45000) {
            return 25 * (10 ** 16);  // 42000 - 44999 0.25 BNB, total 3000
        } else if (currentSupply < 45800) {
            return 6 * (10 ** 17);  //  45000 - 45799 0.6 BNB, total 800
        } else if (currentSupply < 46050) {
            return 18 * (10 ** 17);  // 45800 - 46049 1.8 BNB, total 250
        } else if (currentSupply < 46110) {
            return 8 * (10 ** 18);  //  46050 - 46109 8 BNB
        } else {
            return 50 * (10 ** 18);  // 46109 - 46120 50 BNB
        }
    }

    function startBlindBox(bool isSpecial) public onlyOwner {
        if (isSpecial) {
            specialNftStart = true;
        } else {
            commonNftStart = true;
        }
    }

    function setCapacity(uint256 capacity) public {
        require(hasRole(GOVERN_ROLE, msg.sender), "Invalid caller");
        require(capacity > MAX_TOTAL_NFT_SUPPLY, "Invalid capacity");
        maxCapacity = capacity;
    }

    function setTokenURI(uint256 tokenId, string memory _tokenURI) public {
        require(hasRole(MINTER_ROLE, msg.sender), "Invalid caller");
        require(bytes(tokenURI(tokenId)).length == 0, "Reset token uri");
        _setTokenURI(tokenId, _tokenURI);
    }

    function startNextSpecialNft() public onlyOwner {
        require(currentSpecialNftRound < MAX_SPECIAL_NFT_ROUND, "Special nft ended");
        currentSpecialNftRound += 1;
    }

    function _mintNft(address to, uint256 count, MintType mintType) internal {
        uint fromPosition = nftIndex;
        for (uint i = 0; i < count; i++) {
            _safeMint(to, nftIndex);
            nftIndex += 1;
        }
        emit SpacePandaMinted(to, fromPosition, count, mintType);
    }

    /**
    * @dev Airdrop Pandas
    */
    function mintAirDropNft(address to) public onlyOwner {
        require(airDropNftCount < MAX_AIRDROP_NFT_SUPPLY, "Airdrop ended");

        _mintNft(to, 1, MintType.AIRDROP);
        airDropNftCount += 1;
    }

    /**
    * @dev Mint Auction Pandas
    */
    function mintAuctionNft(address to) public {
        require(specialNftCount < MAX_SPECIAL_NFT_SUPPLY, "Exceeds max supply");
        require(hasRole(MINTER_ROLE, msg.sender), "Invalid caller");

        _mintNft(to, 1, MintType.AUCTION);
        specialNftCount += 1;
    }

    /**
    * @dev Mint custom Pandas, should be used with burn
    */
    function mintCustomNft(address to) external {
        require(totalSupply() < maxCapacity, "Exceeds max supply");
        require(hasRole(MINTER_ROLE, msg.sender), "Invalid Caller");

        _mintNft(to, 1, MintType.CUSTOM);
    }

    /**
    * @dev Mints Special Pandas
    */
    function mintSpecialNft(uint256 numberOfBoxes) public payable {
        require(specialNftStart, "Not started");
        require(numberOfBoxes > 0 && numberOfBoxes <= 10 && SPECIAL_NFT_PRICE.mul(numberOfBoxes) == msg.value, "Invalid size or price");
        require(specialNftCount.add(numberOfBoxes) <= 366 * (currentSpecialNftRound - 1) + 240, "Exceeds max supply");

        _mintNft(msg.sender, numberOfBoxes, MintType.SPECIAL);
        specialNftCount += numberOfBoxes;
    }

    /**
    * @dev Mints Common Pandas
    */
    function mintCommonNft(uint256 numberOfBoxes) public payable {
        require(commonNftStart, "Not started");
        require(numberOfBoxes > 0 && numberOfBoxes <= 50, "Invalid size");
        require(commonNftCount.add(numberOfBoxes) <= MAX_COMMON_NFT_SUPPLY, "Exceeds max supply");
        require(getCommonNftPrice().mul(numberOfBoxes) == msg.value, "Invalid price");

        _mintNft(msg.sender, numberOfBoxes, MintType.COMMON);
        commonNftCount += numberOfBoxes;
    }

    function burn(uint256 tokenId) external {
        require(_isApprovedOrOwner(msg.sender, tokenId) && hasRole(MINTER_ROLE, msg.sender), "Invalid caller");
        _burn(tokenId);
    }

    /**
     * @dev Withdraw ether from this contract (Callable by owner)
    */
    function withdraw() onlyOwner public {
        uint balance = address(this).balance;
        msg.sender.transfer(balance);
    }
}

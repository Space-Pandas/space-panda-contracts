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

    uint256 public constant NAME_CHANGE_PRICE = 100 * (10 ** 9);
    uint256 public constant MAX_SPECIAL_NFT_ROUND = 3;
    uint256 public constant SPECIAL_NFT_PRICE = 50 * (10 ** 18);

    // index [0, 200) for airdrop
    uint256 public constant MAX_AIRDROP_NFT_SUPPLY = 200;

    // index [200, 46520) for common edition
    uint256 public constant MAX_COMMON_NFT_SUPPLY = 46120;

    // index [46520, 47618) for special edition
    uint256 public constant MAX_SPECIAL_NFT_SUPPLY = 366 * MAX_SPECIAL_NFT_ROUND;

    // index [47618, 50000) reserved for cross chain transfer from other planet
    uint256 public constant MAX_TOTAL_NFT_SUPPLY = 50000;

    // minter role for auction contract, game contract
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    bool private _commonNftStart = false;
    bool private _specialNftStart = false;

    // total three rounds for special edition auction
    uint256 private _currentSpecialNftRound = 1;
    uint256 private _nftIndex = 0;
    uint256 private _airDropNftCount = 0;
    uint256 private _commonNftCount = 0;
    uint256 private _specialNftCount = 0;

    // Mapping from token ID to name
    mapping (uint256 => string) private _tokenName;

    // Mapping if certain name string has already been reserved
    mapping (string => bool) private _nameReserved;

    // Space Panda token address, should only be set once
    address private _sptAddress;

    // Events
    event NameChange (uint256 indexed tokenId, string newName);

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     */
    constructor (string memory name, string memory symbol) ERC721(name, symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        _setBaseURI("ipfs://");
    }

    function setSptAddress(address sptAddress) public onlyOwner {
        require(sptAddress != address(0) && _sptAddress == address(0), "SPT invalid or already set");
        _sptAddress = sptAddress;
    }

    /**
     * @dev Returns name of the NFT at index.
     */
    function tokenNameByIndex(uint256 index) public view returns (string memory) {
        return _tokenName[index];
    }

    /**
     * @dev Returns if the name has been reserved.
     */
    function isNameReserved(string memory nameString) public view returns (bool) {
        return _nameReserved[toLower(nameString)];
    }

    /**
     * @dev Gets current common NFT price
     */
    function getCommonNftPrice() public view returns (uint256) {
        uint currentSupply = _commonNftCount;
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

    function validateCommonNftBatch(uint256 amount) public view returns (bool) {
        if (amount == 1) {
            return true;
        }
        uint fromPosition = _commonNftCount;
        uint toPosition = fromPosition.add(amount);
        if (fromPosition < 30000 && toPosition < 30000) {
            return true;
        } else if (fromPosition < 42000 && toPosition < 42000) {
            return true;
        } else if (fromPosition < 45000 && toPosition < 45000) {
            return true;
        } else if (fromPosition < 45800 && toPosition < 45800) {
            return true;
        } else if (fromPosition < 46050 && toPosition < 46050) {
            return true;
        } else if (fromPosition < 46110 && toPosition < 46110) {
            return true;
        }
        // last 10 boxes not allowed for batch mint
        return false;
    }

    function startBlinkBox(bool isSpecial) public onlyOwner {
        if (isSpecial) {
            _specialNftStart = true;
        } else {
            _commonNftStart = true;
        }
    }

    function startNextSpecialNft() public onlyOwner {
        require(_currentSpecialNftRound < MAX_SPECIAL_NFT_ROUND, "Special nft ended");
        _currentSpecialNftRound += 1;
    }

    function _mintNft(address to, uint256 count) internal {
        for (uint i = 0; i < count; i++) {
            _safeMint(to, _nftIndex);
            _nftIndex += 1;
        }
    }

    /**
    * @dev Airdrop Pandas
    */
    function mintAirDropNft(address to) public onlyOwner {
        require(_airDropNftCount < MAX_AIRDROP_NFT_SUPPLY, "Airdrop ended");

        _mintNft(to, 1);
        _airDropNftCount += 1;
    }

    /**
    * @dev Mint Auction Pandas
    */
    function mintAuctionNft(address to) public {
        require(_specialNftCount < MAX_SPECIAL_NFT_SUPPLY, "Exceeds max supply");
        require(hasRole(MINTER_ROLE, msg.sender), "Invalid caller");

        _mintNft(to, 1);
        _specialNftCount += 1;
    }

    /**
    * @dev Mint custom Pandas, should be used with burn
    */
    function mintCustomNft(address to) public {
        require(totalSupply() < MAX_TOTAL_NFT_SUPPLY, "Exceeds max supply");
        require(hasRole(MINTER_ROLE, msg.sender), "Invalid Caller");

        _mintNft(to, 1);
    }

    /**
    * @dev Mints Special Pandas
    */
    function mintSpecialNft(uint256 numberOfBoxes) public payable {
        require(_specialNftStart, "Not started");
        require(numberOfBoxes > 0 && numberOfBoxes <= 10, "Invalid size");
        require(_specialNftCount.add(numberOfBoxes) <= 366 * (_currentSpecialNftRound - 1) + 240, "Exceeds max supply");
        require(SPECIAL_NFT_PRICE.mul(numberOfBoxes) == msg.value, "Invalid price");

        _mintNft(msg.sender, numberOfBoxes);
        _specialNftCount += numberOfBoxes;
    }

    /**
    * @dev Mints Common Pandas
    */
    function mintCommonNft(uint256 numberOfBoxes) public payable {
        require(_commonNftStart, "Not started");
        require(numberOfBoxes > 0 && numberOfBoxes <= 50, "Invalid size");
        require(_commonNftCount.add(numberOfBoxes) <= MAX_COMMON_NFT_SUPPLY, "Exceeds max supply");
        require(validateCommonNftBatch(numberOfBoxes), "Invalid batch");
        require(getCommonNftPrice().mul(numberOfBoxes) == msg.value, "Invalid price");

        _mintNft(msg.sender, numberOfBoxes);
        _commonNftCount += numberOfBoxes;
    }

    function burn(uint256 tokenId) public {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Invalid caller");
        _burn(tokenId);
    }

    /**
     * @dev Changes the name for SpacePanda tokenId
     */
    function changeName(uint256 tokenId, string memory newName) public {
        address owner = ownerOf(tokenId);

        require(_msgSender() == owner, "Invalid caller");
        require(validateName(newName) == true, "Invalid name");
        require(isNameReserved(newName) == false, "Name already reserved");

        ERC20Burnable(_sptAddress).transferFrom(msg.sender, address(this), NAME_CHANGE_PRICE);
        // If already named, de-reserve old name
        if (bytes(_tokenName[tokenId]).length > 0) {
            toggleReserveName(_tokenName[tokenId], false);
        }
        toggleReserveName(newName, true);
        _tokenName[tokenId] = newName;
        ERC20Burnable(_sptAddress).burn(NAME_CHANGE_PRICE);
        emit NameChange(tokenId, newName);
    }

    /**
     * @dev Withdraw ether from this contract (Callable by owner)
    */
    function withdraw() onlyOwner public {
        uint balance = address(this).balance;
        msg.sender.transfer(balance);
    }

    /**
     * @dev Reserves the name if isReserve is set to true, de-reserves if set to false
     */
    function toggleReserveName(string memory str, bool isReserve) internal {
        _nameReserved[toLower(str)] = isReserve;
    }

    /**
     * @dev Check if the name string is valid (Alphanumeric and spaces without leading or trailing space)
     */
    function validateName(string memory str) public pure returns (bool){
        bytes memory b = bytes(str);
        // Cannot be longer than 25 characters, no Leading and Trailing space
        if(b.length < 1 || b.length > 25 || b[0] == 0x20 || b[b.length - 1] == 0x20) return false;

        bytes1 lastChar = b[0];
        for(uint i; i<b.length; i++){
            bytes1 char = b[i];

            if (char == 0x20 && lastChar == 0x20) return false; // Cannot contain continuous spaces

            if(!(char >= 0x30 && char <= 0x39) && //9-0
              !(char >= 0x41 && char <= 0x5A) && //A-Z
              !(char >= 0x61 && char <= 0x7A) && //a-z
              !(char == 0x20) //space
            )
                return false;

            lastChar = char;
        }

        return true;
    }

    /**
     * @dev Converts the string to lowercase
     */
    function toLower(string memory str) public pure returns (string memory){
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint i = 0; i < bStr.length; i++) {
            // Uppercase character
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }
}

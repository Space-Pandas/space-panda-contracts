// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";

contract SpacePandaGame is Ownable, AccessControl {
    // Mapping from token ID to space panda name
    mapping (uint256 => string) private _spName;

    // Mapping if certain name string has already been reserved
    mapping (string => bool) private _nameReserved;

    // govern role for auction contract, game contract
    bytes32 public constant GOVERN_ROLE = keccak256("GOVERN_ROLE");

    // the naming fee can be governed.
    uint256 public NAMING_FEE = 100 * (10 ** 6);

    ERC20Burnable public _token;
    ERC721 public _sp;

    // Events
    event NameChange (uint256 indexed spIndex, string newName);

    constructor (ERC20Burnable token, ERC721 sp) {
        _token = token;
        _sp = sp;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(GOVERN_ROLE, _msgSender());
    }

    function setNamingFee(uint256 fee) public {
        require(hasRole(GOVERN_ROLE, msg.sender), "Invalid caller");
        require(fee > 0, "Invalid fee");
        NAMING_FEE = fee;
    }

    /**
     * @dev Returns if the name has been reserved.
     */
    function isNameReserved(string memory nameString) public view returns (bool) {
        return _nameReserved[toLower(nameString)];
    }

    /**
     * @dev Reserves the name if isReserve is set to true, de-reserves if set to false
     */
    function toggleReserveName(string memory str, bool isReserve) internal {
        _nameReserved[toLower(str)] = isReserve;
    }

    function changeName(uint256 tokenId, string memory newName) public {
        address owner = _sp.ownerOf(tokenId);

        require(_msgSender() == owner, "Invalid caller");
        require(validateName(newName) == true, "Invalid name");
        require(isNameReserved(newName) == false, "Name already reserved");

        _token.transferFrom(msg.sender, address(this), NAMING_FEE);
        // If already named, de-reserve old name
        if (bytes(_spName[tokenId]).length > 0) {
            toggleReserveName(_spName[tokenId], false);
        }
        toggleReserveName(newName, true);
        _spName[tokenId] = newName;
        _token.burn(NAMING_FEE);
        emit NameChange(tokenId, newName);
    }

    /**
     * @dev Check if the name string is valid (Alphanumeric and spaces without leading or trailing space)
     */
    function validateName(string memory str) public pure returns (bool){
        bytes memory b = bytes(str);
        if(b.length < 1) return false;
        if(b.length > 25) return false; // Cannot be longer than 25 characters
        if(b[0] == 0x20) return false; // Leading space
        if (b[b.length - 1] == 0x20) return false; // Trailing space

        bytes1 lastChar = b[0];

        for(uint i; i<b.length; i++){
            bytes1 char = b[i];
            if (char == 0x20 && lastChar == 0x20) return false; // Cannot contain continuous spaces
            if(
                !(char >= 0x30 && char <= 0x39) && //9-0
                !(char >= 0x41 && char <= 0x5A) && //A-Z
                !(char >= 0x61 && char <= 0x7A) && //a-z
                !(char == 0x20) //space
            ) return false;
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

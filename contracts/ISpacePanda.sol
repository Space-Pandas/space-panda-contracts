// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Context.sol";

abstract contract ISpacePanda is Context, ERC721 {
    function burn(uint256 tokenId) public virtual {}
    function mintCustomNft(address to) public virtual {}
}

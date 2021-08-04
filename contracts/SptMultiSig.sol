// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SptMultiSig {

    uint constant public MAX_OWNER_COUNT = 9;

    // The N addresses which control the funds in this contract. The
    // owners of M of these addresses will need to both sign a message
    // allowing the funds in this contract to be spent.
    mapping(address => bool) private isOwner;
    address[] private owners;
    uint private required;

    // The contract nonce is not accessible to the contract so we
    // implement a nonce-like variable for replay protection.
    uint256 private spendNonce = 0;

    // An event sent when funds are received.
    event Funded(address from, uint value);

    // An event sent when a spend is triggered to the given address.
    event Spent(address to, uint transfer);

    // An event sent when a spendERC20 is triggered to the given address.
    event SpentERC20(address erc20contract, address to, uint transfer);

    // An event sent when an spendAny is executed.
    event SpentAny(address to, uint transfer);

    modifier validRequirement(uint ownerCount, uint _required) {
        require (ownerCount <= MAX_OWNER_COUNT
        && _required <= ownerCount
            && _required >= 1);
        _;
    }

    /// @dev Contract constructor sets initial owners and required number of confirmations.
    /// @param _owners List of initial owners.
    /// @param _required Number of required confirmations.
    constructor(address[] memory _owners, uint _required) validRequirement(_owners.length, _required) {
        for (uint i = 0; i < _owners.length; i++) {
            //onwer should be distinct, and non-zero
            if (isOwner[_owners[i]] || _owners[i] == address(0x0)) {
                revert();
            }
            isOwner[_owners[i]] = true;
        }
        owners = _owners;
        required = _required;
    }

    // The fallback function for this contract.
    receive() external payable {
        if (msg.value > 0) {
            emit Funded(msg.sender, msg.value);
        }
    }

    fallback() external payable {
        if (msg.value > 0) {
            emit Funded(msg.sender, msg.value);
        }
    }

    // @dev Returns list of owners.
    // @return List of owner addresses.
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getSpendNonce() public view returns (uint256) {
        return spendNonce;
    }

    function getRequired() public view returns (uint) {
        return required;
    }

    // Generates the message to sign given the output destination address and amount.
    // includes this contract's address and a nonce for replay protection.
    // One option to independently verify: https://leventozturk.com/engineering/sha3/ and select keccak
    function generateMessageToSign(address erc20Contract, address destination, uint256 value) private view returns (bytes32) {
        //the sequence should match generateMultiSigV2 in JS
        bytes32 message = keccak256(abi.encodePacked(address(this), erc20Contract, destination, value, spendNonce));
        return message;
    }

    function _messageToRecover(address erc20Contract, address destination, uint256 value) private view returns (bytes32) {
        bytes32 hashedUnsignedMessage = generateMessageToSign(erc20Contract, destination, value);
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        return keccak256(abi.encodePacked(prefix, hashedUnsignedMessage));
    }

    // @destination: the ether receiver address.
    // @value: the ether value, in wei.
    // @vs, rs, ss: the signatures
    function spend(address payable destination, uint256 value, uint8[] calldata vs, bytes32[] calldata rs, bytes32[] calldata ss) external {
        require(destination != address(this), "Not allow sending to yourself");
        require(address(this).balance >= value && value > 0, "balance or spend value invalid");
        require(_validSignature(address(0x0), destination, value, vs, rs, ss), "invalid signatures");
        spendNonce = spendNonce + 1;
        //transfer will throw if fails
        destination.transfer(value);
        emit Spent(destination, value);
    }

    // @erc20contract: the erc20 contract address.
    // @destination: the token receiver address.
    // @value: the token value, in token minimum unit.
    // @vs, rs, ss: the signatures
    function spendERC20(address destination, address erc20contract, uint256 value, uint8[] calldata vs, bytes32[] calldata rs, bytes32[] calldata ss) external {
        require(destination != address(this), "Not allow sending to yourself");
        //transfer erc20 token
        //uint256 tokenValue = Erc20(erc20contract).balanceOf(address(this));
        require(value > 0, "Erc20 spend value invalid");
        require(_validSignature(erc20contract, destination, value, vs, rs, ss), "invalid signatures");
        spendNonce = spendNonce + 1;
        // transfer tokens from this contract to the destination address
        ERC20(erc20contract).transfer(destination, value);
        emit SpentERC20(erc20contract, destination, value);
    }

    //0x9 is used for spendAny
    //be careful with any action, data is not included into signature computation. So any data can be included in spendAny.
    //This is usually for some emergent recovery, for example, recovery of NTFs, etc.
    //Owners should not generate 0x9 based signatures in normal cases.
    function spendAny(address destination, uint256 value, uint8[] calldata vs, bytes32[] calldata rs, bytes32[] calldata ss, bytes calldata data) external {
        require(destination != address(this), "Not allow sending to yourself");
        require(_validSignature(address(0x9), destination, value, vs, rs, ss), "invalid signatures");
        spendNonce = spendNonce + 1;
        //transfer tokens from this contract to the destination address
        (bool success, ) = destination.call{value: value}(data);
        require(success, "Transfer failed");
        emit SpentAny(destination, value);
    }

    // Confirm that the signature triplets (v1, r1, s1) (v2, r2, s2) ...
    // authorize a spend of this contract's funds to the given destination address.
    function _validSignature(address erc20Contract, address destination, uint256 value, uint8[] calldata vs, bytes32[] calldata rs, bytes32[] calldata ss) private view returns (bool) {
        require(vs.length == rs.length);
        require(rs.length == ss.length);
        require(vs.length <= owners.length);
        require(vs.length >= required);
        bytes32 message = _messageToRecover(erc20Contract, destination, value);
        address[] memory addrs = new address[](vs.length);
        for (uint i = 0; i < vs.length; i++) {
            //recover the address associated with the public key from elliptic curve signature or return zero on error
            addrs[i] = ecrecover(message, vs[i]+27, rs[i], ss[i]);
        }
        require(_distinctOwners(addrs));
        return true;
    }

    // Confirm the addresses as distinct owners of this contract.
    function _distinctOwners(address[] memory addrs) private view returns (bool) {
        if (addrs.length > owners.length) {
            return false;
        }
        for (uint i = 0; i < addrs.length; i++) {
            if (!isOwner[addrs[i]]) {
                return false;
            }
            //address should be distinct
            for (uint j = 0; j < i; j++) {
                if (addrs[i] == addrs[j]) {
                    return false;
                }
            }
        }
        return true;
    }

}
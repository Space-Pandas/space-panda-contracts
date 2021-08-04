// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract SptCrowdSale is Ownable {
    using SafeMath for uint256;

    bool public _started;

    uint256 public constant PriceBase = 10**18 / 100_000;
    uint256 public constant Slot0Price = 25 * PriceBase; // 0.00025 ETH
    uint256 public constant PriceStep = 5 * PriceBase; // 0.00005 ETH
    uint256 public constant SlotSupply = 1_000_000; // SPT count per slot
    uint256 public constant LockTime = 365 * 24 * 60 * 60; // one year in seconds

    uint8 public constant MaxSlots = 10;
    uint8 public _curSlot = 0;
    uint256 public _curSlotRemaining = SlotSupply;
    uint256 public immutable _lockBlocks;

    ERC20 public _token;

    mapping(address => ClaimRecord) public _claimRecords;

    event SptCrowdSaleStarted(bool started);
    event SptClaimed(address indexed account, uint256 amount);
    event SptBought(address indexed account, uint256 amount);

    struct ClaimRecord {
        uint256 startBlock;
        uint256 endBlock;
        uint256 amount;
    }

    modifier onlyStarted() {
        require(_started, "SCS: not started");
        _;
    }

    constructor(
        ERC20 token,
        uint256 blockTime /*in seconds*/
    ) {
        _token = token;
        _lockBlocks = LockTime / blockTime;
    }

    fallback() external payable {
        if (msg.value > 0) {
            _buySpt(msg.value);
        }
    }

    receive() external payable {
        if (msg.value > 0) {
            _buySpt(msg.value);
        }
    }

    function setStarted(bool started) public onlyOwner {
        _started = started;
        emit SptCrowdSaleStarted(started);
    }

    // returns (slotIndex, price, remaining)
    function slotInfo()
        public
        view
        returns (
            uint8,
            uint256,
            uint256
        )
    {
        uint256 price = _getSlotPrice(_curSlot);
        return (_curSlot, price, _curSlotRemaining);
    }

    function buySpt() external payable {
        _buySpt(msg.value);
    }

    function _buySpt(uint256 amount) internal onlyStarted {
        require(amount > 0, "SCS: invalid amount");
        require(
            !(_curSlot == MaxSlots - 1 && _curSlotRemaining == 0),
            "SCS: out of slots"
        );
        // claim pending SPT if any
        _claimSpt(msg.sender);
        uint256 boughtAmount = 0;
        while (_curSlot < MaxSlots && amount >= _getSlotPrice(_curSlot)) {
            (
                uint256 amountGet,
                uint256 slotLeft,
                uint256 ethLeft
            ) = _buyAtCurSlot(amount);
            boughtAmount = boughtAmount.add(amountGet);
            _curSlotRemaining = slotLeft;
            amount = ethLeft;
            if (slotLeft == 0 && _curSlot < MaxSlots - 1) {
                _moveToNextSlot();
            }
        }

        // update claim record
        uint256 sptBought = boughtAmount.mul(10**_token.decimals());
        // update claim record
        ClaimRecord memory record = _claimRecords[msg.sender];
        record.amount = record.amount.add(sptBought);
        record.startBlock = block.number;
        record.endBlock = block.number + _lockBlocks;
        _claimRecords[msg.sender] = record;

        if (amount > 0) {
            msg.sender.transfer(amount);
        }

        emit SptBought(msg.sender, sptBought);
    }

    function _buyAtCurSlot(uint256 ethAmount)
        internal
        view
        returns (
            uint256 amountGet,
            uint256 slotLeft,
            uint256 ethLeft
        )
    {
        if (_curSlotRemaining == 0) {
            return (0, 0, ethAmount);
        }
        uint256 slotPrice = _getSlotPrice(_curSlot);
        uint256 allCost = slotPrice * _curSlotRemaining;
        if (allCost <= ethAmount) {
            // eth provided exceeds slot limit
            return (_curSlotRemaining, 0, ethAmount.sub(allCost));
        }
        amountGet = ethAmount / slotPrice;
        slotLeft = _curSlotRemaining.sub(amountGet);
        ethLeft = ethAmount.sub(amountGet.mul(slotPrice));
    }

    function claimSpt() external returns (uint256) {
        uint256 claimed = _claimSpt(msg.sender);
        require(claimed > 0, "SCS: nothing to claim");
        return claimed;
    }

    // allow owner to claim for a specified address
    function claimFor(address who) external onlyOwner returns (uint256) {
        uint256 claimed = _claimSpt(who);
        require(claimed > 0, "SCS: nothing to claim");
        return claimed;
    }

    function claimInfo(address who, uint256 at)
        public
        view
        returns (uint256, ClaimRecord memory)
    {
        ClaimRecord memory record = _claimRecords[who];
        if (at == 0) {
            at = block.number;
        }
        return (_getClaimableAmount(at, record), record);
    }

    function _getClaimableAmount(uint256 blockNumber, ClaimRecord memory record)
        internal
        pure
        returns (uint256)
    {
        if (
            record.amount == 0 ||
            record.startBlock >= blockNumber ||
            record.startBlock >= record.endBlock
        ) {
            return 0;
        }
        if (record.endBlock <= blockNumber) {
            //  claim ended
            return record.amount;
        }

        uint256 blockPassed = blockNumber.sub(record.startBlock);
        uint256 totalBlocks = record.endBlock.sub(record.startBlock);
        return record.amount.mul(blockPassed).div(totalBlocks);
    }

    function _claimSpt(address who) internal returns (uint256) {
        ClaimRecord memory record = _claimRecords[who];

        uint256 claimAmount = _getClaimableAmount(block.number, record);
        require(_token.transfer(who, claimAmount), "SCS: transfer failed");

        record.amount = record.amount.sub(claimAmount);
        record.startBlock = block.number + 1;
        if (record.amount == 0 || record.startBlock >= record.endBlock) {
            // no pending claims
            delete _claimRecords[who];
        } else {
            _claimRecords[who] = record;
        }

        emit SptClaimed(who, claimAmount);

        return claimAmount;
    }

    function _getSlotPrice(uint8 slot) internal pure returns (uint256) {
        return Slot0Price + slot * PriceStep;
    }

    function _moveToNextSlot() internal {
        require(_curSlot < MaxSlots - 1, "SCS: no slots avaiable");
        _curSlot = _curSlot + 1;
        _curSlotRemaining = SlotSupply;
    }
}

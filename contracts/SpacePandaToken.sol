// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";

contract SpacePandaToken is ERC20PresetMinterPauser {
    constructor() ERC20PresetMinterPauser("SpacePandaToken", "SPT") {
        _setupDecimals(6);
    }
}

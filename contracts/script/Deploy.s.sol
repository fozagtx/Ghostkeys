// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {LocalBuyEscrow} from "../src/LocalBuyEscrow.sol";
import {SavingsVault} from "../src/SavingsVault.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        LocalBuyEscrow escrow = new LocalBuyEscrow();
        SavingsVault vault = new SavingsVault();

        console2.log("LocalBuyEscrow:", address(escrow));
        console2.log("SavingsVault:", address(vault));

        vm.stopBroadcast();
    }
}

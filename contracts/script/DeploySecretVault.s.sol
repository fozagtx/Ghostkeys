// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SecretVault} from "../src/SecretVault.sol";

contract DeploySecretVault is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        SecretVault vault = new SecretVault();
        console2.log("SecretVault:", address(vault));
        vm.stopBroadcast();
    }
}

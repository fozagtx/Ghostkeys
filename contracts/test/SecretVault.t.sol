// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SecretVault} from "../src/SecretVault.sol";

contract SecretVaultTest is Test {
    SecretVault vault;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        vault = new SecretVault();
    }

    function test_addAndRead() public {
        bytes memory ct = hex"deadbeef";
        vm.prank(alice);
        uint256 idx = vault.addSecret(ct);
        assertEq(idx, 0);

        (bytes memory out, , , bool deleted) = vault.getSecret(alice, 0);
        assertEq(out, ct);
        assertFalse(deleted);
        assertEq(vault.secretCount(alice), 1);
    }

    function test_onlyOwnerRows() public {
        vm.prank(alice);
        vault.addSecret(hex"aa");
        vm.prank(bob);
        vault.addSecret(hex"bb");

        (bytes memory a, , , ) = vault.getSecret(alice, 0);
        (bytes memory b, , , ) = vault.getSecret(bob, 0);
        assertEq(a, hex"aa");
        assertEq(b, hex"bb");
    }

    function test_updateAndDelete() public {
        vm.startPrank(alice);
        vault.addSecret(hex"01");
        vault.updateSecret(0, hex"02");
        (bytes memory mid, , , ) = vault.getSecret(alice, 0);
        assertEq(mid, hex"02");

        vault.deleteSecret(0);
        (bytes memory afterDel, , , bool deleted) = vault.getSecret(alice, 0);
        assertTrue(deleted);
        assertEq(afterDel.length, 0);

        (uint256[] memory indices, , ) = vault.getActiveSecrets(alice);
        assertEq(indices.length, 0);
        vm.stopPrank();
    }

    function test_emptyReverts() public {
        vm.prank(alice);
        vm.expectRevert(SecretVault.EmptyCiphertext.selector);
        vault.addSecret("");
    }

    function test_getActiveSecrets() public {
        vm.startPrank(alice);
        vault.addSecret(hex"11");
        vault.addSecret(hex"22");
        vault.deleteSecret(0);
        vm.stopPrank();

        (uint256[] memory indices, bytes[] memory cts, ) = vault.getActiveSecrets(alice);
        assertEq(indices.length, 1);
        assertEq(indices[0], 1);
        assertEq(cts[0], hex"22");
    }
}

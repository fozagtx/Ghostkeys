// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LocalBuyEscrow} from "../src/LocalBuyEscrow.sol";
import {SavingsVault} from "../src/SavingsVault.sol";

contract HarborTest is Test {
    LocalBuyEscrow escrow;
    SavingsVault vault;

    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");
    address saver = makeAddr("saver");

    function setUp() public {
        escrow = new LocalBuyEscrow();
        vault = new SavingsVault();
        vm.deal(seller, 100 ether);
        vm.deal(buyer, 1 ether);
        vm.deal(saver, 50 ether);
    }

    function test_buyFlow_localCurrency() public {
        vm.prank(seller);
        uint256 id = escrow.createListing{value: 10 ether}("GHS", 500, "Mobile Money", "MoMo 024***");

        LocalBuyEscrow.Listing memory L = escrow.getListing(id);
        assertEq(uint8(L.status), uint8(LocalBuyEscrow.Status.Open));
        assertEq(L.monAmount, 10 ether);

        vm.prank(buyer);
        escrow.takeListing(id);

        vm.prank(buyer);
        escrow.markFiatPaid(id);

        uint256 buyerBefore = buyer.balance;
        vm.prank(seller);
        escrow.release(id);

        assertEq(buyer.balance, buyerBefore + 10 ether);
        assertEq(uint8(escrow.getListing(id).status), uint8(LocalBuyEscrow.Status.Completed));
    }

    function test_cancelExpired() public {
        vm.prank(seller);
        uint256 id = escrow.createListing{value: 5 ether}("NGN", 10000, "Bank", "GTBank ***");

        vm.prank(buyer);
        escrow.takeListing(id);

        vm.warp(block.timestamp + 3 hours);

        uint256 sellerBefore = seller.balance;
        vm.prank(seller);
        escrow.cancelExpired(id);
        assertEq(seller.balance, sellerBefore + 5 ether);
    }

    function test_savingsLockAndWithdraw() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(saver);
        uint256 id = vault.openGoal{value: 20 ether}(unlock, "Stack MON");

        vm.prank(saver);
        vm.expectRevert(SavingsVault.StillLocked.selector);
        vault.withdraw(id);

        vm.warp(unlock + 1);
        uint256 before = saver.balance;
        vm.prank(saver);
        vault.withdraw(id);
        assertEq(saver.balance, before + 20 ether);
    }
}

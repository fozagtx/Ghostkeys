// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LocalBuyEscrow
/// @notice P2P buy of native MON with local currency. Seller locks MON on-chain;
///         buyer pays fiat off-chain, then seller releases MON. Fiat never touches the chain.
/// @dev On-chain: escrow, order state, settlement. Off-chain: bank/mobile-money payment rails.
contract LocalBuyEscrow {
    enum Status {
        None,
        Open,
        Taken,
        FiatMarked,
        Completed,
        Cancelled
    }

    struct Listing {
        address seller;
        address buyer;
        uint128 monAmount;
        uint64 createdAt;
        uint64 takenAt;
        uint64 fiatMarkedAt;
        uint64 deadline; // buyer must mark paid by this time once taken
        uint96 fiatAmount; // minor units (e.g. pesewas / kobo) or whole units — UI documents scale
        Status status;
        string fiatCurrency; // e.g. "GHS", "NGN", "KES"
        string paymentMethod; // e.g. "Mobile Money", "Bank Transfer"
        string paymentHint; // short seller instructions (phone / account label). Keep secrets off-chain if needed.
    }

    uint256 public nextId = 1;
    uint64 public constant DEFAULT_PAY_WINDOW = 2 hours;

    mapping(uint256 => Listing) public listings;

    event ListingCreated(
        uint256 indexed id,
        address indexed seller,
        uint128 monAmount,
        string fiatCurrency,
        uint96 fiatAmount,
        string paymentMethod
    );
    event ListingTaken(uint256 indexed id, address indexed buyer, uint64 deadline);
    event FiatMarked(uint256 indexed id, address indexed buyer);
    event Released(uint256 indexed id, address indexed buyer, uint128 monAmount);
    event Cancelled(uint256 indexed id, address indexed by);

    error InvalidAmount();
    error InvalidCurrency();
    error NotSeller();
    error NotBuyer();
    error BadStatus();
    error WindowOpen();
    error TransferFailed();

    /// @notice Seller posts MON for sale against a local-currency price.
    function createListing(
        string calldata fiatCurrency,
        uint96 fiatAmount,
        string calldata paymentMethod,
        string calldata paymentHint
    ) external payable returns (uint256 id) {
        if (msg.value == 0 || msg.value > type(uint128).max) revert InvalidAmount();
        if (bytes(fiatCurrency).length == 0 || bytes(fiatCurrency).length > 8) revert InvalidCurrency();
        if (fiatAmount == 0) revert InvalidAmount();

        id = nextId++;
        listings[id] = Listing({
            seller: msg.sender,
            buyer: address(0),
            monAmount: uint128(msg.value),
            createdAt: uint64(block.timestamp),
            takenAt: 0,
            fiatMarkedAt: 0,
            deadline: 0,
            fiatAmount: fiatAmount,
            status: Status.Open,
            fiatCurrency: fiatCurrency,
            paymentMethod: paymentMethod,
            paymentHint: paymentHint
        });

        emit ListingCreated(id, msg.sender, uint128(msg.value), fiatCurrency, fiatAmount, paymentMethod);
    }

    /// @notice Buyer locks the listing to themselves. Must mark fiat paid before deadline.
    function takeListing(uint256 id) external {
        Listing storage L = listings[id];
        if (L.status != Status.Open) revert BadStatus();
        if (msg.sender == L.seller) revert BadStatus();

        L.status = Status.Taken;
        L.buyer = msg.sender;
        L.takenAt = uint64(block.timestamp);
        L.deadline = uint64(block.timestamp) + DEFAULT_PAY_WINDOW;

        emit ListingTaken(id, msg.sender, L.deadline);
    }

    /// @notice Buyer asserts they sent local currency off-chain. Seller should verify then release.
    function markFiatPaid(uint256 id) external {
        Listing storage L = listings[id];
        if (L.status != Status.Taken) revert BadStatus();
        if (msg.sender != L.buyer) revert NotBuyer();

        L.status = Status.FiatMarked;
        L.fiatMarkedAt = uint64(block.timestamp);

        emit FiatMarked(id, msg.sender);
    }

    /// @notice Seller confirms fiat received and sends escrowed MON to buyer.
    function release(uint256 id) external {
        Listing storage L = listings[id];
        if (L.status != Status.FiatMarked && L.status != Status.Taken) revert BadStatus();
        if (msg.sender != L.seller) revert NotSeller();
        // Allow release from Taken if seller already saw fiat (skips mark step)
        if (L.buyer == address(0)) revert BadStatus();

        L.status = Status.Completed;
        uint128 amount = L.monAmount;

        (bool ok,) = L.buyer.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Released(id, L.buyer, amount);
    }

    /// @notice Seller cancels an open listing and reclaims MON.
    function cancelOpen(uint256 id) external {
        Listing storage L = listings[id];
        if (L.status != Status.Open) revert BadStatus();
        if (msg.sender != L.seller) revert NotSeller();

        L.status = Status.Cancelled;
        _refundSeller(L);
        emit Cancelled(id, msg.sender);
    }

    /// @notice If buyer never marks paid by deadline, seller reclaims MON.
    function cancelExpired(uint256 id) external {
        Listing storage L = listings[id];
        if (L.status != Status.Taken) revert BadStatus();
        if (msg.sender != L.seller) revert NotSeller();
        if (block.timestamp < L.deadline) revert WindowOpen();

        L.status = Status.Cancelled;
        _refundSeller(L);
        emit Cancelled(id, msg.sender);
    }

    /// @notice Buyer walks away before marking paid; MON returns to seller.
    function buyerCancel(uint256 id) external {
        Listing storage L = listings[id];
        if (L.status != Status.Taken) revert BadStatus();
        if (msg.sender != L.buyer) revert NotBuyer();

        L.status = Status.Cancelled;
        _refundSeller(L);
        emit Cancelled(id, msg.sender);
    }

    function _refundSeller(Listing storage L) internal {
        uint128 amount = L.monAmount;
        (bool ok,) = L.seller.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function getListing(uint256 id) external view returns (Listing memory) {
        return listings[id];
    }
}

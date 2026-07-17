// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SavingsVault
/// @notice Simple personal MON savings: deposit native MON with a lock until unlockTime.
///         Built so "I bought MON to save" is an on-chain commitment, not a spreadsheet.
contract SavingsVault {
    struct Goal {
        address owner;
        uint128 amount;
        uint64 unlockTime;
        uint64 createdAt;
        bool withdrawn;
        string label; // e.g. "School", "Emergency", "Stack MON"
    }

    uint256 public nextId = 1;
    mapping(uint256 => Goal) public goals;
    mapping(address => uint256[]) private _ownerGoals;

    event GoalOpened(uint256 indexed id, address indexed owner, uint128 amount, uint64 unlockTime, string label);
    event GoalWithdrawn(uint256 indexed id, address indexed owner, uint128 amount);

    error InvalidAmount();
    error InvalidUnlock();
    error NotOwner();
    error StillLocked();
    error AlreadyWithdrawn();
    error TransferFailed();

    /// @notice Lock `msg.value` MON until `unlockTime`.
    function openGoal(uint64 unlockTime, string calldata label) external payable returns (uint256 id) {
        if (msg.value == 0 || msg.value > type(uint128).max) revert InvalidAmount();
        if (unlockTime <= block.timestamp) revert InvalidUnlock();
        // Max ~10y lock to avoid fat-finger forever locks
        if (unlockTime > block.timestamp + 3650 days) revert InvalidUnlock();

        id = nextId++;
        goals[id] = Goal({
            owner: msg.sender,
            amount: uint128(msg.value),
            unlockTime: unlockTime,
            createdAt: uint64(block.timestamp),
            withdrawn: false,
            label: label
        });
        _ownerGoals[msg.sender].push(id);

        emit GoalOpened(id, msg.sender, uint128(msg.value), unlockTime, label);
    }

    /// @notice Withdraw after unlock. Full amount only.
    function withdraw(uint256 id) external {
        Goal storage G = goals[id];
        if (G.owner != msg.sender) revert NotOwner();
        if (G.withdrawn) revert AlreadyWithdrawn();
        if (block.timestamp < G.unlockTime) revert StillLocked();

        G.withdrawn = true;
        uint128 amount = G.amount;

        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit GoalWithdrawn(id, msg.sender, amount);
    }

    function getGoal(uint256 id) external view returns (Goal memory) {
        return goals[id];
    }

    function goalsOf(address owner) external view returns (uint256[] memory) {
        return _ownerGoals[owner];
    }

    function timeLeft(uint256 id) external view returns (uint256) {
        Goal storage G = goals[id];
        if (block.timestamp >= G.unlockTime) return 0;
        return G.unlockTime - block.timestamp;
    }
}

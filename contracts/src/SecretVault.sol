// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SecretVault
/// @notice On-chain store for wallet-encrypted OTP/2FA secrets (ciphertext only).
/// @dev Encryption and TOTP generation happen client-side. The chain only stores
///      opaque bytes and enforces that only the owner can add/update/remove their rows.
contract SecretVault {
    struct Record {
        bytes ciphertext;
        uint64 createdAt;
        uint64 updatedAt;
        bool deleted;
    }

    mapping(address => Record[]) private _records;

    event SecretAdded(address indexed owner, uint256 indexed index, uint64 createdAt);
    event SecretUpdated(address indexed owner, uint256 indexed index, uint64 updatedAt);
    event SecretDeleted(address indexed owner, uint256 indexed index);

    error EmptyCiphertext();
    error CiphertextTooLarge();
    error IndexOutOfBounds();
    error AlreadyDeleted();

    /// @dev Soft cap so a single tx cannot store unbounded data (still well under Monad limits).
    uint256 public constant MAX_CIPHERTEXT_BYTES = 8_192;

    function addSecret(bytes calldata ciphertext) external returns (uint256 index) {
        _validateCiphertext(ciphertext);
        index = _records[msg.sender].length;
        _records[msg.sender].push(
            Record({
                ciphertext: ciphertext,
                createdAt: uint64(block.timestamp),
                updatedAt: uint64(block.timestamp),
                deleted: false
            })
        );
        emit SecretAdded(msg.sender, index, uint64(block.timestamp));
    }

    function updateSecret(uint256 index, bytes calldata ciphertext) external {
        _validateCiphertext(ciphertext);
        Record storage r = _requireOwned(msg.sender, index);
        if (r.deleted) revert AlreadyDeleted();
        r.ciphertext = ciphertext;
        r.updatedAt = uint64(block.timestamp);
        emit SecretUpdated(msg.sender, index, r.updatedAt);
    }

    function deleteSecret(uint256 index) external {
        Record storage r = _requireOwned(msg.sender, index);
        if (r.deleted) revert AlreadyDeleted();
        r.deleted = true;
        r.ciphertext = "";
        r.updatedAt = uint64(block.timestamp);
        emit SecretDeleted(msg.sender, index);
    }

    function secretCount(address owner) external view returns (uint256) {
        return _records[owner].length;
    }

    function getSecret(address owner, uint256 index)
        external
        view
        returns (bytes memory ciphertext, uint64 createdAt, uint64 updatedAt, bool deleted)
    {
        if (index >= _records[owner].length) revert IndexOutOfBounds();
        Record storage r = _records[owner][index];
        return (r.ciphertext, r.createdAt, r.updatedAt, r.deleted);
    }

    /// @notice Active (non-deleted) secrets for an owner. Suitable for small personal vaults.
    function getActiveSecrets(address owner)
        external
        view
        returns (uint256[] memory indices, bytes[] memory ciphertexts, uint64[] memory createdAts)
    {
        uint256 n = _records[owner].length;
        uint256 active;
        for (uint256 i = 0; i < n; i++) {
            if (!_records[owner][i].deleted) active++;
        }

        indices = new uint256[](active);
        ciphertexts = new bytes[](active);
        createdAts = new uint64[](active);

        uint256 j;
        for (uint256 i = 0; i < n; i++) {
            Record storage r = _records[owner][i];
            if (r.deleted) continue;
            indices[j] = i;
            ciphertexts[j] = r.ciphertext;
            createdAts[j] = r.createdAt;
            j++;
        }
    }

    function _validateCiphertext(bytes calldata ciphertext) internal pure {
        if (ciphertext.length == 0) revert EmptyCiphertext();
        if (ciphertext.length > MAX_CIPHERTEXT_BYTES) revert CiphertextTooLarge();
    }

    function _requireOwned(address owner, uint256 index) internal view returns (Record storage r) {
        if (index >= _records[owner].length) revert IndexOutOfBounds();
        r = _records[owner][index];
    }
}

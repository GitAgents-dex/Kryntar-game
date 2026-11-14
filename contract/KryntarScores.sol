// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title Kryntar Scores — on-chain Deep Dive leaderboard, holders only.
/// One best entry per wallet. Submitting is gas-only; the caller must hold
/// at least 1 Kryntar Diver at submit time. Names are 1-24 bytes.
/// No owner, no fees, no pausing — the board is read straight from chain.
interface IKryntarDiver {
    function balanceOf(address owner) external view returns (uint256);
}

contract KryntarScores {
    address public immutable nft;

    struct Entry {
        string name;
        uint256 score;
        uint256 depth;
        uint256 gems;
        uint256 updatedAt;
    }

    mapping(address => Entry) private _entries;
    mapping(address => bool) private _seen;
    address[] private _players;

    event ScoreSubmitted(
        address indexed player,
        string name,
        uint256 score,
        uint256 depth,
        uint256 gems
    );

    constructor(address nft_) {
        require(nft_ != address(0), "NFT address 0");
        nft = nft_;
    }

    /// @notice Save a dive. Only the wallet's BEST score is kept; the name
    /// is always updated to the latest one submitted.
    function submitScore(
        string calldata name,
        uint256 score,
        uint256 depth,
        uint256 gems
    ) external {
        require(
            IKryntarDiver(nft).balanceOf(msg.sender) > 0,
            "Hold a Kryntar Diver"
        );
        bytes memory b = bytes(name);
        require(b.length >= 1 && b.length <= 24, "Name 1-24 bytes");
        require(score > 0, "Score 0");
        if (!_seen[msg.sender]) {
            _seen[msg.sender] = true;
            _players.push(msg.sender);
        }
        Entry storage e = _entries[msg.sender];
        e.name = name;
        if (score > e.score) {
            e.score = score;
            e.depth = depth;
            e.gems = gems;
            e.updatedAt = block.timestamp;
        }
        emit ScoreSubmitted(msg.sender, name, e.score, e.depth, e.gems);
    }

    function playerCount() external view returns (uint256) {
        return _players.length;
    }

    function playerAt(uint256 i) external view returns (address) {
        return _players[i];
    }

    function isPlayer(address player) external view returns (bool) {
        return _seen[player];
    }

    function entryOf(
        address player
    )
        external
        view
        returns (
            string memory name,
            uint256 score,
            uint256 depth,
            uint256 gems,
            uint256 updatedAt
        )
    {
        Entry storage e = _entries[player];
        return (e.name, e.score, e.depth, e.gems, e.updatedAt);
    }
}

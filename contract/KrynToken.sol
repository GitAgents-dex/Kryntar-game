// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title Kryn ($KRYN) — the Kryntar Divers game token.
/// @notice Fixed supply, minted once to the deployer. No owner, no mint,
/// no burn, no tax. Distribution follows the approved split:
/// 50% rewards (holder claim + seasonal score pool), 45% liquidity,
/// 5% owner — all distributed by the deployer after deployment.
contract KrynToken {
    string public constant name = "Kryn";
    string public constant symbol = "KRYN";
    uint8 public constant decimals = 18;

    uint256 public constant TOTAL_SUPPLY = 222_222_222 * 1e18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error InsufficientBalance();
    error InsufficientAllowance();

    constructor() {
        totalSupply = TOTAL_SUPPLY;
        balanceOf[msg.sender] = TOTAL_SUPPLY;
        emit Transfer(address(0), msg.sender, TOTAL_SUPPLY);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < value) revert InsufficientAllowance();
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (balanceOf[from] < value) revert InsufficientBalance();
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
contract MockRegistry {
    mapping(address => uint256) public balanceOf;
    function give(address a) external { balanceOf[a] = 1; }
}

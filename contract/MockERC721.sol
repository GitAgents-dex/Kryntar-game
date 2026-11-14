// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Minimal ERC721 stand-in for tests: mint + ownerOf + balanceOf.
contract MockERC721 {
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;

    error NotOwner();

    function mint(address to, uint256 tokenId) external {
        require(_owners[tokenId] == address(0), "taken");
        _owners[tokenId] = to;
        _balances[to] += 1;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "no token");
        return o;
    }

    function balanceOf(address who) external view returns (uint256) {
        return _balances[who];
    }
}

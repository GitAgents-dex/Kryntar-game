// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC721Owner {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IERC20Transfer {
    function transfer(address to, uint256 value) external returns (bool);
}

/// @title KrynClaim — one $KRYN claim per Kryntar Diver, for whoever holds it.
/// @notice Holder-based: the current holder of a Diver claims 25,000 $KRYN
/// once per token ID. Each claim costs exactly CLAIM_FEE in BNB, which
/// accumulates in this contract; the owner withdraws it with withdraw().
/// The contract holds no claim power of its own: it can only pay out the
/// $KRYN it was funded with, so fund exactly the holder-claim allocation
/// (55,550,000 $KRYN = 25,000 x 2,222). There is no token rescue function.
contract KrynClaim {
    IERC721Owner public immutable nft;
    IERC20Transfer public immutable token;
    address public immutable owner;

    uint256 public constant REWARD = 25_000 * 1e18;
    uint256 public constant CLAIM_FEE = 0.0001 ether;

    mapping(uint256 => bool) public claimed;
    uint256 public claimedCount;

    event Claimed(address indexed holder, uint256 indexed tokenId, uint256 reward);
    event FeesWithdrawn(address indexed owner, uint256 amount);

    error InvalidAddress();
    error IncorrectFee();
    error NotHolder();
    error AlreadyClaimed();
    error TransferFailed();
    error NotOwner();

    constructor(address _nft, address _token) {
        if (_nft == address(0) || _token == address(0)) revert InvalidAddress();
        nft = IERC721Owner(_nft);
        token = IERC20Transfer(_token);
        owner = msg.sender;
    }

    function claim(uint256 tokenId) external payable {
        if (msg.value != CLAIM_FEE) revert IncorrectFee();
        if (nft.ownerOf(tokenId) != msg.sender) revert NotHolder();
        if (claimed[tokenId]) revert AlreadyClaimed();
        claimed[tokenId] = true;
        claimedCount += 1;
        if (!token.transfer(msg.sender, REWARD)) revert TransferFailed();
        emit Claimed(msg.sender, tokenId, REWARD);
    }

    function withdraw() external {
        if (msg.sender != owner) revert NotOwner();
        uint256 amount = address(this).balance;
        (bool ok, ) = owner.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit FeesWithdrawn(owner, amount);
    }
}

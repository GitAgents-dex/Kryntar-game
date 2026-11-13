// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title Kryntar Divers — 2,222 pixel divers on BNB Chain
/// Lanes: Free (0 BNB, max 1/wallet) / Deep (0.0005 BNB, max 5/wallet) / Legendary (0.01 BNB, max 5/wallet, guaranteed Legendary).
/// Free and Deep draw from the standard pool (Common/Rare/Epic — never Legendary).
/// Legendary draws only from the legendary pool. Mint is CLOSED at deploy; the owner opens it.
contract Kryntar {
    string public constant name = "Kryntar Divers";
    string public constant symbol = "KRYNT";
    uint256 public constant MAX_SUPPLY = 2222;
    uint256 public constant STANDARD_POOL_SIZE = 2111;
    uint256 public constant LEGENDARY_POOL_SIZE = 111;

    // Token IDs packed as big-endian uint16 pairs. Order and rarity assignment are fixed
    // by the published collection (commitment in nft-production/summary.json).
    bytes private constant STANDARD_POOL = hex"00010002000300050006000700080009000a000b000c000d000e000f0010001100120013001400150016001700180019001a001b001c001d001e001f0020002100220023002400250026002700280029002a002b002c002d002e002f0030003100320033003400350036003700380039003a003b003c003d003e003f0040004100420043004400450046004700480049004a004b004c004d004e004f0050005100520053005400550056005700580059005a005b005c005d005e005f006000610062006400650066006700680069006a006b006c006d006e006f0070007100720073007400750076007700780079007a007b007c007d007f0080008100820083008400850086008700880089008a008b008c008e008f009000910092009300940095009700980099009a009b009c009d009e009f00a000a100a200a300a400a500a700a800a900aa00ab00ac00ad00ae00af00b000b200b300b400b600b700b900ba00bb00bc00bd00be00bf00c000c100c200c300c400c500c600c700c800c900ca00cb00cc00cd00ce00cf00d000d100d200d300d400d500d600d700d800d900da00db00dc00dd00de00df00e000e100e200e300e400e500e600e700e800ea00eb00ec00ed00ee00ef00f000f100f200f300f400f500f600f700f800f900fa00fb00fc00fd00fe00ff0100010101020103010401050106010701080109010a010c010e010f0110011101120113011401150116011701180119011a011b011c011d011f0120012101220123012401250126012701280129012a012b012c012d012e012f0130013101320133013401350136013701380139013a013b013c013d013e013f0140014101420143014401450146014701480149014a014b014c014e014f015001520153015401550156015701580159015a015b015c015d015e0160016101630165016601670169016a016b016c016d016e016f017001710172017301740176017701780179017a017b017c017d017e017f0180018101820183018401850186018701880189018a018b018c018d018f01900192019301940195019601970198019a019b019c019d019e019f01a001a101a201a301a401a501a601a701a801a901aa01ab01ac01ad01ae01af01b001b101b201b301b401b501b601b701b801b901ba01bb01bc01bd01be01bf01c001c101c201c301c401c501c601c701c801c901ca01cb01cc01cd01ce01d001d101d201d301d401d501d601d701d801d901da01db01dc01dd01de01df01e001e101e201e301e401e601e701e801e901ea01eb01ec01ed01ee01ef01f001f101f201f301f401f501f601f701f801f901fa01fb01fc01fd01fe01ff0200020102020203020402050206020702080209020a020b020c020d020e020f0210021102120213021402150216021702180219021a021b021c021d021e021f0220022102220223022402250226022702280229022a022b022c022d022e022f023002310232023302340235023602380239023a023b023c023d023e023f0240024102420243024402450246024702480249024a024b024e024f025002510253025402550256025702580259025a025b025c025d025e025f0260026102620263026402650266026702680269026a026b026c026d026e026f027102720273027402750276027702780279027a027b027c027d027f0280028102820283028402850286028702880289028a028b028c028d028e028f0290029102920293029402950296029702980299029a029b029c029d029e029f02a002a102a202a302a402a902ab02ac02ad02ae02af02b002b102b202b302b402b502b602b702b802b902ba02bb02bd02be02bf02c002c102c202c302c402c502c602c702c802c902ca02cb02cc02cd02ce02cf02d002d102d202d302d402d502d602d702d802d902da02db02dc02dd02de02df02e002e102e202e302e402e502e602e702e802e902ea02eb02ec02ed02ee02ef02f002f102f202f302f402f502f602f702f802f902fa02fb02fc02fd02fe02ff030003010302030403050306030703080309030a030b030c030d030e030f031103120313031403150316031703180319031a031b031c031d031e031f032003210322032303240325032603270329032a032b032c032e032f0330033103320333033403350336033703380339033a033b033c033d033f0340034103420343034403450346034703480349034a034b034d034e034f035003510352035303540355035603580359035a035b035c035e035f0360036103620363036403650366036703680369036a036b036c036d036e036f0370037103720373037403750376037703780379037a037b037c037d037f0380038103820383038403850386038703880389038a038b038c038d038e038f0390039103920393039403950396039703980399039a039b039c039d039e039f03a003a103a203a303a403a503a703a803a903aa03ab03ac03ad03af03b003b103b203b303b403b503b603b703b803b903ba03bb03bc03bd03be03bf03c003c203c403c503c603c703c803c903ca03cb03cc03cd03ce03cf03d003d103d203d303d403d603d703d803d903da03db03dc03dd03de03df03e003e103e203e303e403e503e603e703e803e903ea03eb03ec03ed03ef03f003f103f203f303f403f503f603f803f903fa03fb03fc03fd03fe03ff0400040104020403040404050406040704080409040a040b040c040e040f041004110412041304140415041704180419041a041b041c041d041e041f042004210422042304240425042604280429042a042b042c042d042e042f0430043104320433043404350436043704380439043a043b043c043d043e043f044004410442044304440445044604480449044a044b044c044d044e044f045004510452045304540455045604580459045a045b045c045d045e045f04600461046304640465046604670468046a046b046c046d046e046f0470047104720473047404750476047704780479047a047b047c047d047e047f0480048104820483048404850486048704880489048a048b048c048d048e048f0490049104920493049404950496049704980499049a049b049c049e049f04a004a204a304a404a504a604a704a804a904aa04ab04ac04ad04ae04af04b004b104b204b304b404b504b604b704b804b904ba04bb04bc04bd04be04bf04c004c104c204c304c404c504c604c704c804ca04cb04cc04cd04ce04cf04d204d304d404d504d604d704d804d904da04db04dc04dd04de04df04e004e104e204e304e404e504e604e704e904ea04eb04ec04ed04ee04ef04f004f104f204f304f404f504f604f704f804f904fa04fb04fc04fd04fe04ff0500050105020503050405050506050705080509050a050b050c050d050e050f0510051105120513051405150516051705180519051a051b051c051d051e051f0520052105220523052405250526052705280529052a052b052c052d052e052f0530053105320533053405350536053705380539053b053c053d053e053f0540054105420543054405450546054705480549054a054b054c054d054e054f0550055105520553055405550556055705580559055a055b055c055d055e055f0560056105620563056405650566056705680569056a056b056c056d056e056f0570057105720574057505760577057a057b057c057e057f0580058105820583058405850586058705880589058a058b058c058d058e058f0590059105920593059405950596059705980599059a059b059c059d059e059f05a005a105a205a305a505a605a705a805a905aa05ab05ac05ad05ae05af05b105b205b305b405b505b605b705b805b905ba05bb05bc05bd05be05bf05c005c205c405c505c605c705c805c905ca05cb05cc05cd05ce05cf05d005d105d205d305d405d705d805d905da05db05dc05dd05de05df05e005e105e205e305e405e505e605e705e805e905ea05eb05ec05ed05ee05ef05f005f105f205f305f405f505f605f705f805fa05fb05fc05fd05fe05ff0600060106020603060406050606060706080609060a060b060c060d060e060f0610061106120613061406150616061706180619061a061b061c061d061e061f062006210622062306240625062706280629062a062b062c062d062e062f0630063106320633063406350636063706380639063a063c063d063e0640064106420643064406450646064706480649064a064b064c064d064e064f065106520653065406550656065706580659065a065b065c065d065e0660066106620663066406650666066706680669066a066b066c066d066e066f0670067106720673067406750676067706780679067a067b067c067d067e067f0680068106820683068406850686068706880689068a068b068c068d068e068f0690069106920693069406950696069706980699069a069b069c069d069e069f06a006a106a206a306a406a506a606a706a806a906aa06ab06ac06ad06ae06af06b006b206b306b406b506b606b706b806b906ba06bb06bc06bd06bf06c006c106c206c306c406c506c606c706c806c906ca06cb06cc06cd06ce06cf06d006d206d306d406d506d606d706d806d906da06db06dc06dd06de06df06e006e206e306e406e506e606e706e806e906ea06eb06ec06ed06ee06ef06f106f206f306f406f506f606f706f806f906fa06fb06fc06fd06fe06ff0700070107020703070407050706070707080709070a070b070c070d070e070f0710071107120713071407150716071707180719071a071c071d071e071f072007210722072307240725072607270729072a072b072c072d072e072f0730073107320733073407350736073707380739073a073b073c073d073f0740074107420743074407450746074707480749074a074b074c074d074e074f0750075107520753075407550756075707580759075a075b075c075d075e075f076107620763076407650766076707680769076a076c076d076e076f077007710772077307740776077707780779077a077b077c077d077e077f078007810782078307840785078707880789078a078b078c078d078e078f0790079107920793079407950796079707980799079a079b079c079d079e079f07a007a107a307a407a507a607a707a807a907aa07ab07ac07ad07af07b007b107b207b407b507b607b707b807b907ba07bb07bc07bd07be07bf07c007c107c207c307c407c507c607c707c807c907ca07cb07cc07cd07ce07cf07d007d107d207d307d407d507d607d707d807d907da07db07dc07dd07de07df07e007e207e307e407e507e607e707e807e907ea07eb07ec07ed07ee07ef07f007f107f207f307f407f507f607f707f807f907fa07fb07fc07fe07ff080008010802080308040805080608070809080a080b080c080d080e080f081008110812081408150816081708180819081a081b081c081d081e081f0820082108220823082408250826082708280829082a082b082c082d082e082f083008320833083408350836083708380839083a083b083c083d083e083f084008410842084308450846084708480849084a084b084c084e084f085008510852085308540855085708580859085a085b085c085d085e085f086008610862086308640865086708680869086a086b086c086d086e086f087008710872087308750876087708780879087a087b087c087d087e087f0880088108820883088408850886088708880889088a088c088d088e088f089008910892089308940895089608970899089a089b089c089d089e089f08a008a108a208a308a408a508a608a708a808a908aa08ac08ad08ae";
    bytes private constant LEGENDARY_POOL = hex"00040063007e008d009600a600b100b500b800e9010b010d011e014d0151015f0162016401680175018e0191019901cf01e50237024c024d02520270027e02a502a602a702a802aa02bc030303100328032d033e034c0357035d037e03a603ae03c103c303d503ee03f7040d041604270447045704620469049d04a104c904d004d104e8053a057305780579057d05a405b005c105c305d505d605f90626063b063f0650065f06b106be06d106e106f0071b0728073e0760076b0775078607a207ae07b307e107fd0808081308310844084d085608660874088b089808ab";

    address public owner;
    address public agentRegistry; // Binance Agent ID registry (BNB mainnet: 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F)
    bool public freeAgentGate = true; // free lane requires holding a Binance Agent ID
    bool public mintOpen; // false at deploy — owner opens mint manually
    uint256 public deepPrice = 0.0005 ether;
    uint256 public legendaryPrice = 0.01 ether;
    uint256 public freePerWallet = 1;
    uint256 public deepPerWallet = 5;
    uint256 public legendaryPerWallet = 5;
    string public baseURI = "https://kryntar.xyz/nft/metadata/";

    uint256 public standardMinted;
    uint256 public legendaryMinted;
    mapping(address => uint256) public freeCount;
    mapping(address => uint256) public deepCount;
    mapping(address => uint256) public legendaryCount;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Mint(address indexed minter, uint256 indexed tokenId, uint8 lane); // lane: 0 free, 1 deep, 2 legendary
    event MintOpenChanged(bool open);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor(address registry_) { owner = msg.sender; agentRegistry = registry_; }

    // ---------- views ----------
    function totalMinted() public view returns (uint256) { return standardMinted + legendaryMinted; }
    function standardRemaining() public view returns (uint256) { return STANDARD_POOL_SIZE - standardMinted; }
    function legendaryRemaining() public view returns (uint256) { return LEGENDARY_POOL_SIZE - legendaryMinted; }
    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "Nonexistent token");
        return o;
    }
    function balanceOf(address who) public view returns (uint256) {
        require(who != address(0), "Zero address");
        return _balances[who];
    }
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Nonexistent token");
        return string(abi.encodePacked(baseURI, _toString(tokenId), ".json"));
    }
    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Nonexistent token");
        return _tokenApprovals[tokenId];
    }
    function isApprovedForAll(address o, address op) public view returns (bool) { return _operatorApprovals[o][op]; }
    function supportsInterface(bytes4 id) public pure returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd || id == 0x5b5e139f;
    }
    function standardIdAt(uint256 i) public pure returns (uint256) {
        uint256 j = 2 * i;
        return (uint256(uint8(STANDARD_POOL[j])) << 8) | uint256(uint8(STANDARD_POOL[j + 1]));
    }
    function legendaryIdAt(uint256 i) public pure returns (uint256) {
        uint256 j = 2 * i;
        return (uint256(uint8(LEGENDARY_POOL[j])) << 8) | uint256(uint8(LEGENDARY_POOL[j + 1]));
    }

    // ---------- mint ----------
    function mintFree() external {
        require(mintOpen, "Mint closed");
        require(!freeAgentGate || agentRegistry == address(0) || IAgentIdRegistry(agentRegistry).balanceOf(msg.sender) > 0, "Agent ID required");
        require(freeCount[msg.sender] < freePerWallet, "Free limit");
        require(standardMinted < STANDARD_POOL_SIZE, "Standard pool sold out");
        freeCount[msg.sender] += 1;
        uint256 id = standardIdAt(standardMinted);
        standardMinted += 1;
        _mint(msg.sender, id);
        emit Mint(msg.sender, id, 0);
    }
    function mintDeep() external payable {
        require(mintOpen, "Mint closed");
        require(msg.value == deepPrice, "Exact price required");
        require(deepCount[msg.sender] < deepPerWallet, "Deep limit");
        require(standardMinted < STANDARD_POOL_SIZE, "Standard pool sold out");
        deepCount[msg.sender] += 1;
        uint256 id = standardIdAt(standardMinted);
        standardMinted += 1;
        _mint(msg.sender, id);
        emit Mint(msg.sender, id, 1);
    }
    function mintLegendary() external payable {
        require(mintOpen, "Mint closed");
        require(msg.value == legendaryPrice, "Exact price required");
        require(legendaryCount[msg.sender] < legendaryPerWallet, "Legendary limit");
        require(legendaryMinted < LEGENDARY_POOL_SIZE, "Legendary sold out");
        legendaryCount[msg.sender] += 1;
        uint256 id = legendaryIdAt(legendaryMinted);
        legendaryMinted += 1;
        _mint(msg.sender, id);
        emit Mint(msg.sender, id, 2);
    }

    // ---------- ERC-721 transfers ----------
    function approve(address to, uint256 tokenId) public {
        address o = ownerOf(tokenId);
        require(msg.sender == o || isApprovedForAll(o, msg.sender), "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(o, to, tokenId);
    }
    function setApprovalForAll(address op, bool ok) public {
        _operatorApprovals[msg.sender][op] = ok;
        emit ApprovalForAll(msg.sender, op, ok);
    }
    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        require(ownerOf(tokenId) == from, "Wrong from");
        require(to != address(0), "Zero address");
        _tokenApprovals[tokenId] = address(0);
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }
    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        transferFrom(from, to, tokenId);
        require(_checkReceiver(from, to, tokenId, ""), "Bad receiver");
    }
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        transferFrom(from, to, tokenId);
        require(_checkReceiver(from, to, tokenId, data), "Bad receiver");
    }

    // ---------- owner ----------
    function setMintOpen(bool open) external onlyOwner { mintOpen = open; emit MintOpenChanged(open); }
    function setAgentRegistry(address registry_) external onlyOwner { agentRegistry = registry_; }
    function setFreeAgentGate(bool on) external onlyOwner { freeAgentGate = on; }
    function hasAgentId(address who) public view returns (bool) {
        return agentRegistry != address(0) && IAgentIdRegistry(agentRegistry).balanceOf(who) > 0;
    }
    function setPrices(uint256 deep_, uint256 legendary_) external onlyOwner { deepPrice = deep_; legendaryPrice = legendary_; }
    function setCaps(uint256 free_, uint256 deep_, uint256 legendary_) external onlyOwner {
        freePerWallet = free_; deepPerWallet = deep_; legendaryPerWallet = legendary_;
    }
    function setBaseURI(string calldata uri_) external onlyOwner { baseURI = uri_; }
    function transferOwnership(address who) external onlyOwner { require(who != address(0), "Zero address"); owner = who; }
    function withdraw() external onlyOwner {
        uint256 amt = address(this).balance;
        require(amt > 0, "Nothing to withdraw");
        (bool ok, ) = payable(owner).call{value: amt}("");
        require(ok, "Withdraw failed");
    }
    receive() external payable {}

    // ---------- internal ----------
    function _mint(address to, uint256 tokenId) internal {
        require(_owners[tokenId] == address(0), "Already minted");
        _owners[tokenId] = to;
        _balances[to] += 1;
        emit Transfer(address(0), to, tokenId);
    }
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address o = ownerOf(tokenId);
        return spender == o || _tokenApprovals[tokenId] == spender || _operatorApprovals[o][spender];
    }
    function _checkReceiver(address from, address to, uint256 tokenId, bytes memory data) internal returns (bool) {
        if (to.code.length == 0) return true;
        try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 r) {
            return r == IERC721Receiver.onERC721Received.selector;
        } catch { return false; }
    }
    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 n = v; uint256 len;
        while (n > 0) { len++; n /= 10; }
        bytes memory b = new bytes(len);
        while (v > 0) { b[--len] = bytes1(uint8(48 + (v % 10))); v /= 10; }
        return string(b);
    }
}

interface IAgentIdRegistry {
    function balanceOf(address owner) external view returns (uint256);
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

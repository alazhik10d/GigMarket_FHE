pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract GigMarket_FHE is ZamaEthereumConfig {
    
    struct Gig {
        string title;
        euint32 encryptedBid;
        uint256 duration;
        uint256 category;
        string description;
        address creator;
        uint256 timestamp;
        uint32 decryptedBid;
        bool isVerified;
    }
    
    mapping(string => Gig) public gigs;
    string[] public gigIds;
    
    event GigCreated(string indexed gigId, address indexed creator);
    event BidDecryptionVerified(string indexed gigId, uint32 decryptedBid);
    
    constructor() ZamaEthereumConfig() {}
    
    function createGig(
        string calldata gigId,
        string calldata title,
        externalEuint32 encryptedBid,
        bytes calldata inputProof,
        uint256 duration,
        uint256 category,
        string calldata description
    ) external {
        require(bytes(gigs[gigId].title).length == 0, "Gig already exists");
        require(FHE.isInitialized(FHE.fromExternal(encryptedBid, inputProof)), "Invalid encrypted bid");
        
        gigs[gigId] = Gig({
            title: title,
            encryptedBid: FHE.fromExternal(encryptedBid, inputProof),
            duration: duration,
            category: category,
            description: description,
            creator: msg.sender,
            timestamp: block.timestamp,
            decryptedBid: 0,
            isVerified: false
        });
        
        FHE.allowThis(gigs[gigId].encryptedBid);
        FHE.makePubliclyDecryptable(gigs[gigId].encryptedBid);
        
        gigIds.push(gigId);
        emit GigCreated(gigId, msg.sender);
    }
    
    function verifyBidDecryption(
        string calldata gigId,
        bytes memory abiEncodedClearBid,
        bytes memory decryptionProof
    ) external {
        require(bytes(gigs[gigId].title).length > 0, "Gig does not exist");
        require(!gigs[gigId].isVerified, "Bid already verified");
        
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(gigs[gigId].encryptedBid);
        
        FHE.checkSignatures(cts, abiEncodedClearBid, decryptionProof);
        
        uint32 decodedBid = abi.decode(abiEncodedClearBid, (uint32));
        
        gigs[gigId].decryptedBid = decodedBid;
        gigs[gigId].isVerified = true;
        
        emit BidDecryptionVerified(gigId, decodedBid);
    }
    
    function getEncryptedBid(string calldata gigId) external view returns (euint32) {
        require(bytes(gigs[gigId].title).length > 0, "Gig does not exist");
        return gigs[gigId].encryptedBid;
    }
    
    function getGigDetails(string calldata gigId) external view returns (
        string memory title,
        uint256 duration,
        uint256 category,
        string memory description,
        address creator,
        uint256 timestamp,
        bool isVerified,
        uint32 decryptedBid
    ) {
        require(bytes(gigs[gigId].title).length > 0, "Gig does not exist");
        Gig storage gig = gigs[gigId];
        
        return (
            gig.title,
            gig.duration,
            gig.category,
            gig.description,
            gig.creator,
            gig.timestamp,
            gig.isVerified,
            gig.decryptedBid
        );
    }
    
    function getAllGigIds() external view returns (string[] memory) {
        return gigIds;
    }
    
    function filterGigsByBudget(uint32 maxBudget) external view returns (string[] memory) {
        string[] memory filteredIds = new string[](gigIds.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < gigIds.length; i++) {
            if (gigs[gigIds[i]].decryptedBid <= maxBudget) {
                filteredIds[count] = gigIds[i];
                count++;
            }
        }
        
        assembly {
            mstore(filteredIds, count)
        }
        
        return filteredIds;
    }
    
    function isAvailable() public pure returns (bool) {
        return true;
    }
}



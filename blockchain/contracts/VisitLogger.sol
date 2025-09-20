// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title VisitLogger
 * @dev Smart contract for logging and verifying CHW visits
 */
contract VisitLogger is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    struct Visit {
        bytes32 visitHash;          // Hash of visit data
        address chwAddress;         // CHW's wallet address
        uint256 timestamp;          // Visit timestamp
        string patientId;           // Patient identifier (hashed)
        string location;            // GPS coordinates (encrypted)
        bytes signature;            // CHW's digital signature
        bytes32 feedbackHash;       // Hash of patient feedback (optional)
        bool isVerified;            // Verification status
        uint256 blockNumber;        // Block number when logged
    }

    struct CHW {
        string name;
        string licenseNumber;
        bool isActive;
        uint256 totalVisits;
        uint256 registrationTime;
    }

    struct PatientFeedback {
        bytes32 feedbackHash;
        uint256 rating;             // 1-5 stars
        uint256 timestamp;
        bool isSubmitted;
    }

    // Mappings
    mapping(bytes32 => Visit) public visits;
    mapping(address => CHW) public chws;
    mapping(bytes32 => PatientFeedback) public feedbacks;
    mapping(address => bool) public authorizedVerifiers;
    
    // Arrays for enumeration
    bytes32[] public visitIds;
    address[] public chwAddresses;

    // Events
    event VisitLogged(
        bytes32 indexed visitId,
        address indexed chwAddress,
        string patientId,
        uint256 timestamp
    );
    
    event FeedbackSubmitted(
        bytes32 indexed visitId,
        bytes32 indexed feedbackHash,
        uint256 rating
    );
    
    event CHWRegistered(
        address indexed chwAddress,
        string name,
        string licenseNumber
    );
    
    event VisitVerified(
        bytes32 indexed visitId,
        address indexed verifier
    );

    // Modifiers
    modifier onlyRegisteredCHW() {
        require(chws[msg.sender].isActive, "CHW not registered or inactive");
        _;
    }

    modifier onlyAuthorizedVerifier() {
        require(
            authorizedVerifiers[msg.sender] || msg.sender == owner(),
            "Not authorized to verify visits"
        );
        _;
    }

    modifier visitExists(bytes32 _visitId) {
        require(visits[_visitId].timestamp != 0, "Visit does not exist");
        _;
    }

    constructor() {
        // Owner is automatically an authorized verifier
        authorizedVerifiers[msg.sender] = true;
    }

    /**
     * @dev Register a new CHW
     */
    function registerCHW(
        address _chwAddress,
        string memory _name,
        string memory _licenseNumber
    ) external onlyOwner {
        require(_chwAddress != address(0), "Invalid CHW address");
        require(!chws[_chwAddress].isActive, "CHW already registered");

        chws[_chwAddress] = CHW({
            name: _name,
            licenseNumber: _licenseNumber,
            isActive: true,
            totalVisits: 0,
            registrationTime: block.timestamp
        });

        chwAddresses.push(_chwAddress);
        emit CHWRegistered(_chwAddress, _name, _licenseNumber);
    }

    /**
     * @dev Log a new visit
     */
    function logVisit(
        string memory _patientId,
        string memory _location,
        bytes memory _signature,
        uint256 _visitTimestamp
    ) external onlyRegisteredCHW nonReentrant {
        // Generate unique visit ID
        bytes32 visitId = keccak256(
            abi.encodePacked(
                msg.sender,
                _patientId,
                _visitTimestamp,
                block.timestamp
            )
        );

        // Create visit hash for integrity verification
        bytes32 visitHash = keccak256(
            abi.encodePacked(
                msg.sender,
                _patientId,
                _location,
                _visitTimestamp
            )
        );

        // Verify signature
        bytes32 messageHash = visitHash.toEthSignedMessageHash();
        address signer = messageHash.recover(_signature);
        require(signer == msg.sender, "Invalid signature");

        // Store visit
        visits[visitId] = Visit({
            visitHash: visitHash,
            chwAddress: msg.sender,
            timestamp: _visitTimestamp,
            patientId: _patientId,
            location: _location,
            signature: _signature,
            feedbackHash: bytes32(0),
            isVerified: false,
            blockNumber: block.number
        });

        visitIds.push(visitId);
        chws[msg.sender].totalVisits++;

        emit VisitLogged(visitId, msg.sender, _patientId, _visitTimestamp);
    }

    /**
     * @dev Submit patient feedback for a visit
     */
    function submitFeedback(
        bytes32 _visitId,
        bytes32 _feedbackHash,
        uint256 _rating
    ) external visitExists(_visitId) {
        require(_rating >= 1 && _rating <= 5, "Rating must be between 1-5");
        require(
            visits[_visitId].feedbackHash == bytes32(0),
            "Feedback already submitted"
        );

        visits[_visitId].feedbackHash = _feedbackHash;
        
        feedbacks[_feedbackHash] = PatientFeedback({
            feedbackHash: _feedbackHash,
            rating: _rating,
            timestamp: block.timestamp,
            isSubmitted: true
        });

        emit FeedbackSubmitted(_visitId, _feedbackHash, _rating);
    }

    /**
     * @dev Verify a visit (admin function)
     */
    function verifyVisit(bytes32 _visitId) 
        external 
        onlyAuthorizedVerifier 
        visitExists(_visitId) 
    {
        visits[_visitId].isVerified = true;
        emit VisitVerified(_visitId, msg.sender);
    }

    /**
     * @dev Add authorized verifier
     */
    function addAuthorizedVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = true;
    }

    /**
     * @dev Remove authorized verifier
     */
    function removeAuthorizedVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = false;
    }

    /**
     * @dev Deactivate CHW
     */
    function deactivateCHW(address _chwAddress) external onlyOwner {
        chws[_chwAddress].isActive = false;
    }

    /**
     * @dev Get visit details
     */
    function getVisit(bytes32 _visitId) 
        external 
        view 
        returns (Visit memory) 
    {
        return visits[_visitId];
    }

    /**
     * @dev Get CHW details
     */
    function getCHW(address _chwAddress) 
        external 
        view 
        returns (CHW memory) 
    {
        return chws[_chwAddress];
    }

    /**
     * @dev Get total number of visits
     */
    function getTotalVisits() external view returns (uint256) {
        return visitIds.length;
    }

    /**
     * @dev Get total number of CHWs
     */
    function getTotalCHWs() external view returns (uint256) {
        return chwAddresses.length;
    }

    /**
     * @dev Get visits by CHW (paginated)
     */
    function getVisitsByCHW(
        address _chwAddress,
        uint256 _offset,
        uint256 _limit
    ) external view returns (bytes32[] memory) {
        require(_limit <= 100, "Limit too high");
        
        bytes32[] memory result = new bytes32[](_limit);
        uint256 count = 0;
        uint256 index = 0;

        for (uint256 i = 0; i < visitIds.length && count < _limit; i++) {
            if (visits[visitIds[i]].chwAddress == _chwAddress) {
                if (index >= _offset) {
                    result[count] = visitIds[i];
                    count++;
                }
                index++;
            }
        }

        // Resize array to actual count
        bytes32[] memory finalResult = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }

        return finalResult;
    }

    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        // Implementation for emergency pause if needed
    }
}

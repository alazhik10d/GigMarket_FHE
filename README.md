# Confidential Gig Market

Confidential Gig Market is a privacy-preserving gig platform that leverages Zama's Fully Homomorphic Encryption (FHE) technology to ensure secure negotiations and offers between employers and freelancers. With our solution, employers can filter candidates based on budget while keeping their bidding intentions hidden, protecting their negotiation power and fostering a competitive yet fair market environment.

## The Problem

In a traditional gig market, sensitive data such as budget ranges and bidding offers can expose both employers and freelancers to unfair competition, price manipulation, and other privacy risks. With cleartext data flowing freely, parties may unintentionally reveal their strategies, leading to undesirable outcomes. This lack of privacy undermines trust and equity in hiring practices and can ultimately stifle innovation within the gig economy.

## The Zama FHE Solution

Fully Homomorphic Encryption (FHE) allows computations to be performed on encrypted data without needing to decrypt it first. This revolutionary capability ensures that sensitive information remains confidential throughout the entire negotiation process. By utilizing Zama's libraries, **Computation on encrypted data** becomes not only possible but practical. 

Using **fhevm**, we can securely process encrypted inputs, allowing employers to assess bids while keeping their maximum budget and bidding strategies concealed. This empowers all participants to engage without fear of information leakage, fostering a healthier gig ecosystem.

## Key Features

- 🔒 **Encrypted Bidding**: Employers can receive and evaluate bids without revealing their budget.
- 🤝 **Fair Negotiation**: Protects the interests of both parties by maintaining confidentiality.
- 📊 **Flexible Contracting**: Supports dynamic engagements tailored to project requirements.
- ✅ **Transparent Operations**: Employers and freelancers can trust the integrity of the platform, knowing their data is secure.
- 🛡️ **Privacy-First Design**: Every feature is built with user privacy as the primary goal.

## Technical Architecture & Stack

The Confidential Gig Market is built on a robust architecture that prioritizes privacy and usability:

- **Frontend**: User-friendly interface to access gig listings, bid on jobs, and manage profiles.
- **Smart Contracts**: Utilizing Zama's **fhevm** to conduct secure transactions and manage gig interactions.
- **Backend Services**: Handles user requests, bid evaluations, and data storage.
- **Cryptography Layer**: Built entirely on Zama's technology stack, including **Concrete ML** and **TFHE-rs**, ensuring encrypted data handling.

## Smart Contract / Core Logic

Here's a simplified Solidity snippet outlining how bids are processed securely with FHE:solidity
pragma solidity ^0.8.0;

contract GigMarket {
    struct Bid {
        uint64 amount; // Encrypted amount
        address freelancer; // Address of the freelancer
    }

    Bid[] public bids;

    function submitBid(uint64 encryptedAmount) public {
        Bid memory newBid = Bid({
            amount: encryptedAmount,
            freelancer: msg.sender
        });
        bids.push(newBid);
    }

    function evaluateBids(uint64 maxBudget) public view returns (address[] memory) {
        address[] memory qualifiedFreelancers;
        // Logic for evaluating which bids are below the max budget using Zama's FHE capabilities
        return qualifiedFreelancers;
    }
}

In the pseudocode above, the `submitBid` function allows freelancers to submit their encrypted bids, while `evaluateBids` assesses which bids fall within a specified budget, leveraging FHE techniques to maintain privacy.

## Directory Structure

Below is the structure of the project to help you navigate easily:
ConfidentialGigMarket/
├── contracts/
│   └── GigMarket.sol
├── scripts/
│   └── main.py
├── tests/
│   └── test_gig_market.py
├── frontend/
│   ├── index.html
│   └── app.js
└── README.md

## Installation & Setup

### Prerequisites

To set up the Confidential Gig Market, ensure you have the following installed:

- Node.js (for frontend and smart contracts)
- Python (for backend scripts)

### Dependencies

Install the necessary dependencies for the project:bash
npm install fhevm
pip install concrete-ml

## Build & Run

To compile the smart contracts, use the following command:bash
npx hardhat compile

To run the backend script, execute:bash
python main.py

Make sure to follow any additional instructions provided in the respective files to ensure a smooth setup.

## Acknowledgements

We would like to extend our gratitude to Zama for providing the open-source FHE primitives that make this project possible. Their commitment to privacy and security has been instrumental in enabling the Confidential Gig Market to flourish in a safe, encryption-powered environment.

---

By prioritizing user privacy and security through advanced encryption techniques, Confidential Gig Market redefines the gig economy, offering a trustworthy and confidential platform where freelancers and employers can transact with peace of mind. Join us in revolutionizing the way gig work is approached!



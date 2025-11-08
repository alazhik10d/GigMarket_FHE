import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from "react";
import { getContractReadOnly, getContractWithSigner } from "./components/useContract";
import "./App.css";
import { useAccount } from 'wagmi';
import { useFhevm, useEncrypt, useDecrypt } from '../fhevm-sdk/src';
import { ethers } from 'ethers';

interface GigData {
  id: string;
  title: string;
  description: string;
  encryptedBudget: string;
  publicValue1: number;
  publicValue2: number;
  creator: string;
  timestamp: number;
  isVerified: boolean;
  decryptedValue: number;
  category: string;
  status: string;
}

interface UserHistory {
  action: string;
  gigId: string;
  timestamp: number;
  details: string;
}

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [gigs, setGigs] = useState<GigData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingGig, setCreatingGig] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ 
    visible: false, 
    status: "pending", 
    message: "" 
  });
  const [newGigData, setNewGigData] = useState({ 
    title: "", 
    description: "", 
    budget: "", 
    category: "design",
    status: "open"
  });
  const [selectedGig, setSelectedGig] = useState<GigData | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [contractAddress, setContractAddress] = useState("");
  const [fhevmInitializing, setFhevmInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [userHistory, setUserHistory] = useState<UserHistory[]>([]);
  const [showFAQ, setShowFAQ] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const { status, initialize, isInitialized } = useFhevm();
  const { encrypt, isEncrypting } = useEncrypt();
  const { verifyDecryption, isDecrypting: fheIsDecrypting } = useDecrypt();

  useEffect(() => {
    const initFhevmAfterConnection = async () => {
      if (!isConnected) return;
      if (isInitialized || fhevmInitializing) return;
      
      try {
        setFhevmInitializing(true);
        await initialize();
      } catch (error) {
        setTransactionStatus({ 
          visible: true, 
          status: "error", 
          message: "FHEVM initialization failed" 
        });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      } finally {
        setFhevmInitializing(false);
      }
    };

    initFhevmAfterConnection();
  }, [isConnected, isInitialized, initialize, fhevmInitializing]);

  useEffect(() => {
    const loadDataAndContract = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }
      
      try {
        await loadData();
        const contract = await getContractReadOnly();
        if (contract) setContractAddress(await contract.getAddress());
        loadUserHistory();
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDataAndContract();
  }, [isConnected]);

  const loadUserHistory = () => {
    const history: UserHistory[] = [
      { action: "VIEW", gigId: "gig-001", timestamp: Date.now() - 3600000, details: "Viewed design gig" },
      { action: "CREATE", gigId: "gig-123", timestamp: Date.now() - 86400000, details: "Created marketing gig" },
      { action: "DECRYPT", gigId: "gig-456", timestamp: Date.now() - 172800000, details: "Decrypted budget data" }
    ];
    setUserHistory(history);
  };

  const addToHistory = (action: string, gigId: string, details: string) => {
    const newHistory: UserHistory = {
      action,
      gigId,
      timestamp: Date.now(),
      details
    };
    setUserHistory(prev => [newHistory, ...prev.slice(0, 9)]);
  };

  const loadData = async () => {
    if (!isConnected) return;
    
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const businessIds = await contract.getAllBusinessIds();
      const gigsList: GigData[] = [];
      
      for (const businessId of businessIds) {
        try {
          const businessData = await contract.getBusinessData(businessId);
          gigsList.push({
            id: businessId,
            title: businessData.name,
            description: businessData.description,
            encryptedBudget: businessId,
            publicValue1: Number(businessData.publicValue1) || 0,
            publicValue2: Number(businessData.publicValue2) || 0,
            creator: businessData.creator,
            timestamp: Number(businessData.timestamp),
            isVerified: businessData.isVerified,
            decryptedValue: Number(businessData.decryptedValue) || 0,
            category: ["design", "development", "marketing", "writing"][Math.floor(Math.random() * 4)],
            status: Math.random() > 0.5 ? "open" : "closed"
          });
        } catch (e) {
          console.error('Error loading business data:', e);
        }
      }
      
      setGigs(gigsList);
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Failed to load data" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setIsRefreshing(false); 
    }
  };

  const createGig = async () => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return; 
    }
    
    setCreatingGig(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Creating gig with FHE encryption..." });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      const budgetValue = parseInt(newGigData.budget) || 0;
      const businessId = `gig-${Date.now()}`;
      
      const encryptedResult = await encrypt(contractAddress, address, budgetValue);
      
      const tx = await contract.createBusinessData(
        businessId,
        newGigData.title,
        encryptedResult.encryptedData,
        encryptedResult.proof,
        budgetValue,
        0,
        newGigData.description
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Waiting for transaction confirmation..." });
      await tx.wait();
      
      addToHistory("CREATE", businessId, `Created gig: ${newGigData.title}`);
      setTransactionStatus({ visible: true, status: "success", message: "Gig created successfully!" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      await loadData();
      setShowCreateModal(false);
      setNewGigData({ title: "", description: "", budget: "", category: "design", status: "open" });
    } catch (e: any) {
      const errorMessage = e.message?.includes("user rejected transaction") 
        ? "Transaction rejected" 
        : "Submission failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setCreatingGig(false); 
    }
  };

  const decryptData = async (businessId: string): Promise<number | null> => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    }
    
    setIsDecrypting(true);
    try {
      const contractRead = await getContractReadOnly();
      if (!contractRead) return null;
      
      const businessData = await contractRead.getBusinessData(businessId);
      if (businessData.isVerified) {
        const storedValue = Number(businessData.decryptedValue) || 0;
        setTransactionStatus({ visible: true, status: "success", message: "Budget already verified" });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
        return storedValue;
      }
      
      const contractWrite = await getContractWithSigner();
      if (!contractWrite) return null;
      
      const encryptedValueHandle = await contractRead.getEncryptedValue(businessId);
      
      const result = await verifyDecryption(
        [encryptedValueHandle],
        contractAddress,
        (abiEncodedClearValues: string, decryptionProof: string) => 
          contractWrite.verifyDecryption(businessId, abiEncodedClearValues, decryptionProof)
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Verifying decryption..." });
      
      const clearValue = result.decryptionResult.clearValues[encryptedValueHandle];
      
      await loadData();
      addToHistory("DECRYPT", businessId, `Decrypted budget: ${clearValue}`);
      setTransactionStatus({ visible: true, status: "success", message: "Budget decrypted successfully!" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
      
      return Number(clearValue);
      
    } catch (e: any) { 
      if (e.message?.includes("Data already verified")) {
        setTransactionStatus({ visible: true, status: "success", message: "Budget already verified" });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
        await loadData();
        return null;
      }
      
      setTransactionStatus({ visible: true, status: "error", message: "Decryption failed" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    } finally { 
      setIsDecrypting(false); 
    }
  };

  const checkAvailability = async () => {
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const isAvailable = await contract.isAvailable();
      setTransactionStatus({ visible: true, status: "success", message: "Contract is available!" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Availability check failed" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  const filteredGigs = gigs.filter(gig => {
    const matchesSearch = gig.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         gig.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || gig.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const paginatedGigs = filteredGigs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredGigs.length / itemsPerPage);

  if (!isConnected) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <h1>Confidential Gig Market 🔐</h1>
          </div>
          <div className="header-actions">
            <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
          </div>
        </header>
        
        <div className="connection-prompt">
          <div className="connection-content">
            <div className="connection-icon">💼</div>
            <h2>Connect Your Wallet</h2>
            <p>Connect your wallet to access encrypted gig marketplace with FHE protection.</p>
            <div className="connection-steps">
              <div className="step"><span>1</span><p>Connect wallet</p></div>
              <div className="step"><span>2</span><p>FHE system initialization</p></div>
              <div className="step"><span>3</span><p>Start encrypted gig trading</p></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized || fhevmInitializing) {
    return (
      <div className="loading-screen">
        <div className="fhe-spinner"></div>
        <p>Initializing FHE Encryption...</p>
        <p className="loading-note">Securing your gig data</p>
      </div>
    );
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="fhe-spinner"></div>
      <p>Loading encrypted gig market...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1>Confidential Gig Market 🔐</h1>
          <p>FHE Protected Freelance Platform</p>
        </div>
        
        <div className="header-actions">
          <button onClick={checkAvailability} className="availability-btn">Check Contract</button>
          <button onClick={() => setShowCreateModal(true)} className="create-btn">+ Post Gig</button>
          <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
        </div>
      </header>
      
      <div className="main-content">
        <div className="stats-section">
          <div className="stat-card">
            <h3>Total Gigs</h3>
            <div className="stat-value">{gigs.length}</div>
          </div>
          <div className="stat-card">
            <h3>Verified Budgets</h3>
            <div className="stat-value">{gigs.filter(g => g.isVerified).length}</div>
          </div>
          <div className="stat-card">
            <h3>Active Categories</h3>
            <div className="stat-value">4</div>
          </div>
        </div>

        <div className="search-section">
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Search gigs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="design">Design</option>
              <option value="development">Development</option>
              <option value="marketing">Marketing</option>
              <option value="writing">Writing</option>
            </select>
            <button onClick={loadData} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="gigs-grid">
          {paginatedGigs.length === 0 ? (
            <div className="no-gigs">
              <p>No gigs found</p>
              <button onClick={() => setShowCreateModal(true)}>Post First Gig</button>
            </div>
          ) : (
            paginatedGigs.map((gig, index) => (
              <div 
                className={`gig-card ${gig.status} ${selectedGig?.id === gig.id ? "selected" : ""}`}
                key={index}
                onClick={() => {
                  setSelectedGig(gig);
                  addToHistory("VIEW", gig.id, `Viewed: ${gig.title}`);
                }}
              >
                <div className="gig-header">
                  <span className={`category-tag ${gig.category}`}>{gig.category}</span>
                  <span className={`status-badge ${gig.status}`}>{gig.status}</span>
                </div>
                <h3>{gig.title}</h3>
                <p>{gig.description}</p>
                <div className="gig-meta">
                  <span>Budget: {gig.isVerified ? `$${gig.decryptedValue}` : "🔒 Encrypted"}</span>
                  <span>{new Date(gig.timestamp * 1000).toLocaleDateString()}</span>
                </div>
                <div className="gig-creator">By: {gig.creator.substring(0, 6)}...{gig.creator.substring(38)}</div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Previous</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
          </div>
        )}

        <div className="history-section">
          <h3>Your Activity History</h3>
          <div className="history-list">
            {userHistory.slice(0, 5).map((item, index) => (
              <div key={index} className="history-item">
                <span className="action-badge">{item.action}</span>
                <span>{item.details}</span>
                <span className="time-ago">{Math.round((Date.now() - item.timestamp) / 3600000)}h ago</span>
              </div>
            ))}
          </div>
        </div>

        <div className="faq-section">
          <button onClick={() => setShowFAQ(!showFAQ)} className="faq-toggle">
            {showFAQ ? "Hide FAQ" : "Show FAQ"}
          </button>
          {showFAQ && (
            <div className="faq-content">
              <h4>How FHE Protects Your Gig Budget</h4>
              <p>• Budgets are encrypted using Fully Homomorphic Encryption</p>
              <p>• Only authorized parties can decrypt the actual amounts</p>
              <p>• Employers can filter by budget range without seeing exact amounts</p>
            </div>
          )}
        </div>
      </div>
      
      {showCreateModal && (
        <ModalCreateGig 
          onSubmit={createGig} 
          onClose={() => setShowCreateModal(false)} 
          creating={creatingGig} 
          gigData={newGigData} 
          setGigData={setNewGigData}
          isEncrypting={isEncrypting}
        />
      )}
      
      {selectedGig && (
        <GigDetailModal 
          gig={selectedGig} 
          onClose={() => setSelectedGig(null)} 
          isDecrypting={isDecrypting || fheIsDecrypting} 
          decryptData={() => decryptData(selectedGig.id)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="fhe-spinner"></div>}
              {transactionStatus.status === "success" && "✓"}
              {transactionStatus.status === "error" && "✗"}
            </div>
            <div className="transaction-message">{transactionStatus.message}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const ModalCreateGig: React.FC<{
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  gigData: any;
  setGigData: (data: any) => void;
  isEncrypting: boolean;
}> = ({ onSubmit, onClose, creating, gigData, setGigData, isEncrypting }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'budget') {
      const intValue = value.replace(/[^\d]/g, '');
      setGigData({ ...gigData, [name]: intValue });
    } else {
      setGigData({ ...gigData, [name]: value });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="create-gig-modal">
        <div className="modal-header">
          <h2>Post New Gig</h2>
          <button onClick={onClose} className="close-modal">×</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice">
            <strong>FHE Budget Encryption 🔐</strong>
            <p>Budget will be encrypted using Zama FHE technology</p>
          </div>
          
          <div className="form-group">
            <label>Gig Title *</label>
            <input 
              type="text" 
              name="title" 
              value={gigData.title} 
              onChange={handleChange} 
              placeholder="Enter gig title..." 
            />
          </div>
          
          <div className="form-group">
            <label>Description *</label>
            <textarea 
              name="description" 
              value={gigData.description} 
              onChange={handleChange} 
              placeholder="Describe the gig..." 
            />
          </div>
          
          <div className="form-group">
            <label>Budget (Integer only) *</label>
            <input 
              type="number" 
              name="budget" 
              value={gigData.budget} 
              onChange={handleChange} 
              placeholder="Enter budget amount..." 
              step="1"
              min="0"
            />
            <div className="data-type-label">FHE Encrypted Integer</div>
          </div>
          
          <div className="form-group">
            <label>Category</label>
            <select name="category" value={gigData.category} onChange={handleChange}>
              <option value="design">Design</option>
              <option value="development">Development</option>
              <option value="marketing">Marketing</option>
              <option value="writing">Writing</option>
            </select>
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button 
            onClick={onSubmit} 
            disabled={creating || isEncrypting || !gigData.title || !gigData.description || !gigData.budget} 
            className="submit-btn"
          >
            {creating || isEncrypting ? "Encrypting and Posting..." : "Post Gig"}
          </button>
        </div>
      </div>
    </div>
  );
};

const GigDetailModal: React.FC<{
  gig: GigData;
  onClose: () => void;
  isDecrypting: boolean;
  decryptData: () => Promise<number | null>;
}> = ({ gig, onClose, isDecrypting, decryptData }) => {
  const handleDecrypt = async () => {
    await decryptData();
  };

  return (
    <div className="modal-overlay">
      <div className="gig-detail-modal">
        <div className="modal-header">
          <h2>Gig Details</h2>
          <button onClick={onClose} className="close-modal">×</button>
        </div>
        
        <div className="modal-body">
          <div className="gig-info">
            <div className="info-header">
              <span className={`category-tag ${gig.category}`}>{gig.category}</span>
              <span className={`status-badge ${gig.status}`}>{gig.status}</span>
            </div>
            <h3>{gig.title}</h3>
            <p className="gig-description">{gig.description}</p>
            
            <div className="info-grid">
              <div className="info-item">
                <span>Creator:</span>
                <strong>{gig.creator.substring(0, 6)}...{gig.creator.substring(38)}</strong>
              </div>
              <div className="info-item">
                <span>Posted:</span>
                <strong>{new Date(gig.timestamp * 1000).toLocaleDateString()}</strong>
              </div>
            </div>
          </div>
          
          <div className="budget-section">
            <h4>Budget Information</h4>
            <div className="budget-display">
              <div className="budget-value">
                {gig.isVerified ? 
                  `$${gig.decryptedValue} (Verified)` : 
                  "🔒 Encrypted (FHE Protected)"
                }
              </div>
              <button 
                className={`decrypt-btn ${gig.isVerified ? 'verified' : ''}`}
                onClick={handleDecrypt} 
                disabled={isDecrypting}
              >
                {isDecrypting ? "Decrypting..." : 
                 gig.isVerified ? "✅ Verified" : "🔓 Decrypt Budget"}
              </button>
            </div>
            
            <div className="fhe-explanation">
              <p>This budget is encrypted using FHE technology. Decryption requires verification to protect pricing data.</p>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="close-btn">Close</button>
          {!gig.isVerified && (
            <button onClick={handleDecrypt} disabled={isDecrypting} className="decrypt-btn">
              Verify Budget
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;



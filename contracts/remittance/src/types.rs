//! Type definitions for the remittance contract

use soroban_sdk::{contracttype, Address, Bytes, String, Vec, Env};

/// Unique identifier for remittance transactions
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RemittanceId(pub Bytes);

impl RemittanceId {
    pub fn new(env: &Env) -> Self {
        // Generate unique ID using current ledger sequence + timestamp
        let ledger = env.ledger().sequence();
        let timestamp = env.ledger().timestamp();
        let contract_addr = env.current_contract_address();
        
        let mut id_data = Bytes::new(env);
        id_data.extend_from_array(&ledger.to_be_bytes());
        id_data.extend_from_array(&timestamp.to_be_bytes());
        id_data.extend_from_slice(&contract_addr.to_string().as_bytes()[..8]);
        
        RemittanceId(id_data)
    }
}

/// Status of a remittance transaction
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RemittanceStatus {
    Pending,
    Completed,
    Failed,
    Cancelled,
}

/// Complete remittance transaction data
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RemittanceData {
    pub id: RemittanceId,
    pub sender: Address,
    pub recipient: Address,
    pub send_asset: Address,
    pub dest_asset: Address,
    pub send_amount: i128,
    pub dest_amount: i128,
    pub corridor_id: String,
    pub status: RemittanceStatus,
    pub created_at: u64,
    pub path: Vec<Address>, // Asset addresses in payment path
    pub compliance_verified: bool,
}

/// Payment path information
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentPath {
    pub path: Vec<Address>, // Asset addresses
    pub dest_amount: i128,  // Expected destination amount
    pub exchange_rate: i128, // Effective exchange rate (scaled by 1e7)
}

/// Corridor configuration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CorridorInfo {
    pub id: String,
    pub name: String,
    pub source_country: String,
    pub dest_country: String,
    pub source_currency: String,
    pub dest_currency: String,
    pub send_asset: Address,
    pub dest_asset: Address,
    pub min_amount: i128,
    pub max_amount: i128,
    pub fee_rate: i128, // Fee rate in basis points (1/10000)
    pub anchor_send: Address,
    pub anchor_receive: Address,
    pub active: bool,
}

/// Compliance verification result
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ComplianceResult {
    pub verified: bool,
    pub risk_score: u32, // 0-100, lower is better
    pub sanctions_clear: bool,
    pub kyc_level: KycLevel,
    pub expires_at: u64,
}

/// KYC verification levels
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum KycLevel {
    None,
    Basic,    // Email + phone verification
    Enhanced, // Government ID verification  
    Premium,  // Full KYC with document verification
}

/// Zero-knowledge proof for compliance
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ZkProof {
    pub proof_data: Bytes,
    pub public_inputs: Vec<Bytes>,
    pub verification_key: Bytes,
    pub proof_type: ProofType,
}

/// Types of zero-knowledge proofs supported
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProofType {
    KycVerification,    // Proves KYC status without revealing identity
    SanctionsCheck,     // Proves not on sanctions list
    AgeVerification,    // Proves age requirements without revealing age
    ResidencyProof,     // Proves residency without revealing address
}

/// Transaction metrics for analytics
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransactionMetrics {
    pub total_volume: i128,
    pub total_transactions: u64,
    pub average_amount: i128,
    pub success_rate: u32, // Percentage (0-10000 for basis points)
    pub corridors_active: u32,
}

/// Anchor service information
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AnchorInfo {
    pub address: Address,
    pub name: String,
    pub country: String,
    pub currencies: Vec<String>,
    pub kyc_required: bool,
    pub min_amount: i128,
    pub max_amount: i128,
    pub processing_time: u32, // Minutes
    pub fee_fixed: i128,
    pub fee_percent: i128, // Basis points
    pub active: bool,
}
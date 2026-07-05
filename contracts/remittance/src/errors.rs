//! Error definitions for the remittance contract

use soroban_sdk::{contracttype, contracterror};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RemittanceError {
    // Initialization errors (1000-1099)
    AlreadyInitialized = 1000,
    NotInitialized = 1001,
    
    // Authentication/Authorization errors (1100-1199)  
    Unauthorized = 1100,
    AdminOnly = 1101,
    
    // Validation errors (1200-1299)
    InvalidAmount = 1200,
    InvalidAddress = 1201,
    InvalidAsset = 1202,
    InvalidCorridor = 1203,
    InvalidProof = 1204,
    
    // Business logic errors (1300-1399)
    InsufficientBalance = 1300,
    AmountTooLow = 1301,
    AmountTooHigh = 1302,
    CorridorNotActive = 1303,
    PathNotFound = 1304,
    SlippageTooHigh = 1305,
    
    // Compliance errors (1400-1499)
    ComplianceCheckFailed = 1400,
    ComplianceExpired = 1401,
    KycRequired = 1402,
    SanctionsViolation = 1403,
    RiskTooHigh = 1404,
    
    // State errors (1500-1599)
    RemittanceNotFound = 1500,
    InvalidStatus = 1501,
    AlreadyProcessed = 1502,
    
    // External service errors (1600-1699)
    AnchorUnavailable = 1600,
    PathfinderError = 1601,
    ComplianceServiceError = 1602,
    
    // System errors (1700-1799)
    InternalError = 1700,
    ContractPaused = 1701,
    MaintenanceMode = 1702,
}
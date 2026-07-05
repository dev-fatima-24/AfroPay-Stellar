//! Storage utilities for the remittance contract

use soroban_sdk::{Env, Address, Vec, Map};
use crate::types::{RemittanceId, RemittanceData, CorridorInfo};
use crate::errors::RemittanceError;

/// Storage keys
const ADMIN_KEY: &str = "ADMIN";
const COMPLIANCE_CONTRACT_KEY: &str = "COMPLIANCE";
const ANCHOR_REGISTRY_KEY: &str = "ANCHORS";
const PATHFINDER_CONTRACT_KEY: &str = "PATHFINDER";
const REMITTANCE_PREFIX: &str = "REM";
const SENDER_INDEX_PREFIX: &str = "SENDER";
const CORRIDORS_KEY: &str = "CORRIDORS";
const METRICS_KEY: &str = "METRICS";

/// Check if admin is set
pub fn has_admin(env: &Env) -> bool {
    env.storage().instance().has(&ADMIN_KEY)
}

/// Set contract admin
pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&ADMIN_KEY, admin);
}

/// Get contract admin
pub fn get_admin(env: &Env) -> Result<Address, RemittanceError> {
    env.storage()
        .instance()
        .get(&ADMIN_KEY)
        .ok_or(RemittanceError::NotInitialized)
}

/// Set compliance contract address
pub fn set_compliance_contract(env: &Env, contract: &Address) {
    env.storage().instance().set(&COMPLIANCE_CONTRACT_KEY, contract);
}

/// Get compliance contract address
pub fn get_compliance_contract(env: &Env) -> Result<Address, RemittanceError> {
    env.storage()
        .instance()
        .get(&COMPLIANCE_CONTRACT_KEY)
        .ok_or(RemittanceError::NotInitialized)
}

/// Set anchor registry contract address
pub fn set_anchor_registry(env: &Env, contract: &Address) {
    env.storage().instance().set(&ANCHOR_REGISTRY_KEY, contract);
}

/// Get anchor registry contract address
pub fn get_anchor_registry(env: &Env) -> Result<Address, RemittanceError> {
    env.storage()
        .instance()
        .get(&ANCHOR_REGISTRY_KEY)
        .ok_or(RemittanceError::NotInitialized)
}

/// Set pathfinder contract address
pub fn set_pathfinder_contract(env: &Env, contract: &Address) {
    env.storage().instance().set(&PATHFINDER_CONTRACT_KEY, contract);
}

/// Get pathfinder contract address
pub fn get_pathfinder_contract(env: &Env) -> Result<Address, RemittanceError> {
    env.storage()
        .instance()
        .get(&PATHFINDER_CONTRACT_KEY)
        .ok_or(RemittanceError::NotInitialized)
}

/// Store remittance data
pub fn set_remittance(env: &Env, id: &RemittanceId, remittance: &RemittanceData) {
    let key = format!("{}_{}", REMITTANCE_PREFIX, hex::encode(&id.0));
    env.storage().persistent().set(&key, remittance);
    
    // Update sender index
    add_to_sender_index(env, &remittance.sender, id);
}

/// Get remittance data
pub fn get_remittance(env: &Env, id: &RemittanceId) -> Result<RemittanceData, RemittanceError> {
    let key = format!("{}_{}", REMITTANCE_PREFIX, hex::encode(&id.0));
    env.storage()
        .persistent()
        .get(&key)
        .ok_or(RemittanceError::RemittanceNotFound)
}

/// Add remittance ID to sender's index
fn add_to_sender_index(env: &Env, sender: &Address, remittance_id: &RemittanceId) {
    let key = format!("{}_{}", SENDER_INDEX_PREFIX, sender.to_string());
    let mut remittance_ids: Vec<RemittanceId> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    
    remittance_ids.push_back(remittance_id.clone());
    env.storage().persistent().set(&key, &remittance_ids);
}

/// Get remittances for a sender
pub fn get_sender_remittances(
    env: &Env, 
    sender: &Address, 
    limit: u32
) -> Vec<RemittanceData> {
    let key = format!("{}_{}", SENDER_INDEX_PREFIX, sender.to_string());
    let remittance_ids: Vec<RemittanceId> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    
    let mut remittances = Vec::new(env);
    let mut count = 0u32;
    
    // Get most recent remittances (iterate backwards)
    let total = remittance_ids.len();
    let start_idx = if total > limit { total - limit } else { 0 };
    
    for i in (start_idx..total).rev() {
        if count >= limit {
            break;
        }
        
        if let Some(id) = remittance_ids.get(i) {
            if let Ok(remittance) = get_remittance(env, &id) {
                remittances.push_back(remittance);
                count += 1;
            }
        }
    }
    
    remittances
}

/// Set available corridors
pub fn set_corridors(env: &Env, corridors: &Vec<CorridorInfo>) {
    env.storage().instance().set(&CORRIDORS_KEY, corridors);
}

/// Get available corridors
pub fn get_corridors(env: &Env) -> Vec<CorridorInfo> {
    env.storage()
        .instance()
        .get(&CORRIDORS_KEY)
        .unwrap_or_else(|| Vec::new(env))
}

/// Add a new corridor
pub fn add_corridor(env: &Env, corridor: &CorridorInfo) {
    let mut corridors = get_corridors(env);
    corridors.push_back(corridor.clone());
    set_corridors(env, &corridors);
}

/// Helper function to convert bytes to hex string (placeholder implementation)
mod hex {
    use soroban_sdk::Bytes;
    
    pub fn encode(bytes: &Bytes) -> String {
        // Simplified hex encoding for storage keys
        // In production, use a proper hex encoding library
        format!("{:?}", bytes)
    }
}
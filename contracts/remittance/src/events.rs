//! Event definitions for the remittance contract

use soroban_sdk::{Env, Address, String, Symbol, symbol_short};
use crate::types::{RemittanceData, CorridorInfo};

/// Emit contract initialization event
pub fn emit_contract_initialized(env: &Env, admin: &Address) {
    env.events().publish(
        (symbol_short!("INIT"),),
        (admin,)
    );
}

/// Emit remittance creation event
pub fn emit_remittance_created(env: &Env, remittance: &RemittanceData) {
    env.events().publish(
        (symbol_short!("CREATE"), &remittance.sender),
        (
            &remittance.id,
            &remittance.recipient,
            &remittance.corridor_id,
            &remittance.send_amount,
            &remittance.dest_amount,
        )
    );
}

/// Emit remittance completion event
pub fn emit_remittance_completed(env: &Env, remittance: &RemittanceData) {
    env.events().publish(
        (symbol_short!("COMPLETE"), &remittance.sender),
        (
            &remittance.id,
            &remittance.recipient,
            &remittance.dest_amount,
        )
    );
}

/// Emit remittance failure event
pub fn emit_remittance_failed(env: &Env, remittance: &RemittanceData) {
    env.events().publish(
        (symbol_short!("FAILED"), &remittance.sender),
        (
            &remittance.id,
            &remittance.send_amount, // Refunded amount
        )
    );
}

/// Emit remittance cancellation event
pub fn emit_remittance_cancelled(env: &Env, remittance: &RemittanceData) {
    env.events().publish(
        (symbol_short!("CANCEL"), &remittance.sender),
        (
            &remittance.id,
            &remittance.send_amount, // Refunded amount
        )
    );
}

/// Emit corridor addition event
pub fn emit_corridor_added(env: &Env, corridor: &CorridorInfo) {
    env.events().publish(
        (symbol_short!("CORRIDOR"),),
        (
            &corridor.id,
            &corridor.name,
            &corridor.source_country,
            &corridor.dest_country,
        )
    );
}

/// Emit compliance verification event
pub fn emit_compliance_verified(env: &Env, sender: &Address, recipient: &Address, corridor_id: &String) {
    env.events().publish(
        (symbol_short!("KYC_OK"), sender),
        (recipient, corridor_id)
    );
}

/// Emit compliance failure event
pub fn emit_compliance_failed(env: &Env, sender: &Address, reason: &String) {
    env.events().publish(
        (symbol_short!("KYC_FAIL"), sender),
        (reason,)
    );
}
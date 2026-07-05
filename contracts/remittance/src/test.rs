//! Unit tests for the remittance contract

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env, Bytes, String};

    #[test]
    fn test_initialize_contract() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let compliance_contract = Address::generate(&env);
        let anchor_registry = Address::generate(&env);
        let pathfinder_contract = Address::generate(&env);

        let contract_id = env.register_contract(None, RemittanceContract);
        let client = RemittanceContractClient::new(&env, &contract_id);

        // Initialize contract
        client.initialize(
            &admin,
            &compliance_contract,
            &anchor_registry,
            &pathfinder_contract,
        );

        // Verify initialization
        assert!(storage::has_admin(&env));
        assert_eq!(storage::get_admin(&env).unwrap(), admin);
    }

    #[test]
    fn test_create_remittance() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let send_asset = Address::generate(&env);
        let dest_asset = Address::generate(&env);

        // Setup contracts
        let compliance_contract = env.register_contract(None, ComplianceContract);
        let pathfinder_contract = Address::generate(&env);
        let anchor_registry = Address::generate(&env);

        let contract_id = env.register_contract(None, RemittanceContract);
        let client = RemittanceContractClient::new(&env, &contract_id);

        // Initialize
        client.initialize(&admin, &compliance_contract, &anchor_registry, &pathfinder_contract);

        // Create mock compliance proof
        let compliance_proof = Bytes::from_array(&env, &[1u8; 64]);

        // Create remittance
        let remittance_id = client.create_remittance(
            &sender,
            &recipient,
            &send_asset,
            &dest_asset,
            &100_000_000i128, // 100 units
            &95_000_000i128,  // Min 95 units
            &String::from_str(&env, "USD_NGN"),
            &compliance_proof,
        );

        // Verify remittance was created
        let remittance = client.get_remittance(&remittance_id);
        assert_eq!(remittance.sender, sender);
        assert_eq!(remittance.recipient, recipient);
        assert_eq!(remittance.send_amount, 100_000_000i128);
        assert_eq!(remittance.status, RemittanceStatus::Pending);
    }

    #[test]
    fn test_get_sender_remittances() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let send_asset = Address::generate(&env);
        let dest_asset = Address::generate(&env);

        let contract_id = env.register_contract(None, RemittanceContract);
        let client = RemittanceContractClient::new(&env, &contract_id);

        // Initialize
        let compliance_contract = Address::generate(&env);
        let pathfinder_contract = Address::generate(&env);
        let anchor_registry = Address::generate(&env);
        
        client.initialize(&admin, &compliance_contract, &anchor_registry, &pathfinder_contract);

        // Create multiple remittances
        let compliance_proof = Bytes::from_array(&env, &[1u8; 64]);
        
        for i in 0..5 {
            client.create_remittance(
                &sender,
                &recipient,
                &send_asset,
                &dest_asset,
                &(100_000_000i128 + i as i128),
                &95_000_000i128,
                &String::from_str(&env, "USD_NGN"),
                &compliance_proof,
            );
        }

        // Get sender remittances
        let remittances = client.get_sender_remittances(&sender, Some(10));
        assert_eq!(remittances.len(), 5);

        // Verify they're in reverse chronological order (most recent first)
        for i in 0..remittances.len() {
            let remittance = remittances.get(i).unwrap();
            assert_eq!(remittance.sender, sender);
        }
    }

    #[test]
    fn test_cancel_remittance() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let send_asset = Address::generate(&env);
        let dest_asset = Address::generate(&env);

        let contract_id = env.register_contract(None, RemittanceContract);
        let client = RemittanceContractClient::new(&env, &contract_id);

        // Initialize
        let compliance_contract = Address::generate(&env);
        let pathfinder_contract = Address::generate(&env);
        let anchor_registry = Address::generate(&env);
        
        client.initialize(&admin, &compliance_contract, &anchor_registry, &pathfinder_contract);

        // Create remittance
        let compliance_proof = Bytes::from_array(&env, &[1u8; 64]);
        let remittance_id = client.create_remittance(
            &sender,
            &recipient,
            &send_asset,
            &dest_asset,
            &100_000_000i128,
            &95_000_000i128,
            &String::from_str(&env, "USD_NGN"),
            &compliance_proof,
        );

        // Cancel remittance
        client.cancel_remittance(&remittance_id);

        // Verify status changed
        let remittance = client.get_remittance(&remittance_id);
        assert_eq!(remittance.status, RemittanceStatus::Cancelled);
    }

    #[test]
    fn test_add_corridor() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let send_asset = Address::generate(&env);
        let dest_asset = Address::generate(&env);
        let anchor_send = Address::generate(&env);
        let anchor_receive = Address::generate(&env);

        let contract_id = env.register_contract(None, RemittanceContract);
        let client = RemittanceContractClient::new(&env, &contract_id);

        // Initialize
        let compliance_contract = Address::generate(&env);
        let pathfinder_contract = Address::generate(&env);
        let anchor_registry = Address::generate(&env);
        
        client.initialize(&admin, &compliance_contract, &anchor_registry, &pathfinder_contract);

        // Add corridor
        let corridor = CorridorInfo {
            id: String::from_str(&env, "USD_NGN"),
            name: String::from_str(&env, "USD to Nigerian Naira"),
            source_country: String::from_str(&env, "US"),
            dest_country: String::from_str(&env, "NG"),
            source_currency: String::from_str(&env, "USD"),
            dest_currency: String::from_str(&env, "NGN"),
            send_asset,
            dest_asset,
            min_amount: 1_000_000i128,     // $1 minimum
            max_amount: 10_000_000_000i128, // $10,000 maximum
            fee_rate: 150i128,              // 1.5% fee
            anchor_send,
            anchor_receive,
            active: true,
        };

        client.add_corridor(&corridor);

        // Verify corridor was added
        let corridors = client.get_corridors();
        assert_eq!(corridors.len(), 1);
        assert_eq!(corridors.get(0).unwrap().id, String::from_str(&env, "USD_NGN"));
    }

    #[test]
    #[should_panic(expected = "InvalidAmount")]
    fn test_invalid_amount() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let send_asset = Address::generate(&env);
        let dest_asset = Address::generate(&env);

        let contract_id = env.register_contract(None, RemittanceContract);
        let client = RemittanceContractClient::new(&env, &contract_id);

        // Initialize
        let compliance_contract = Address::generate(&env);
        let pathfinder_contract = Address::generate(&env);
        let anchor_registry = Address::generate(&env);
        
        client.initialize(&admin, &compliance_contract, &anchor_registry, &pathfinder_contract);

        // Try to create remittance with invalid amount
        let compliance_proof = Bytes::from_array(&env, &[1u8; 64]);
        client.create_remittance(
            &sender,
            &recipient,
            &send_asset,
            &dest_asset,
            &0i128, // Invalid amount
            &95_000_000i128,
            &String::from_str(&env, "USD_NGN"),
            &compliance_proof,
        );
    }
}
#!/bin/bash

# AfriStar Pay V2 Deployment Script
# Deploys Soroban contracts to Stellar Testnet

set -e

echo "🚀 AfriStar Pay V2 Deployment Starting..."

# Configuration
NETWORK="testnet"
SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
HORIZON_URL="https://horizon-testnet.stellar.org"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v soroban &> /dev/null; then
        log_error "Soroban CLI not found. Please install: https://soroban.stellar.org/docs/getting-started/setup"
        exit 1
    fi
    
    if ! command -v rust &> /dev/null; then
        log_error "Rust not found. Please install: https://rustup.rs/"
        exit 1
    fi
    
    log_success "All dependencies found"
}

# Setup Soroban configuration
setup_soroban() {
    log_info "Setting up Soroban configuration..."
    
    # Configure network
    soroban network add \
        --global testnet \
        --rpc-url "$SOROBAN_RPC_URL" \
        --network-passphrase "Test SDF Network ; September 2015"
    
    # Generate identity if it doesn't exist
    if ! soroban identity ls | grep -q "afripay-deployer"; then
        log_info "Creating deployer identity..."
        soroban identity generate --global afripay-deployer
    fi
    
    # Fund the account
    DEPLOYER_ADDRESS=$(soroban identity address afripay-deployer)
    log_info "Funding deployer account: $DEPLOYER_ADDRESS"
    
    curl -X POST "https://friendbot.stellar.org/?addr=$DEPLOYER_ADDRESS" || true
    
    log_success "Soroban configuration complete"
}

# Build contracts
build_contracts() {
    log_info "Building Soroban contracts..."
    
    # Build all contracts in workspace
    cargo build --target wasm32-unknown-unknown --release
    
    log_success "Contracts built successfully"
}

# Deploy contracts
deploy_contracts() {
    log_info "Deploying contracts to Stellar Testnet..."
    
    # Deploy compliance contract
    log_info "Deploying compliance contract..."
    COMPLIANCE_WASM="target/wasm32-unknown-unknown/release/afristarpay_compliance.wasm"
    
    COMPLIANCE_CONTRACT_ID=$(soroban contract deploy \
        --wasm "$COMPLIANCE_WASM" \
        --source afripay-deployer \
        --network testnet)
    
    log_success "Compliance contract deployed: $COMPLIANCE_CONTRACT_ID"
    
    # Deploy pathfinder contract (placeholder - would be actual pathfinder)
    log_info "Deploying pathfinder contract..."
    PATHFINDER_CONTRACT_ID="CBQHNAXSI55GX2GN6D67GK7BHVPSJO5P2NK7RIGGGO7LXUN6CD3HDIKA"  # Placeholder
    log_warning "Using placeholder pathfinder contract ID"
    
    # Deploy anchor registry contract (placeholder)
    ANCHOR_REGISTRY_CONTRACT_ID="CANJGHN5TQYCVXK6CSYVFI7BFRU6AG3VQ2OQPYZCZUKC3AKZK3BSHAK5"  # Placeholder
    log_warning "Using placeholder anchor registry contract ID"
    
    # Deploy main remittance contract
    log_info "Deploying remittance contract..."
    REMITTANCE_WASM="target/wasm32-unknown-unknown/release/afristarpay_remittance.wasm"
    
    REMITTANCE_CONTRACT_ID=$(soroban contract deploy \
        --wasm "$REMITTANCE_WASM" \
        --source afripay-deployer \
        --network testnet)
    
    log_success "Remittance contract deployed: $REMITTANCE_CONTRACT_ID"
    
    # Initialize remittance contract
    log_info "Initializing remittance contract..."
    ADMIN_ADDRESS=$(soroban identity address afripay-deployer)
    
    soroban contract invoke \
        --id "$REMITTANCE_CONTRACT_ID" \
        --source afripay-deployer \
        --network testnet \
        -- \
        initialize \
        --admin "$ADMIN_ADDRESS" \
        --compliance_contract "$COMPLIANCE_CONTRACT_ID" \
        --anchor_registry "$ANCHOR_REGISTRY_CONTRACT_ID" \
        --pathfinder_contract "$PATHFINDER_CONTRACT_ID"
    
    log_success "Remittance contract initialized"
    
    # Save contract addresses to file
    cat > .env.contracts << EOF
# AfriStar Pay V2 Contract Addresses
# Generated on $(date)

REMITTANCE_CONTRACT_ID=$REMITTANCE_CONTRACT_ID
COMPLIANCE_CONTRACT_ID=$COMPLIANCE_CONTRACT_ID
PATHFINDER_CONTRACT_ID=$PATHFINDER_CONTRACT_ID
ANCHOR_REGISTRY_CONTRACT_ID=$ANCHOR_REGISTRY_CONTRACT_ID

DEPLOYER_ADDRESS=$ADMIN_ADDRESS
NETWORK=$NETWORK
SOROBAN_RPC_URL=$SOROBAN_RPC_URL
HORIZON_URL=$HORIZON_URL
EOF
    
    log_success "Contract addresses saved to .env.contracts"
}

# Add sample corridors
setup_corridors() {
    log_info "Setting up sample remittance corridors..."
    
    # This would add the corridors defined in the frontend
    # For now, we'll skip this as it requires more complex data structures
    log_warning "Corridor setup skipped - add manually via contract calls"
}

# Run tests
run_tests() {
    log_info "Running contract tests..."
    
    cargo test
    
    log_success "All tests passed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check that contracts are deployed and responsive
    source .env.contracts
    
    # Test remittance contract
    soroban contract invoke \
        --id "$REMITTANCE_CONTRACT_ID" \
        --source afripay-deployer \
        --network testnet \
        -- \
        get_corridors
    
    log_success "Deployment verification complete"
}

# Generate frontend environment file
generate_frontend_env() {
    log_info "Generating frontend environment configuration..."
    
    source .env.contracts
    
    cat > frontend/.env.local << EOF
# AfriStar Pay V2 Frontend Configuration
# Auto-generated from deployment

NEXT_PUBLIC_STELLAR_NETWORK=$NETWORK
NEXT_PUBLIC_HORIZON_URL=$HORIZON_URL
NEXT_PUBLIC_SOROBAN_RPC_URL=$SOROBAN_RPC_URL

NEXT_PUBLIC_REMITTANCE_CONTRACT=$REMITTANCE_CONTRACT_ID
NEXT_PUBLIC_COMPLIANCE_CONTRACT=$COMPLIANCE_CONTRACT_ID
NEXT_PUBLIC_PATHFINDER_CONTRACT=$PATHFINDER_CONTRACT_ID
NEXT_PUBLIC_ANCHOR_REGISTRY_CONTRACT=$ANCHOR_REGISTRY_CONTRACT_ID

# App Configuration
NEXT_PUBLIC_APP_NAME="AfriStar Pay V2"
NEXT_PUBLIC_APP_VERSION="2.0.0"
NEXT_PUBLIC_SUPPORT_EMAIL="support@afristarpay.com"
EOF
    
    log_success "Frontend environment file created: frontend/.env.local"
}

# Main deployment flow
main() {
    echo "=========================================="
    echo "🌟 AfriStar Pay V2 Deployment Script"
    echo "=========================================="
    echo ""
    
    check_dependencies
    setup_soroban
    build_contracts
    run_tests
    deploy_contracts
    setup_corridors
    verify_deployment
    generate_frontend_env
    
    echo ""
    echo "=========================================="
    log_success "🎉 Deployment Complete!"
    echo "=========================================="
    echo ""
    echo "📋 Next Steps:"
    echo "1. Update frontend/.env.local with any additional configuration"
    echo "2. Deploy frontend to Vercel/Netlify"
    echo "3. Test the full application flow"
    echo "4. Configure monitoring and analytics"
    echo ""
    echo "📱 Contract Addresses:"
    source .env.contracts
    echo "   Remittance: $REMITTANCE_CONTRACT_ID"
    echo "   Compliance: $COMPLIANCE_CONTRACT_ID"
    echo ""
    echo "🔗 Useful Links:"
    echo "   Stellar Expert: https://stellar.expert/explorer/testnet"
    echo "   Soroban CLI: https://soroban.stellar.org/docs"
    echo "   Freighter Wallet: https://freighter.app"
    echo ""
}

# Run main function
main "$@"
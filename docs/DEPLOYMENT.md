# 🚀 AfriStar Pay V2 Deployment Guide

This guide walks you through deploying AfriStar Pay V2 to Stellar Testnet and Mainnet.

## 📋 Prerequisites

### Required Tools
```bash
# Install Soroban CLI
cargo install --locked soroban-cli --features opt

# Install Rust with wasm32 target
rustup target add wasm32-unknown-unknown

# Verify installations
soroban --version  # Should be 21.0+
cargo --version    # Should be 1.70+
node --version     # Should be 18+
```

### Required Accounts
- **Stellar Account**: For deploying contracts (funded with XLM)
- **Freighter Wallet**: For frontend testing
- **Vercel/Netlify Account**: For frontend hosting (optional)

---

## 🧪 Testnet Deployment (Recommended First)

### Step 1: Environment Setup

```bash
# Clone repository
git clone https://github.com/yourusername/afristar-pay-v2.git
cd afristar-pay-v2

# Install dependencies
npm install
cd frontend && npm install && cd ..
```

### Step 2: Automated Deployment

```bash
# Run automated deployment script
./scripts/deploy.sh

# This script will:
# 1. ✅ Check all dependencies
# 2. ✅ Setup Soroban configuration
# 3. ✅ Build all contracts
# 4. ✅ Deploy to testnet
# 5. ✅ Initialize contracts
# 6. ✅ Run verification tests
# 7. ✅ Generate frontend config
```

### Step 3: Manual Deployment (Alternative)

If you prefer manual control:

```bash
# 1. Configure Soroban
soroban network add \
    --global testnet \
    --rpc-url "https://soroban-testnet.stellar.org" \
    --network-passphrase "Test SDF Network ; September 2015"

# 2. Generate deployer identity
soroban identity generate --global afripay-deployer

# 3. Fund account
DEPLOYER_ADDRESS=$(soroban identity address afripay-deployer)
curl -X POST "https://friendbot.stellar.org/?addr=$DEPLOYER_ADDRESS"

# 4. Build contracts
cargo build --target wasm32-unknown-unknown --release

# 5. Deploy compliance contract
COMPLIANCE_CONTRACT_ID=$(soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/afristarpay_compliance.wasm \
    --source afripay-deployer \
    --network testnet)

# 6. Deploy remittance contract
REMITTANCE_CONTRACT_ID=$(soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/afristarpay_remittance.wasm \
    --source afripay-deployer \
    --network testnet)

# 7. Initialize remittance contract
soroban contract invoke \
    --id "$REMITTANCE_CONTRACT_ID" \
    --source afripay-deployer \
    --network testnet \
    -- \
    initialize \
    --admin "$DEPLOYER_ADDRESS" \
    --compliance_contract "$COMPLIANCE_CONTRACT_ID" \
    --anchor_registry "PLACEHOLDER_ANCHOR_REGISTRY" \
    --pathfinder_contract "PLACEHOLDER_PATHFINDER"
```

### Step 4: Frontend Configuration

```bash
# Create frontend/.env.local
cat > frontend/.env.local << EOF
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

NEXT_PUBLIC_REMITTANCE_CONTRACT=$REMITTANCE_CONTRACT_ID
NEXT_PUBLIC_COMPLIANCE_CONTRACT=$COMPLIANCE_CONTRACT_ID

NEXT_PUBLIC_APP_NAME="AfriStar Pay V2"
NEXT_PUBLIC_APP_VERSION="2.0.0"
EOF

# Start frontend
cd frontend
npm run dev

# Open http://localhost:3000
```

---

## 🌐 Mainnet Deployment

⚠️ **Warning**: Mainnet deployment requires real XLM and affects live users. Test thoroughly on testnet first.

### Step 1: Mainnet Preparation

```bash
# Setup mainnet configuration
soroban network add \
    --global mainnet \
    --rpc-url "https://soroban-rpc.stellar.org" \
    --network-passphrase "Public Global Stellar Network ; September 2015"

# Generate or import mainnet identity
soroban identity generate --global afripay-mainnet

# Fund account with real XLM (minimum 10 XLM recommended)
# Use Stellar exchanges or on-ramps to acquire XLM
```

### Step 2: Security Checklist

Before mainnet deployment, ensure:

- [ ] **Audited Contracts**: All contracts security audited
- [ ] **Tested Thoroughly**: Extensive testnet testing completed
- [ ] **Backup Keys**: Secure backup of deployer keys
- [ ] **Monitoring**: Error monitoring and alerting setup
- [ ] **Rate Limits**: Appropriate usage limits configured
- [ ] **Insurance**: Consider smart contract insurance
- [ ] **Legal Review**: Regulatory compliance verified

### Step 3: Mainnet Deployment

```bash
# Build release version
cargo build --target wasm32-unknown-unknown --release --features mainnet

# Deploy to mainnet (modify script)
NETWORK=mainnet ./scripts/deploy.sh

# Or manually with mainnet settings
soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/afristarpay_remittance.wasm \
    --source afripay-mainnet \
    --network mainnet
```

### Step 4: Production Frontend

```bash
# Update frontend/.env.production
cat > frontend/.env.production << EOF
NEXT_PUBLIC_STELLAR_NETWORK=public
NEXT_PUBLIC_HORIZON_URL=https://horizon.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-rpc.stellar.org

NEXT_PUBLIC_REMITTANCE_CONTRACT=$MAINNET_REMITTANCE_CONTRACT_ID
NEXT_PUBLIC_COMPLIANCE_CONTRACT=$MAINNET_COMPLIANCE_CONTRACT_ID

NEXT_PUBLIC_APP_NAME="AfriStar Pay"
NEXT_PUBLIC_APP_VERSION="2.0.0"
EOF

# Build for production
cd frontend
npm run build

# Deploy to Vercel/Netlify
vercel deploy --prod
# or
netlify deploy --prod
```

---

## 🔧 Configuration Options

### Contract Configuration

```rust
// Remittance contract settings
pub struct ContractConfig {
    pub max_amount_per_transaction: i128,  // 10,000 USDC default
    pub daily_limit_per_user: i128,        // 50,000 USDC default
    pub supported_corridors: Vec<String>,   // List of active corridors
    pub compliance_required: bool,          // Always true for mainnet
    pub emergency_pause: bool,              // Emergency stop mechanism
}
```

### Frontend Configuration

```typescript
// Environment-specific settings
interface Config {
  stellarNetwork: 'testnet' | 'public'
  horizonUrl: string
  sorobanRpcUrl: string
  contracts: {
    remittance: string
    compliance: string
    pathfinder?: string
    anchorRegistry?: string
  }
  features: {
    zkPrivacy: boolean
    advancedPathfinding: boolean
    multiSig: boolean
  }
}
```

---

## 📊 Monitoring & Maintenance

### Contract Monitoring

```bash
# Check contract status
soroban contract invoke \
    --id "$REMITTANCE_CONTRACT_ID" \
    --source afripay-deployer \
    --network testnet \
    -- \
    get_corridors

# Monitor contract events
soroban events --start-ledger recent --contract-id "$REMITTANCE_CONTRACT_ID"
```

### Performance Metrics

Track these key metrics:

- **Transaction Volume**: Total value processed
- **Success Rate**: Percentage of successful transactions  
- **Average Processing Time**: End-to-end completion time
- **Gas Usage**: Contract execution costs
- **Error Rates**: Failed transactions by error type
- **User Growth**: Active addresses using the platform

### Upgrading Contracts

```bash
# Deploy new version
NEW_CONTRACT_ID=$(soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/afristarpay_remittance_v2.wasm \
    --source afripay-deployer \
    --network testnet)

# Migrate data (if needed)
soroban contract invoke \
    --id "$OLD_CONTRACT_ID" \
    --source afripay-deployer \
    --network testnet \
    -- \
    migrate_to \
    --new_contract "$NEW_CONTRACT_ID"

# Update frontend configuration
# Frontend will automatically use new contract
```

---

## 🚨 Emergency Procedures

### Circuit Breaker Activation

```bash
# Pause all operations in emergency
soroban contract invoke \
    --id "$REMITTANCE_CONTRACT_ID" \
    --source afripay-deployer \
    --network mainnet \
    -- \
    emergency_pause

# Resume operations when safe
soroban contract invoke \
    --id "$REMITTANCE_CONTRACT_ID" \
    --source afripay-deployer \
    --network mainnet \
    -- \
    resume_operations
```

### Incident Response

1. **Detect Issue**: Monitoring alerts trigger
2. **Assess Impact**: Determine scope and severity
3. **Pause Operations**: Use circuit breaker if necessary
4. **Investigate**: Analyze logs and transaction data
5. **Fix Issue**: Deploy patch or configuration change
6. **Test Fix**: Verify resolution on testnet
7. **Resume Operations**: Gradually restore full functionality
8. **Post-Mortem**: Document incident and improve procedures

---

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Security audit completed (for mainnet)
- [ ] Documentation updated
- [ ] Deployment scripts tested
- [ ] Rollback plan prepared

### During Deployment
- [ ] Deploy in maintenance window
- [ ] Monitor deployment progress
- [ ] Verify contract initialization
- [ ] Test critical paths
- [ ] Update monitoring dashboards
- [ ] Notify team of completion

### Post-Deployment  
- [ ] Smoke tests pass
- [ ] Monitoring shows healthy metrics
- [ ] Documentation updated with new addresses
- [ ] Team notified of successful deployment
- [ ] User communication sent (if needed)
- [ ] Retrospective scheduled

---

## 🆘 Troubleshooting

### Common Issues

**Contract Deployment Fails**
```bash
# Check account balance
soroban account balance afripay-deployer --network testnet

# Verify wasm file exists
ls -la target/wasm32-unknown-unknown/release/

# Check network connectivity
curl -X POST "https://soroban-testnet.stellar.org" -H "Content-Type: application/json"
```

**Frontend Won't Connect**
```bash
# Verify environment variables
cat frontend/.env.local

# Check Freighter wallet
# - Ensure installed and unlocked
# - Verify correct network (testnet/mainnet)
# - Check account has XLM balance
```

**Contract Calls Failing**
```bash
# Check contract exists
soroban contract info --contract-id "$REMITTANCE_CONTRACT_ID" --network testnet

# Verify function signature
soroban contract invoke --help --id "$REMITTANCE_CONTRACT_ID" --network testnet

# Check account authorization
# Ensure calling account has necessary permissions
```

### Getting Help

- **Documentation**: Check docs/ folder for detailed guides
- **Community**: Join Discord for real-time support
- **Issues**: Create GitHub issue with logs and reproduction steps
- **Stellar**: Use #soroban channel in Stellar Community Discord

---

## 📚 Additional Resources

- [Soroban Documentation](https://soroban.stellar.org/docs)
- [Stellar Developer Hub](https://developers.stellar.org)
- [Freighter Wallet](https://freighter.app)
- [Stellar Expert Explorer](https://stellar.expert)
- [AfriStar Pay API Docs](./API.md)
- [Security Best Practices](./SECURITY.md)

---

**Happy Deploying! 🚀**
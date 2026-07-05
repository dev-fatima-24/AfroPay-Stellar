'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  Horizon, 
  Keypair, 
  Networks, 
  Asset, 
  Operation, 
  TransactionBuilder,
  Account,
  BASE_FEE
} from '@stellar/stellar-sdk'
import { isConnected, getPublicKey, signTransaction } from '@stellar/freighter-api'
import { toast } from 'sonner'

// Types
export interface WalletConnection {
  publicKey: string
  isConnected: boolean
  balance?: string
  assets?: Array<{
    asset_type: string
    asset_code?: string
    asset_issuer?: string
    balance: string
  }>
}

export interface RemittanceTransaction {
  id: string
  sender: string
  recipient: string
  sendAsset: {
    code: string
    issuer?: string
  }
  destAsset: {
    code: string
    issuer?: string
  }
  sendAmount: string
  destAmount: string
  corridorId: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  createdAt: number
  txHash?: string
}

interface StellarContextType {
  // Wallet connection
  wallet: WalletConnection | null
  connectWallet: () => Promise<boolean>
  disconnectWallet: () => void
  
  // Network
  server: Horizon.Server
  networkPassphrase: string
  
  // Transactions
  createRemittance: (params: CreateRemittanceParams) => Promise<RemittanceTransaction>
  getRemittanceStatus: (id: string) => Promise<RemittanceTransaction | null>
  getUserRemittances: (publicKey: string) => Promise<RemittanceTransaction[]>
  
  // Utilities
  getAccountInfo: (publicKey: string) => Promise<any>
  getAssetBalance: (publicKey: string, asset: Asset) => Promise<string>
  isLoading: boolean
}

interface CreateRemittanceParams {
  recipient: string
  sendAsset: { code: string; issuer?: string }
  destAsset: { code: string; issuer?: string }
  sendAmount: string
  corridorId: string
  complianceProof?: string
}

const StellarContext = createContext<StellarContextType | undefined>(undefined)

// Configuration
const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet'
const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org'
const NETWORK_PASSPHRASE = STELLAR_NETWORK === 'testnet' ? Networks.TESTNET : Networks.PUBLIC

// Contract addresses (these would be set after deployment)
const REMITTANCE_CONTRACT_ID = process.env.NEXT_PUBLIC_REMITTANCE_CONTRACT || 'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVWBXPV2AAAAAAAAAAWHXSJWL'

export function StellarProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletConnection | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const server = new Horizon.Server(HORIZON_URL)

  // Initialize wallet connection on mount
  useEffect(() => {
    checkWalletConnection()
  }, [])

  const checkWalletConnection = async () => {
    try {
      const connected = await isConnected()
      if (connected) {
        const publicKey = await getPublicKey()
        await loadWalletData(publicKey)
      }
    } catch (error) {
      console.error('Failed to check wallet connection:', error)
    }
  }

  const loadWalletData = async (publicKey: string) => {
    try {
      setIsLoading(true)
      
      // Get account info and balances
      const account = await server.loadAccount(publicKey)
      const balances = account.balances
      
      const nativeBalance = balances.find(b => b.asset_type === 'native')?.balance || '0'
      
      setWallet({
        publicKey,
        isConnected: true,
        balance: nativeBalance,
        assets: balances,
      })
      
      toast.success('Wallet connected successfully')
    } catch (error) {
      console.error('Failed to load wallet data:', error)
      toast.error('Failed to load wallet data')
    } finally {
      setIsLoading(false)
    }
  }

  const connectWallet = async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      
      // Check if Freighter is available
      if (!window.freighter) {
        toast.error('Freighter wallet not found. Please install Freighter extension.')
        window.open('https://freighter.app/', '_blank')
        return false
      }

      const publicKey = await getPublicKey()
      await loadWalletData(publicKey)
      
      return true
    } catch (error: any) {
      console.error('Wallet connection failed:', error)
      
      if (error.message?.includes('User declined')) {
        toast.error('Wallet connection declined')
      } else {
        toast.error('Failed to connect wallet')
      }
      
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    setWallet(null)
    toast.info('Wallet disconnected')
  }

  const createRemittance = async (params: CreateRemittanceParams): Promise<RemittanceTransaction> => {
    if (!wallet?.publicKey) {
      throw new Error('Wallet not connected')
    }

    try {
      setIsLoading(true)

      // Load sender account
      const senderAccount = await server.loadAccount(wallet.publicKey)
      
      // Create send asset
      const sendAsset = params.sendAsset.issuer 
        ? new Asset(params.sendAsset.code, params.sendAsset.issuer)
        : Asset.native()

      // Create destination asset
      const destAsset = params.destAsset.issuer
        ? new Asset(params.destAsset.code, params.destAsset.issuer)
        : Asset.native()

      // Build transaction
      const transaction = new TransactionBuilder(senderAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          // In a real implementation, this would call the Soroban contract
          // For now, we'll use a path payment operation as a placeholder
          Operation.pathPaymentStrictSend({
            sendAsset: sendAsset,
            sendAmount: params.sendAmount,
            destination: params.recipient,
            destAsset: destAsset,
            destMin: '0.0000001', // This would be calculated by pathfinder
            path: [], // Path would be determined by smart contract
          })
        )
        .setTimeout(180)
        .build()

      // Sign transaction with Freighter
      const signedTransaction = await signTransaction(transaction.toXDR(), {
        network: NETWORK_PASSPHRASE,
        accountToSign: wallet.publicKey,
      })

      // Submit transaction
      const result = await server.submitTransaction(
        TransactionBuilder.fromXDR(signedTransaction, NETWORK_PASSPHRASE)
      )

      // Create remittance record
      const remittance: RemittanceTransaction = {
        id: generateRemittanceId(),
        sender: wallet.publicKey,
        recipient: params.recipient,
        sendAsset: params.sendAsset,
        destAsset: params.destAsset,
        sendAmount: params.sendAmount,
        destAmount: '0', // Would be calculated by contract
        corridorId: params.corridorId,
        status: 'pending',
        createdAt: Date.now(),
        txHash: result.hash,
      }

      toast.success('Remittance created successfully!')
      return remittance

    } catch (error: any) {
      console.error('Failed to create remittance:', error)
      toast.error(`Failed to create remittance: ${error.message}`)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const getRemittanceStatus = async (id: string): Promise<RemittanceTransaction | null> => {
    try {
      // In production, this would query the Soroban contract
      // For now, return mock data
      return {
        id,
        sender: wallet?.publicKey || '',
        recipient: 'GDXXX...XXX',
        sendAsset: { code: 'USDC' },
        destAsset: { code: 'NGN' },
        sendAmount: '100',
        destAmount: '158000',
        corridorId: 'USD_NGN',
        status: 'completed',
        createdAt: Date.now() - 300000, // 5 minutes ago
        txHash: 'abc123...',
      }
    } catch (error) {
      console.error('Failed to get remittance status:', error)
      return null
    }
  }

  const getUserRemittances = async (publicKey: string): Promise<RemittanceTransaction[]> => {
    try {
      // In production, this would query the Soroban contract
      // For now, return mock data
      return []
    } catch (error) {
      console.error('Failed to get user remittances:', error)
      return []
    }
  }

  const getAccountInfo = async (publicKey: string) => {
    try {
      return await server.loadAccount(publicKey)
    } catch (error) {
      console.error('Failed to get account info:', error)
      throw error
    }
  }

  const getAssetBalance = async (publicKey: string, asset: Asset): Promise<string> => {
    try {
      const account = await server.loadAccount(publicKey)
      
      if (asset.isNative()) {
        const nativeBalance = account.balances.find(b => b.asset_type === 'native')
        return nativeBalance?.balance || '0'
      }
      
      const assetBalance = account.balances.find(
        b => b.asset_code === asset.code && b.asset_issuer === asset.issuer
      )
      
      return assetBalance?.balance || '0'
    } catch (error) {
      console.error('Failed to get asset balance:', error)
      return '0'
    }
  }

  const value: StellarContextType = {
    wallet,
    connectWallet,
    disconnectWallet,
    server,
    networkPassphrase: NETWORK_PASSPHRASE,
    createRemittance,
    getRemittanceStatus,
    getUserRemittances,
    getAccountInfo,
    getAssetBalance,
    isLoading,
  }

  return (
    <StellarContext.Provider value={value}>
      {children}
    </StellarContext.Provider>
  )
}

export function useStellar() {
  const context = useContext(StellarContext)
  if (context === undefined) {
    throw new Error('useStellar must be used within a StellarProvider')
  }
  return context
}

// Utility functions
function generateRemittanceId(): string {
  return `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Extend window type for Freighter
declare global {
  interface Window {
    freighter?: any
  }
}
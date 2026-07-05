'use client'

import { useState } from 'react'
import { Wallet, ExternalLink, LogOut, Copy, Check } from 'lucide-react'
import { useStellar } from '@/contexts/StellarContext'
import { toast } from 'sonner'

export function WalletConnectionButton() {
  const { wallet, connectWallet, disconnectWallet, isLoading } = useStellar()
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleConnect = async () => {
    const success = await connectWallet()
    if (!success) {
      // Connection failed, error already shown in context
      return
    }
  }

  const copyAddress = async () => {
    if (!wallet?.publicKey) return
    
    try {
      await navigator.clipboard.writeText(wallet.publicKey)
      setCopied(true)
      toast.success('Address copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy address')
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  if (!wallet?.isConnected) {
    return (
      <div className="space-y-4">
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="btn-primary w-full group"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="spinner w-4 h-4"></div>
              Connecting...
            </div>
          ) : (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              Connect Freighter Wallet
            </>
          )}
        </button>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Don't have Freighter wallet?</p>
          <a
            href="https://freighter.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            Install Freighter
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connected Wallet Display */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Wallet className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-green-900">
                Wallet Connected
              </div>
              <div className="text-xs text-green-700 font-mono">
                {formatAddress(wallet.publicKey)}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-green-600 hover:text-green-700 text-sm"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>

        {/* Wallet Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-green-200 space-y-3">
            {/* Full Address */}
            <div>
              <label className="block text-xs font-medium text-green-800 mb-1">
                Public Key
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-green-100 p-2 rounded font-mono text-green-900 break-all">
                  {wallet.publicKey}
                </code>
                <button
                  onClick={copyAddress}
                  className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Balance */}
            <div>
              <label className="block text-xs font-medium text-green-800 mb-1">
                XLM Balance
              </label>
              <div className="text-sm font-mono text-green-900">
                {wallet.balance ? `${parseFloat(wallet.balance).toFixed(4)} XLM` : 'Loading...'}
              </div>
            </div>

            {/* Assets */}
            {wallet.assets && wallet.assets.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-green-800 mb-1">
                  Other Assets
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {wallet.assets
                    .filter(asset => asset.asset_type !== 'native')
                    .map((asset, index) => (
                      <div key={index} className="text-xs text-green-700 flex justify-between">
                        <span>{asset.asset_code}</span>
                        <span className="font-mono">{parseFloat(asset.balance).toFixed(4)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.open(`https://stellar.expert/explorer/testnet/account/${wallet.publicKey}`, '_blank')}
                className="flex-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 py-2 px-3 rounded flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View on Explorer
              </button>
              <button
                onClick={disconnectWallet}
                className="flex-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 py-2 px-3 rounded flex items-center justify-center gap-1"
              >
                <LogOut className="w-3 h-3" />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Network Indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
        Connected to Stellar Testnet
      </div>
    </div>
  )
}
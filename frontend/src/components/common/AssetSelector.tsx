'use client'

import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export interface Asset {
  code: string
  issuer?: string
  name: string
  logo?: string
  balance?: string
}

interface AssetSelectorProps {
  assets: Asset[]
  selectedAsset: Asset | null
  onSelect: (asset: Asset) => void
  label?: string
  error?: string
  placeholder?: string
}

export function AssetSelector({
  assets,
  selectedAsset,
  onSelect,
  label,
  error,
  placeholder = 'Select asset',
}: AssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredAssets = assets.filter(asset =>
    asset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-1">
      {label && <label className="form-label">{label}</label>}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            form-input w-full flex items-center justify-between
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            {selectedAsset ? (
              <>
                {selectedAsset.logo && (
                  <img 
                    src={selectedAsset.logo} 
                    alt={selectedAsset.code}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <div className="text-left">
                  <div className="font-medium text-gray-900">
                    {selectedAsset.code}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedAsset.name}
                  </div>
                </div>
                {selectedAsset.balance && (
                  <div className="ml-auto text-sm text-gray-600 font-mono">
                    {parseFloat(selectedAsset.balance).toFixed(4)}
                  </div>
                )}
              </>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            {/* Search */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Asset List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredAssets.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-sm">
                  No assets found
                </div>
              ) : (
                filteredAssets.map((asset, index) => (
                  <button
                    key={`${asset.code}-${asset.issuer || 'native'}`}
                    type="button"
                    onClick={() => {
                      onSelect(asset)
                      setIsOpen(false)
                      setSearchTerm('')
                    }}
                    className="w-full p-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    {asset.logo && (
                      <img 
                        src={asset.logo} 
                        alt={asset.code}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {asset.code}
                      </div>
                      <div className="text-sm text-gray-500">
                        {asset.name}
                      </div>
                      {asset.issuer && (
                        <div className="text-xs text-gray-400 font-mono">
                          {asset.issuer.slice(0, 8)}...{asset.issuer.slice(-8)}
                        </div>
                      )}
                    </div>
                    {asset.balance && (
                      <div className="text-sm text-gray-600 font-mono">
                        {parseFloat(asset.balance).toFixed(4)}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Overlay to close dropdown */}
        {isOpen && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
      
      {error && (
        <p className="form-error">{error}</p>
      )}
    </div>
  )
}
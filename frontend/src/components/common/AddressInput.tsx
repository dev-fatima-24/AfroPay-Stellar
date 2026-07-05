'use client'

import { forwardRef, useState } from 'react'
import { User, Check, AlertCircle } from 'lucide-react'
import { StrKey } from '@stellar/stellar-sdk'

interface AddressInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

export const AddressInput = forwardRef<HTMLInputElement, AddressInputProps>(
  ({ error, label, className = '', onChange, value, ...props }, ref) => {
    const [isValid, setIsValid] = useState<boolean | null>(null)
    const [focused, setFocused] = useState(false)

    const validateAddress = (address: string) => {
      if (!address) {
        setIsValid(null)
        return
      }
      
      try {
        const valid = StrKey.isValidEd25519PublicKey(address)
        setIsValid(valid)
      } catch {
        setIsValid(false)
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      validateAddress(newValue)
      onChange?.(e)
    }

    return (
      <div className="space-y-1">
        {label && <label className="form-label">{label}</label>}
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-4 w-4 text-gray-400" />
          </div>
          
          <input
            ref={ref}
            type="text"
            className={`
              form-input pl-10 pr-10 font-mono text-sm
              ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
              ${isValid === true ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''}
              ${isValid === false ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
              ${focused ? 'ring-2 ring-opacity-50' : ''}
              ${className}
            `}
            value={value}
            onChange={handleChange}
            onFocus={(e) => {
              setFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              props.onBlur?.(e)
            }}
            {...props}
          />
          
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {isValid === true && (
              <Check className="h-4 w-4 text-green-500" />
            )}
            {isValid === false && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
        
        {error && (
          <p className="form-error">{error}</p>
        )}
        
        {isValid === false && !error && (
          <p className="form-error">Invalid Stellar address format</p>
        )}
        
        {isValid === true && (
          <p className="mt-1 text-sm text-green-600">✓ Valid Stellar address</p>
        )}
        
        <div className="text-xs text-gray-500 mt-1">
          Stellar addresses start with 'G' and are 56 characters long
        </div>
      </div>
    )
  }
)

AddressInput.displayName = 'AddressInput'
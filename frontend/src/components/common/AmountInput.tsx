'use client'

import { forwardRef, useState } from 'react'
import { DollarSign } from 'lucide-react'

interface AmountInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  currency?: string
  error?: string
  label?: string
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ currency = 'USD', error, label, className = '', ...props }, ref) => {
    const [focused, setFocused] = useState(false)

    return (
      <div className="space-y-1">
        {label && <label className="form-label">{label}</label>}
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-4 w-4 text-gray-400" />
          </div>
          
          <input
            ref={ref}
            type="number"
            step="0.01"
            min="0"
            className={`
              form-input pl-10 pr-16 text-lg font-mono
              ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
              ${focused ? 'ring-2 ring-primary-500 ring-opacity-50' : ''}
              ${className}
            `}
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
            <span className="text-gray-500 text-sm font-medium">
              {currency}
            </span>
          </div>
        </div>
        
        {error && (
          <p className="form-error">{error}</p>
        )}
      </div>
    )
  }
)

AmountInput.displayName = 'AmountInput'
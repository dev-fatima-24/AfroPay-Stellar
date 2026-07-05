'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Wallet, 
  ArrowRight, 
  Shield, 
  Clock, 
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useStellar } from '@/contexts/StellarContext'
import { toast } from 'sonner'
import { WalletConnectionButton } from '@/components/wallet/WalletConnectionButton'
import { AssetSelector } from '@/components/common/AssetSelector'
import { AmountInput } from '@/components/common/AmountInput'
import { AddressInput } from '@/components/common/AddressInput'

// Form validation schema
const remittanceSchema = z.object({
  sendAmount: z.string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Invalid amount'),
  recipient: z.string()
    .min(56, 'Invalid Stellar address')
    .max(56, 'Invalid Stellar address')
    .regex(/^G[A-Z2-7]{55}$/, 'Invalid Stellar address format'),
  corridorId: z.string().min(1, 'Please select a corridor'),
})

type RemittanceFormData = z.infer<typeof remittanceSchema>

// Available corridors
const CORRIDORS = [
  {
    id: 'USDC_NGN',
    name: 'USDC → Nigerian Naira',
    sendAsset: { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
    destAsset: { code: 'NGN', issuer: 'GAWODAROMJ33V5YDFY3EFYMV2SUC2TRQN2ZGQT7HNO5JTA46NTKU4GS' },
    flag: '🇳🇬',
    estimatedTime: '2-5 minutes',
    fee: '0.1%',
    rate: 1580,
  },
  {
    id: 'USDC_GHS',
    name: 'USDC → Ghanaian Cedi',
    sendAsset: { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
    destAsset: { code: 'GHS', issuer: 'GDSRCV5VTG3CAQTZXE7XZRQ6OJBGBVXJV2XOVHF6GQQTEDMR5MXAQCE' },
    flag: '🇬🇭',
    estimatedTime: '3-7 minutes',
    fee: '0.1%',
    rate: 15.2,
  },
  {
    id: 'USDC_KES',
    name: 'USDC → Kenyan Shilling',
    sendAsset: { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
    destAsset: { code: 'KES', issuer: 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG' },
    flag: '🇰🇪',
    estimatedTime: '2-5 minutes',
    fee: '0.1%',
    rate: 129.5,
  },
  {
    id: 'USDC_ZAR',
    name: 'USDC → South African Rand',
    sendAsset: { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
    destAsset: { code: 'ZAR', issuer: 'GDVKY2GU2DRXWTBEYJJWSFXIGBZV6AZNBVVSYFWI65VMANTE6ZTBQH6B' },
    flag: '🇿🇦',
    estimatedTime: '2-5 minutes',
    fee: '0.1%',
    rate: 18.3,
  },
]

export function RemittanceForm() {
  const { wallet, connectWallet, createRemittance, isLoading } = useStellar()
  const [selectedCorridor, setSelectedCorridor] = useState(CORRIDORS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'form' | 'review' | 'success'>('form')
  const [transactionResult, setTransactionResult] = useState<any>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RemittanceFormData>({
    resolver: zodResolver(remittanceSchema),
    defaultValues: {
      corridorId: CORRIDORS[0].id,
    },
  })

  const sendAmount = watch('sendAmount')
  const recipient = watch('recipient')

  // Calculate destination amount
  const calculateDestAmount = (amount: string): string => {
    if (!amount || isNaN(Number(amount))) return '0'
    const numAmount = Number(amount)
    const fee = numAmount * 0.001 // 0.1% fee
    const afterFee = numAmount - fee
    return (afterFee * selectedCorridor.rate).toFixed(2)
  }

  const onSubmit = async (data: RemittanceFormData) => {
    if (!wallet?.isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsSubmitting(true)
    setStep('review')

    try {
      const result = await createRemittance({
        recipient: data.recipient,
        sendAsset: selectedCorridor.sendAsset,
        destAsset: selectedCorridor.destAsset,
        sendAmount: data.sendAmount,
        corridorId: data.corridorId,
      })

      setTransactionResult(result)
      setStep('success')
      toast.success('Remittance sent successfully!')
    } catch (error: any) {
      console.error('Remittance failed:', error)
      toast.error(`Transaction failed: ${error.message}`)
      setStep('form')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setStep('form')
    setTransactionResult(null)
  }

  if (step === 'success' && transactionResult) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card max-w-md w-full"
      >
        <div className="card-body text-center">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Sent!</h3>
          <p className="text-gray-600 mb-6">
            Your remittance has been submitted to the Stellar network.
          </p>
          
          <div className="space-y-3 text-left mb-6">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Sent:</span>
              <span className="font-medium">{sendAmount} {selectedCorridor.sendAsset.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Recipient Gets:</span>
              <span className="font-medium">{calculateDestAmount(sendAmount)} {selectedCorridor.destAsset.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Transaction ID:</span>
              <span className="font-mono text-sm">{transactionResult.id.slice(0, 12)}...</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetForm}
              className="btn-secondary flex-1"
            >
              Send Another
            </button>
            <button
              onClick={() => window.open(`https://stellar.expert/explorer/testnet/tx/${transactionResult.txHash}`, '_blank')}
              className="btn-primary flex-1"
            >
              View Transaction
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card max-w-md w-full"
    >
      <div className="card-header">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary-600" />
          Send Money
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Fast, secure, and affordable cross-border payments
        </p>
      </div>

      <div className="card-body space-y-6">
        {/* Wallet Connection */}
        {!wallet?.isConnected ? (
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 mb-6">
              Connect your Stellar wallet to start sending money
            </p>
            <WalletConnectionButton />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Corridor Selection */}
            <div>
              <label className="form-label">Corridor</label>
              <div className="grid grid-cols-1 gap-2">
                {CORRIDORS.map((corridor) => (
                  <div
                    key={corridor.id}
                    onClick={() => {
                      setSelectedCorridor(corridor)
                      setValue('corridorId', corridor.id)
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedCorridor.id === corridor.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{corridor.flag}</span>
                        <div>
                          <div className="font-medium text-gray-900">{corridor.name}</div>
                          <div className="text-sm text-gray-500">
                            Fee: {corridor.fee} • Est. {corridor.estimatedTime}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          1 {corridor.sendAsset.code} = {corridor.rate} {corridor.destAsset.code}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="form-label">Send Amount</label>
              <AmountInput
                {...register('sendAmount')}
                placeholder="Enter amount"
                currency={selectedCorridor.sendAsset.code}
                error={errors.sendAmount?.message}
              />
              {sendAmount && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Recipient gets:</span>
                    <span className="font-medium text-gray-900">
                      {calculateDestAmount(sendAmount)} {selectedCorridor.destAsset.code}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Fee (0.1%):</span>
                    <span className="text-gray-600">
                      {sendAmount ? (Number(sendAmount) * 0.001).toFixed(4) : '0'} {selectedCorridor.sendAsset.code}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Recipient Address */}
            <div>
              <label className="form-label">Recipient Stellar Address</label>
              <AddressInput
                {...register('recipient')}
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                error={errors.recipient?.message}
              />
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-blue-900 font-medium">Zero-Knowledge Privacy</p>
                <p className="text-blue-700 mt-1">
                  Your transaction is verified for compliance without exposing personal data.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="btn-primary w-full text-lg py-3 group"
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner w-4 h-4"></div>
                  Processing...
                </div>
              ) : (
                <>
                  Send {sendAmount || '0'} {selectedCorridor.sendAsset.code}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Estimated Time */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              Estimated delivery: {selectedCorridor.estimatedTime}
            </div>
          </form>
        )}
      </div>
    </motion.div>
  )
}
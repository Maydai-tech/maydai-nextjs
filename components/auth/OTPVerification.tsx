'use client'

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react'

interface OTPVerificationProps {
  email: string
  onVerify: (code: string) => Promise<{ error: Error | null }>
  onSuccess: () => void | Promise<void>
  onBack?: () => void
  onResend?: () => Promise<{ error: Error | null }>
  title?: string
  subtitle?: string
  autoSubmit?: boolean
  allowBack?: boolean
  allowResend?: boolean
}

/**
 * Reusable OTP Verification Component
 *
 * Features:
 * - 6-digit OTP input with auto-focus
 * - Paste support (auto-split digits)
 * - Keyboard navigation (arrows, backspace)
 * - Auto-submit when complete
 * - Resend with 60s countdown
 * - Error handling
 *
 * Usage in Signup:
 * <OTPVerification
 *   email={formData.email}
 *   onVerify={(code) => verifyOtp(formData.email, code)}
 *   onSuccess={() => completeSignup()}
 *   onBack={() => setStep('form')}
 *   onResend={() => signInWithOtp(formData.email, true)}
 * />
 *
 * Usage in Login:
 * <OTPVerification
 *   email={email}
 *   onVerify={(code) => verifyOtp(email, code)}
 *   onSuccess={() => router.push('/dashboard/registries')}
 *   onBack={() => setStep('email')}
 *   onResend={() => signInWithOtp(email, false)}
 * />
 */
export default function OTPVerification({
  email,
  onVerify,
  onSuccess,
  onBack,
  onResend,
  title = 'Vérifiez votre email',
  subtitle,
  autoSubmit = true,
  allowBack = true,
  allowResend = true,
}: OTPVerificationProps) {
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendDisabled, setResendDisabled] = useState(true)
  const [resendCountdown, setResendCountdown] = useState(60)
  const otpInputs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    otpInputs.current[0]?.focus()
  }, [])

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setResendDisabled(false)
    }
  }, [resendCountdown])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return // Prevent multiple characters

    const newOtpCode = [...otpCode]
    newOtpCode[index] = value
    setOtpCode(newOtpCode)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are filled
    if (autoSubmit && index === 5 && value && newOtpCode.every(digit => digit)) {
      handleSubmit(newOtpCode.join(''))
    }
  }

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputs.current[index + 1]?.focus()
    }
  }

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtpCode = pastedData.split('').concat(Array(6 - pastedData.length).fill(''))
    setOtpCode(newOtpCode)

    // Focus last filled input or first empty input
    const nextIndex = Math.min(pastedData.length, 5)
    otpInputs.current[nextIndex]?.focus()

    // Auto-submit if complete
    if (autoSubmit && pastedData.length === 6) {
      handleSubmit(pastedData)
    }
  }

  const handleSubmit = async (code?: string) => {
    const otpString = code || otpCode.join('')

    if (otpString.length !== 6) {
      setError('Veuillez saisir le code à 6 chiffres')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: verifyError } = await onVerify(otpString)

      if (verifyError) {
        setError('Code invalide ou expiré. Veuillez réessayer.')
        setLoading(false)
        setOtpCode(['', '', '', '', '', ''])
        otpInputs.current[0]?.focus()
        return
      }

      // Success - call onSuccess callback
      await onSuccess()
    } catch (err) {
      console.error('OTP verification error:', err)
      setError('Erreur lors de la vérification du code')
      setLoading(false)
      setOtpCode(['', '', '', '', '', ''])
      otpInputs.current[0]?.focus()
    }
  }

  const handleResend = async () => {
    if (!onResend || resendDisabled) return

    setLoading(true)
    setError('')

    try {
      const { error } = await onResend()

      if (error) {
        setError('Erreur lors de l\'envoi du code')
      } else {
        setResendDisabled(true)
        setResendCountdown(60)
      }
    } catch (err) {
      setError('Erreur lors de l\'envoi du code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-[#0080A3] rounded-full flex items-center justify-center mb-6">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-gray-600">
            {subtitle || (
              <>
                Code envoyé à <span className="font-medium">{email}</span>
              </>
            )}
          </p>
        </div>

        {/* OTP Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              Saisissez le code à 6 chiffres reçu par email
            </label>
            <div className="flex gap-2 justify-center">
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { otpInputs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {/* Submit Button */}
            <button
              onClick={() => handleSubmit()}
              disabled={loading || otpCode.some(d => !d)}
              className="w-full bg-[#0080A3] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#006280] focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0080A3] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Vérification...
                </>
              ) : (
                <>
                  Valider
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            {/* Resend Button */}
            {allowResend && onResend && (
              <button
                onClick={handleResend}
                disabled={resendDisabled || loading}
                className="w-full text-[#0080A3] py-2 px-4 font-medium hover:text-[#006280] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendDisabled ? `Renvoyer le code (${resendCountdown}s)` : 'Renvoyer le code'}
              </button>
            )}

            {/* Back Button */}
            {allowBack && onBack && (
              <button
                onClick={onBack}
                disabled={loading}
                className="w-full text-gray-600 py-2 px-4 font-medium hover:text-gray-800 focus:outline-none transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowLeft className="h-5 w-5" />
                Retour
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

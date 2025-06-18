'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'

type Step = 'email' | 'otp'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const { signInWithOtp, verifyOtp, user } = useAuth()
  const router = useRouter()
  const otpInputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (user) {
      router.push('/dashboard/companies')
    }
  }, [user, router])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await signInWithOtp(email)
      if (error) {
        if (error.message?.includes('User not found') || error.message?.includes('Invalid email')) {
          setError('Aucun compte trouvé avec cette adresse email')
        } else {
          setError('Erreur lors de l\'envoi du code. Veuillez réessayer.')
        }
      } else {
        setOtpSent(true)
        setStep('otp')
      }
    } catch (err) {
      setError('Une erreur est survenue lors de l\'envoi du code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await verifyOtp(email, otpCode.join(''))
      if (error) {
        if (error.message?.includes('Invalid token') || error.message?.includes('expired')) {
          setError('Code invalide ou expiré. Veuillez recommencer.')
        } else {
          setError('Erreur lors de la vérification du code')
        }
      } else {
        router.push('/dashboard/companies')
      }
    } catch (err) {
      setError('Une erreur est survenue lors de la vérification')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setOtpCode(['', '', '', '', '', ''])
    setOtpSent(false)
    setError('')
  }

  const handleOtpChange = (index: number, value: string) => {
    // Si on colle du texte
    if (value.length > 1) {
      const pastedValue = value.replace(/[^0-9]/g, '').slice(0, 6)
      const newOtpCode = [...otpCode]
      
      for (let i = 0; i < 6; i++) {
        newOtpCode[i] = pastedValue[i] || ''
      }
      
      setOtpCode(newOtpCode)
      
      // Focus sur la prochaine case vide ou la dernière
      const nextEmptyIndex = newOtpCode.findIndex(code => code === '')
      const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex
      setTimeout(() => {
        otpInputs.current[focusIndex]?.focus()
      }, 0)
      return
    }

    // Saisie normale d'un chiffre
    if (value === '' || /^[0-9]$/.test(value)) {
      const newOtpCode = [...otpCode]
      newOtpCode[index] = value
      setOtpCode(newOtpCode)

      // Auto-focus sur la case suivante si un chiffre est saisi
      if (value && index < 5) {
        setTimeout(() => {
          otpInputs.current[index + 1]?.focus()
        }, 0)
      }
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      // Si la case est vide et on appuie sur backspace, aller à la case précédente
      setTimeout(() => {
        otpInputs.current[index - 1]?.focus()
      }, 0)
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setTimeout(() => {
        otpInputs.current[index - 1]?.focus()
      }, 0)
    } else if (e.key === 'ArrowRight' && index < 5) {
      setTimeout(() => {
        otpInputs.current[index + 1]?.focus()
      }, 0)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-[#0080A3] rounded-full flex items-center justify-center mb-6">
            {step === 'email' ? (
              <Mail className="h-8 w-8 text-white" />
            ) : (
              <Lock className="h-8 w-8 text-white" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {step === 'email' ? 'Connexion' : 'Vérification'}
          </h2>
          <p className="mt-2 text-gray-600">
            {step === 'email' 
              ? 'Saisissez votre email pour recevoir un code' 
              : `Code envoyé à ${email}`
            }
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {step === 'email' ? (
            /* Étape 1: Demander l'email */
            <form className="space-y-6" onSubmit={handleSendOtp}>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0080A3] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#006280] focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0080A3] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    Envoyer le code
                    <Mail className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Étape 2: Saisir le code OTP */
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {otpSent && !error && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-green-600 text-sm">
                      Code envoyé ! Vérifiez votre boîte mail.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Code de vérification
                </label>
                
                {/* Cases individuelles pour le code OTP */}
                <div className="flex justify-center gap-3 mb-4">
                  {otpCode.map((digit, index) => (
                                         <input
                       key={index}
                       ref={(el) => { otpInputs.current[index] = el }}
                       type="text"
                       inputMode="numeric"
                       maxLength={6} // Permet le copier-coller
                       value={digit}
                       onChange={(e) => handleOtpChange(index, e.target.value)}
                       onKeyDown={(e) => handleOtpKeyDown(index, e)}
                       className="w-12 h-12 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                       autoComplete="one-time-code"
                     />
                  ))}
                </div>
                
                <p className="text-sm text-gray-500 text-center">
                  Saisissez le code à 6 chiffres reçu par email
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || otpCode.some(digit => digit === '')}
                  className="w-full bg-[#0080A3] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#006280] focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0080A3] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Vérification...
                    </>
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Changer d'email
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <Link
                href="/signup"
                className="font-medium text-[#0080A3] hover:text-[#006280] transition-colors"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 
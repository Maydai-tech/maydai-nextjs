'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import OTPVerification from '@/components/auth/OTPVerification'
import { Mail, ArrowRight } from 'lucide-react'

type Step = 'email' | 'otp'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const { signInWithOtp, verifyOtp, user, loading } = useAuth()
  const router = useRouter()

  // Redirection automatique pour les utilisateurs connectés
  useEffect(() => {
    if (user && !loading) {
      router.replace('/dashboard/registries')
    }
  }, [user, loading, router])

  // Afficher un loader pendant la vérification d'authentification
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification...</p>
        </div>
      </div>
    )
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFormLoading(true)

    try {
      const { error } = await signInWithOtp(email)
      if (error) {
        if (error.message?.includes('User not found') || error.message?.includes('Invalid email')) {
          setError('Aucun compte trouvé avec cette adresse email')
        } else {
          setError('Erreur lors de l\'envoi du code. Veuillez réessayer.')
        }
      } else {
        setStep('otp')
      }
    } catch (err) {
      setError('Une erreur est survenue lors de l\'envoi du code')
    } finally {
      setFormLoading(false)
    }
  }


  // Step 2: OTP Verification (full-page component)
  if (step === 'otp') {
    return (
      <OTPVerification
        email={email}
        onVerify={(code) => verifyOtp(email, code)}
        onSuccess={() => router.replace('/dashboard/registries')}
        onBack={() => setStep('email')}
        onResend={() => signInWithOtp(email, false)}
        title="Connexion"
      />
    )
  }

  // Step 1: Email Input
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-[#0080A3] rounded-full flex items-center justify-center mb-6">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Connexion
          </h2>
          <p className="mt-2 text-gray-600">
            Saisissez votre email pour recevoir un code
          </p>
        </div>

        {/* Email Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
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
              disabled={formLoading}
              className="w-full bg-[#0080A3] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#006280] focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0080A3] flex items-center justify-center gap-2"
            >
              {formLoading ? (
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
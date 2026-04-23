'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'
import OTPVerification from '@/components/auth/OTPVerification'
import { sendLoginEvent } from '@/lib/gtm'
import { Mail, ArrowRight, Clock } from 'lucide-react'

type LoginStep = 'email' | 'otp'

function isAuthRateLimited(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false
    const { status, code } = err as { status?: number; code?: string }
    return status === 429 || code === 'over_email_send_rate_limit'
}

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { signInWithOtp, verifyOtp, user, loading } = useAuth()

    // Pre-fill email from URL params (e.g., /login?email=user@example.com)
    const emailFromUrl = searchParams.get('email') || ''

    const [step, setStep] = useState<LoginStep>('email')
    const [email, setEmail] = useState(emailFromUrl)
    const [error, setError] = useState('')
    const [formLoading, setFormLoading] = useState(false)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const [isRateLimited, setIsRateLimited] = useState(false)
    const rateLimitResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearRateLimitTimer = () => {
        if (rateLimitResetTimeoutRef.current) {
            clearTimeout(rateLimitResetTimeoutRef.current)
            rateLimitResetTimeoutRef.current = null
        }
    }

    useEffect(() => () => clearRateLimitTimer(), [])

    // Redirect authenticated users
    useEffect(() => {
        if (!loading) {
            if (user) {
                router.push('/dashboard/registries')
            } else {
                setIsCheckingAuth(false)
            }
        }
    }, [user, loading, router])

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setFormLoading(true)

        if (!email || !email.includes('@')) {
            setError('Veuillez entrer une adresse email valide')
            setFormLoading(false)
            return
        }

        try {
            const { error: otpError } = await signInWithOtp(email, false)

            if (otpError) {
                if (isAuthRateLimited(otpError)) {
                    setError('')
                    setIsRateLimited(true)
                    clearRateLimitTimer()
                    rateLimitResetTimeoutRef.current = setTimeout(() => {
                        setIsRateLimited(false)
                        rateLimitResetTimeoutRef.current = null
                    }, 60_000)
                } else {
                    console.error('OTP send error:', otpError)
                    setError("Erreur lors de l'envoi du code. Veuillez réessayer.")
                }
                setFormLoading(false)
                return
            }

            clearRateLimitTimer()
            setIsRateLimited(false)
            setStep('otp')
            setFormLoading(false)
        } catch (err) {
            console.error('Login error:', err)
            setError('Une erreur est survenue. Veuillez réessayer.')
            setFormLoading(false)
        }
    }

    const handleOtpSuccess = () => {
        sendLoginEvent('email')
        router.push('/dashboard/registries')
    }

    // Loading state
    if (loading || isCheckingAuth) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement...</p>
                </div>
            </div>
        )
    }

    if (step === 'otp') {
        return (
            <OTPVerification
                email={email}
                onVerify={(code) => verifyOtp(email, code)}
                onSuccess={handleOtpSuccess}
                onBack={() => setStep('email')}
                onResend={() => signInWithOtp(email, false)}
                title="Connexion"
            />
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <Image
                        src="/logos/logo-maydai/logo-maydai-complet.png"
                        alt="MaydAI Logo"
                        width={200}
                        height={50}
                        className="w-auto mb-6 mx-auto"
                        priority
                    />
                    <h2 className="text-3xl font-bold text-primary">
                        Connexion
                    </h2>
                    <p className="mt-2 text-gray-600">
                        Connectez-vous à votre espace.
                    </p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <form className="space-y-6" onSubmit={handleEmailSubmit}>
                        {isRateLimited && (
                            <div
                                role="alert"
                                aria-live="assertive"
                                className="flex items-start gap-3 p-4 mb-6 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-sans"
                            >
                                <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm font-medium">Veuillez patienter quelques instants</p>
                                    <p className="text-sm text-amber-700">
                                        Pour des raisons de sécurité, nous avons temporairement suspendu l&apos;envoi de
                                        nouveaux codes. Réessayez d&apos;ici quelques minutes.
                                    </p>
                                </div>
                            </div>
                        )}
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
                                    onChange={(e) => {
                                        setEmail(e.target.value)
                                        setError('')
                                    }}
                                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                                    placeholder="votre@email.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isRateLimited || formLoading || !email}
                            aria-busy={formLoading}
                            className="w-full bg-[#0080A3] text-white py-2.5 px-4 rounded-md font-medium transition-colors hover:bg-[#006b88] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0080A3] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0080A3] flex items-center justify-center gap-2"
                        >
                            {formLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" aria-hidden="true" />
                                    Connexion en cours...
                                </>
                            ) : (
                                <>
                                    Se connecter
                                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
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
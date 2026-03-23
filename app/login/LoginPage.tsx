'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'
import OTPVerification from '@/components/auth/OTPVerification'
import { sendLoginEvent } from '@/lib/gtm'
import { Mail, ArrowRight } from 'lucide-react'

type LoginStep = 'email' | 'otp'

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
            // Send OTP
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/517bfc0e-be36-45ac-a3ee-60c7f4fa816a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4e3066'},body:JSON.stringify({sessionId:'4e3066',location:'LoginPage.tsx:50',message:'Before signInWithOtp',data:{email:email.substring(0,3)+'***'},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            const { error: otpError } = await signInWithOtp(email, false)
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/517bfc0e-be36-45ac-a3ee-60c7f4fa816a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4e3066'},body:JSON.stringify({sessionId:'4e3066',location:'LoginPage.tsx:53',message:'After signInWithOtp',data:{hasError:!!otpError,errorMessage:otpError?.message,errorName:otpError?.name,errorStatus:(otpError as any)?.status,errorCode:(otpError as any)?.code},timestamp:Date.now(),hypothesisId:'A,B'})}).catch(()=>{});
            // #endregion

            if (otpError) {
                // #region agent log
                const debugMsg = `[DEBUG] ${otpError.message || 'no message'} | name=${otpError.name} | status=${(otpError as any).status || 'n/a'} | code=${(otpError as any).code || 'n/a'}`
                console.error('OTP ERROR DETAILS:', otpError, JSON.stringify(otpError))
                // #endregion
                setError(`Erreur lors de l'envoi du code: ${debugMsg}`)
                setFormLoading(false)
                return
            }

            setStep('otp')
            setFormLoading(false)
        } catch (err) {
            console.error('Login error:', err)
            setError(`Une erreur est survenue: ${(err as any)?.message || 'unknown'}`)
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
                            disabled={formLoading || !email}
                            className="w-full bg-[#0080A3] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#006280] focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0080A3] flex items-center justify-center gap-2"
                        >
                            {formLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Envoi en cours...
                                </>
                            ) : (
                                <>
                                    Se connecter
                                    <ArrowRight className="h-5 w-5" />
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
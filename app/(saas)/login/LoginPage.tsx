'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { sendLoginEvent } from '@/lib/gtm'
import { ArrowRight, Clock } from 'lucide-react'
import { SIGNUP_HREF } from '@/lib/signup-utm-hrefs'
import { AUTH_PATHS, authRedirectUrl, isAuthRateLimited } from '@/lib/auth-email-links'
import { finalizePendingSignup, getPendingSignup } from '@/lib/signup-finalize'
import PasswordInput from '@/components/auth/PasswordInput'
import OTPVerification from '@/components/auth/OTPVerification'
import AuthShell, { EmailField, AuthLoading, AUTH_LINK_CLASS, AUTH_PRIMARY_BUTTON_CLASS } from '@/components/auth/AuthShell'

type LoginError = null | 'invalid' | 'unconfirmed' | 'generic'
// email → mot de passe (défaut) ou code (ancien compte sans mot de passe choisi)
type LoginStep = 'email' | 'password' | 'code'

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { signIn, signInWithOtp, verifyOtp, user, loading } = useAuth()

    // Pre-fill email from URL params (e.g., /login?email=user@example.com)
    const emailFromUrl = searchParams.get('email') || ''

    const [step, setStep] = useState<LoginStep>('email')
    const [email, setEmail] = useState(emailFromUrl)
    const [password, setPassword] = useState('')
    const [loginError, setLoginError] = useState<LoginError>(null)
    const [formLoading, setFormLoading] = useState(false)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const [isRateLimited, setIsRateLimited] = useState(false)
    const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
    const isSubmittingRef = useRef(false)
    const rateLimitResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearRateLimitTimer = () => {
        if (rateLimitResetTimeoutRef.current) {
            clearTimeout(rateLimitResetTimeoutRef.current)
            rateLimitResetTimeoutRef.current = null
        }
    }

    useEffect(() => () => clearRateLimitTimer(), [])

    // Redirect authenticated users (sauf pendant notre propre connexion : on redirige après l'événement GTM)
    useEffect(() => {
        if (!loading) {
            if (user) {
                if (!isSubmittingRef.current) router.push('/dashboard/registries')
            } else {
                setIsCheckingAuth(false)
            }
        }
    }, [user, loading, router])

    const startRateLimit = () => {
        setIsRateLimited(true)
        clearRateLimitTimer()
        rateLimitResetTimeoutRef.current = setTimeout(() => {
            setIsRateLimited(false)
            rateLimitResetTimeoutRef.current = null
        }, 60_000)
    }

    // Fin de connexion commune au mot de passe et au code.
    const completeLogin = async () => {
        // Inscription confirmée sur un autre appareil : le profil n'a pas encore été créé.
        const { data: { session } } = await supabase.auth.getSession()
        if (session && getPendingSignup(session)) {
            try {
                await finalizePendingSignup(session)
            } catch (finalizeErr) {
                console.error('[login] Finalisation inscription', finalizeErr)
            }
        }

        try {
            await sendLoginEvent('email')
        } catch (err) {
            console.error('[gtm] Login event tracking failed:', err)
        }
        router.push('/dashboard/registries')
    }

    const backToEmail = () => {
        isSubmittingRef.current = false
        setStep('email')
        setPassword('')
        setLoginError(null)
    }

    // Étape 1 : l'email décide de l'écran suivant.
    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoginError(null)
        setFormLoading(true)
        try {
            const response = await fetch('/api/auth/login-method', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            })
            if (!response.ok) throw new Error(`login-method ${response.status}`)
            const { method } = (await response.json()) as { method: 'password' | 'code' }

            if (method === 'code') {
                const { error } = await signInWithOtp(email.trim(), false)
                if (error) {
                    if (isAuthRateLimited(error)) startRateLimit()
                    else {
                        console.error('Login error:', error)
                        setLoginError('generic')
                    }
                    return
                }
                isSubmittingRef.current = true // redirection après l'événement GTM, pas dès la session
                setStep('code')
            } else {
                setStep('password')
            }
        } catch (err) {
            console.error('Login error:', err)
            setLoginError('generic')
        } finally {
            setFormLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoginError(null)
        setResendState('idle')
        setFormLoading(true)
        isSubmittingRef.current = true

        try {
            const { error } = await signIn(email.trim(), password)

            if (error) {
                isSubmittingRef.current = false
                const code = (error as { code?: string }).code
                if (isAuthRateLimited(error)) {
                    startRateLimit()
                } else if (code === 'email_not_confirmed' || /not confirmed/i.test(error.message)) {
                    setLoginError('unconfirmed')
                } else if (code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
                    setLoginError('invalid')
                } else {
                    console.error('Login error:', error)
                    setLoginError('generic')
                }
                setFormLoading(false)
                return
            }

            clearRateLimitTimer()
            setIsRateLimited(false)
            await completeLogin()
        } catch (err) {
            console.error('Login error:', err)
            isSubmittingRef.current = false
            setLoginError('generic')
            setFormLoading(false)
        }
    }

    const handleResendConfirmation = async () => {
        setResendState('sending')
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email.trim(),
            options: { emailRedirectTo: authRedirectUrl(AUTH_PATHS.confirmSignup) },
        })
        if (error && isAuthRateLimited(error)) startRateLimit()
        setResendState(error ? 'error' : 'sent')
    }

    if (loading || isCheckingAuth) {
        return <AuthLoading />
    }

    // Ancien compte : code à 6 chiffres, comme avant MAY-6.
    if (step === 'code') {
        return (
            <OTPVerification
                email={email.trim()}
                onVerify={(code) => verifyOtp(email.trim(), code)}
                onSuccess={completeLogin}
                onBack={backToEmail}
                onResend={() => signInWithOtp(email.trim(), false)}
                title="Connexion"
            />
        )
    }

    return (
        <AuthShell
            title="Connexion"
            subtitle={
                step === 'password' ? (
                    <p>
                        {email.trim()} ·{' '}
                        <button type="button" onClick={backToEmail} className={AUTH_LINK_CLASS}>
                            Modifier
                        </button>
                    </p>
                ) : (
                    <p>Connectez-vous à votre espace.</p>
                )
            }
        >
            <form className="space-y-6" onSubmit={step === 'email' ? handleEmailSubmit : handleSubmit}>
                {isRateLimited && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="flex items-start gap-3 p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-sans"
                    >
                        <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-medium">Veuillez patienter quelques instants</p>
                            <p className="text-sm text-amber-700">
                                Pour des raisons de sécurité, nous avons temporairement suspendu les nouvelles
                                tentatives. Réessayez d&apos;ici quelques minutes.
                            </p>
                        </div>
                    </div>
                )}

                {loginError === 'invalid' && (
                    <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-600 text-sm">
                            Email ou mot de passe incorrect.{' '}
                            <Link href={AUTH_PATHS.forgotPassword} className="font-medium underline">
                                Mot de passe oublié ?
                            </Link>
                        </p>
                    </div>
                )}

                {loginError === 'unconfirmed' && (
                    <div role="alert" className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                        <p className="text-amber-800 text-sm">
                            Confirmez votre adresse email avant de vous connecter : cliquez sur le lien reçu à
                            l&apos;inscription.
                        </p>
                        {resendState === 'sent' ? (
                            <p className="text-sm font-medium text-amber-800">Email de confirmation renvoyé.</p>
                        ) : (
                            <button
                                type="button"
                                onClick={handleResendConfirmation}
                                disabled={resendState === 'sending' || isRateLimited}
                                className="text-sm font-medium text-amber-900 underline hover:text-amber-700 disabled:opacity-50"
                            >
                                Renvoyer l&apos;email de confirmation
                            </button>
                        )}
                        {resendState === 'error' && !isRateLimited && (
                            <p className="text-sm text-red-600">Envoi impossible. Veuillez réessayer.</p>
                        )}
                    </div>
                )}

                {loginError === 'generic' && (
                    <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-600 text-sm">Une erreur est survenue. Veuillez réessayer.</p>
                    </div>
                )}

                {step === 'email' && (
                    <EmailField value={email} onChange={(value) => {
                        setEmail(value)
                        setLoginError(null)
                    }} />
                )}

                {step === 'password' && (
                <PasswordInput
                    id="password"
                    label="Mot de passe"
                    value={password}
                    onChange={(value) => {
                        setPassword(value)
                        setLoginError(null)
                    }}
                    autoComplete="current-password"
                    labelAside={
                        <Link href={AUTH_PATHS.forgotPassword} className={`text-sm ${AUTH_LINK_CLASS}`}>
                            Mot de passe oublié ?
                        </Link>
                    }
                />
                )}

                <button
                    type="submit"
                    disabled={isRateLimited || formLoading || !email || (step === 'password' && !password)}
                    aria-busy={formLoading}
                    className={AUTH_PRIMARY_BUTTON_CLASS}
                >
                    {formLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" aria-hidden="true" />
                            {step === 'email' ? 'Vérification...' : 'Connexion en cours...'}
                        </>
                    ) : (
                        <>
                            {step === 'email' ? 'Continuer' : 'Se connecter'}
                            <ArrowRight className="h-5 w-5" aria-hidden="true" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                    Pas encore de compte ?{' '}
                    <Link href={SIGNUP_HREF.login} className={AUTH_LINK_CLASS}>
                        Créer un compte
                    </Link>
                </p>
            </div>
        </AuthShell>
    )
}

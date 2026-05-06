'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image';
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import {
  sendGoogleAdsSignupConversionWithUserData,
  sendSignUpEvent,
} from '@/lib/gtm'
import type { CompleteSignUpAcquisitionFields } from '@/lib/types/complete-signup-payload'
import OTPVerification from '@/components/auth/OTPVerification'
import CompanySectorSelector, { IndustrySelection } from '@/components/CompanySectorSelector'
import SecurityLogosGrid from '@/components/ui/SecurityLogosGrid'
import { User, Building2, ArrowRight, Mail, Info, Lock, ShieldCheck } from 'lucide-react'
import { useAIActCountdown } from '@/app/conformite-ia/hooks/useAIActCountdown'
import {
  readStoredAttribution,
  hasMeaningfulAttribution,
  clearStoredAttribution,
} from '@/lib/tracking/capture-params'
import { planIdSchema } from '@/lib/validations/pricing'
import type { PlanId } from '@/lib/stripe/config/plans'

type SignupStep = 'form' | 'otp' | 'processing'

interface SignupFormData {
  email: string
  firstName: string
  lastName: string
  companyName: string
  mainIndustryId: string
  subCategoryId: string
}

export default function SignupPage() {
  // Router and auth
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signInWithOtp, verifyOtp, user, loading } = useAuth()

  /** `lead_id` depuis l’URL d’invitation (figé au montage pour éviter les courses avec l’URL). */
  const leadIdFromInviteRef = useRef<string | null>(null)
  useEffect(() => {
    const id = searchParams.get('lead_id')?.trim()
    if (id) {
      leadIdFromInviteRef.current = id
    }
  }, [searchParams])

  /** Intention d’achat depuis `?plan=` (validée) ; valeur invalide ignorée silencieusement. */
  const [intentPlan, setIntentPlan] = useState<PlanId | null>(null)
  useEffect(() => {
    const raw = searchParams.get('plan')
    if (raw == null || raw === '') {
      setIntentPlan(null)
      return
    }
    const parsed = planIdSchema.safeParse(raw.trim())
    if (parsed.success) {
      setIntentPlan(parsed.data)
    } else {
      setIntentPlan(null)
    }
  }, [searchParams])

  // Wizard steps
  const [signupStep, setSignupStep] = useState<SignupStep>('form')

  // Progressive form steps
  const [step, setStep] = useState(1)

  // Form data
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    firstName: '',
    lastName: '',
    companyName: '',
    mainIndustryId: '',
    subCategoryId: '',
  })

  // Industry selection state
  const [industrySelection, setIndustrySelection] = useState<IndustrySelection>({
    mainIndustryId: '',
    subCategoryId: ''
  })
  const [industryError, setIndustryError] = useState('')

  // UI state
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const daysLeft = useAIActCountdown()

  const inputFocusClass =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:border-transparent'

  const signupHeadingAccentClass = 'text-3xl font-bold text-[#0080A3]'

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

  // Loading state
  if (loading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification...</p>
        </div>
      </div>
    )
  }

  // ========== FORM HANDLERS ==========

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    // Clear email error when typing
    if (field === 'email') {
      setEmailError('')
    }
  }

  const handleEmailBlur = async () => {
    const email = formData.email.trim()

    // Don't check if email is empty
    if (!email) {
      setEmailError('')
      return
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('Format d\'email invalide')
      return
    }

    // Check if email already exists
    setCheckingEmail(true)
    setEmailError('')

    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setEmailError(data.error || 'Erreur lors de la vérification')
        return
      }

      if (data.exists) {
        setEmailError('Cet email est déjà utilisé. Veuillez vous connecter.')
      }
    } catch (err) {
      console.error('Error checking email:', err)
      // Don't show error to user for network issues
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleNextStep = () => {
    setError('')

    const firstName = formData.firstName.trim()
    const lastName = formData.lastName.trim()
    const email = formData.email.trim()

    if (!firstName || !lastName || !email) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('Format d\'email invalide')
      return
    }

    if (emailError) return

    setStep(2)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFormLoading(true)

    // Validate required fields
    if (!formData.email || !formData.firstName || !formData.lastName ||
      !formData.companyName || !formData.mainIndustryId || !formData.subCategoryId) {
      setError('Veuillez remplir tous les champs obligatoires')
      if (!formData.mainIndustryId || !formData.subCategoryId) {
        setIndustryError('Veuillez sélectionner un secteur d\'activité et une sous-catégorie')
      }
      setFormLoading(false)
      return
    }

    // Validate terms acceptance
    if (!acceptTerms) {
      setError('Vous devez accepter les Conditions Générales d\'Utilisation')
      setFormLoading(false)
      return
    }

    try {
      // Send OTP to email (allow user creation)
      const { error: otpError } = await signInWithOtp(formData.email, true)

      if (otpError) {
        if (otpError.message?.includes('already registered') ||
          otpError.message?.includes('User already registered')) {
          setError('Un compte existe déjà avec cette adresse email. Veuillez vous connecter.')
        } else {
          setError('Erreur lors de l\'envoi du code. Veuillez réessayer.')
        }
        setFormLoading(false)
        return
      }

      // Move to OTP step
      setSignupStep('otp')
      setFormLoading(false)
    } catch (err) {
      console.error('Signup error:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
      setFormLoading(false)
    }
  }

  // ========== OTP & PROFILE COMPLETION ==========

  const handleOtpSuccess = async () => {
    // OTP verified, move to processing step
    setSignupStep('processing')
    // Complete signup with profile data
    await completeSignup()
  }

  const completeSignup = async () => {
    try {
      // Get fresh session directly from Supabase (not from React context)
      // This ensures we have the token immediately after OTP verification
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('Session error:', sessionError)
        setError('Erreur de session. Veuillez réessayer.')
        setSignupStep('form')
        return
      }

      const storedAttr = readStoredAttribution()
      const acquisition: CompleteSignUpAcquisitionFields = {}
      if (storedAttr && hasMeaningfulAttribution(storedAttr)) {
        if (storedAttr.gclid?.trim()) acquisition.gclid = storedAttr.gclid.trim()
        if (storedAttr.utm_source?.trim()) acquisition.utm_source = storedAttr.utm_source.trim()
        if (storedAttr.utm_medium?.trim()) acquisition.utm_medium = storedAttr.utm_medium.trim()
        if (storedAttr.utm_campaign?.trim()) {
          acquisition.utm_campaign = storedAttr.utm_campaign.trim()
        }
      }

      // Call complete-signup API with fresh token
      const response = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          companyName: formData.companyName,
          mainIndustryId: formData.mainIndustryId,
          subCategoryId: formData.subCategoryId,
          ...acquisition,
          ...(intentPlan ? { planIntent: intentPlan } : {}),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création du profil')
      }

      const leadId = leadIdFromInviteRef.current
      if (leadId && session.user?.id) {
        try {
          const linkRes = await fetch('/api/leads/link-to-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ leadId }),
          })
          if (!linkRes.ok) {
            const errText = await linkRes.text().catch(() => '')
            console.error(
              '[signup] Liaison lead ignorée (non bloquant):',
              linkRes.status,
              errText
            )
          }
        } catch (linkErr) {
          console.error('[signup] Liaison lead ignorée (non bloquant):', linkErr)
        }
      } else {
        const attribution = readStoredAttribution()
        if (attribution && hasMeaningfulAttribution(attribution)) {
          try {
            const wdRes = await fetch('/api/leads/website-direct', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ attribution }),
            })
            if (wdRes.ok) {
              clearStoredAttribution()
            } else {
              const t = await wdRes.text().catch(() => '')
              console.error(
                '[signup] Lead website_direct ignoré (non bloquant):',
                wdRes.status,
                t
              )
            }
          } catch (wdErr) {
            console.error('[signup] Lead website_direct ignoré (non bloquant):', wdErr)
          }
        }
      }

      sendSignUpEvent('formulaire_landing', {
        userId: session.user?.id,
      })
      sendGoogleAdsSignupConversionWithUserData(formData.email)

      setTimeout(() => {
        router.push('/dashboard/registries')
      }, 500)
    } catch (err) {
      console.error('Complete signup error:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du profil')
      setSignupStep('form')
    }
  }


  // ========== RENDER STEPS ==========

  if (signupStep === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0080A3] mx-auto mb-6"></div>
          <p className="text-xl text-gray-700 font-medium">Création de votre compte...</p>
          <p className="text-gray-500 mt-2">Veuillez patienter quelques instants</p>
        </div>
      </div>
    )
  }

  if (signupStep === 'otp') {
    return (
      <OTPVerification
        email={formData.email}
        onVerify={(code) => verifyOtp(formData.email, code)}
        onSuccess={handleOtpSuccess}
        onBack={() => setSignupStep('form')}
        onResend={() => signInWithOtp(formData.email, true)}
      />
    )
  }

  // Form step (default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl w-full space-y-8">
        <div className="flex justify-center">
          <Image
            src="/logos/logo-maydai/logo-maydai-complet.png"
            alt="MaydAI Logo"
            width={200}
            height={50}
            className="w-auto"
            priority
          />
        </div>

        <div className="text-center flex flex-col gap-2 mb-8">
          <h1 className={signupHeadingAccentClass}>Créer un compte</h1>
          <p className="text-base font-bold text-slate-900">
            Commencez votre parcours de conformité AI Act.
          </p>
          {step === 1 && (
            <>
              <p className="text-base font-bold text-slate-900">
                Évaluation rapide, intuitive et strictement confidentielle.
              </p>
              <p
                className="text-base font-bold text-slate-900"
                role="timer"
                aria-live="polite"
              >
                Plus que{' '}
                <span className={signupHeadingAccentClass}>
                  {daysLeft} jours
                </span>{' '}
                avant le plein déploiement de l&apos;AI Act
              </p>
            </>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault()
                handleNextStep()
              }}
            >
              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className={`w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 transition-colors ${inputFocusClass}`}
                      placeholder="Jean"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className={`w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 transition-colors ${inputFocusClass}`}
                      placeholder="Dupont"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm text-gray-500">
                <Info className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" aria-hidden="true" />
                <p id="signup-email-description">
                  L&apos;adresse email permet de créer le compte et de recevoir votre code d&apos;activation.
                </p>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
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
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    onBlur={handleEmailBlur}
                    aria-describedby={
                      emailError
                        ? 'signup-email-description signup-email-error'
                        : 'signup-email-description'
                    }
                    aria-invalid={emailError ? true : undefined}
                    className={`w-full px-4 py-3 pl-10 pr-10 border rounded-lg bg-white text-gray-900 placeholder-gray-500 transition-colors ${inputFocusClass} ${emailError ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="votre@email.com"
                  />
                  {checkingEmail && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0080A3]"></div>
                    </div>
                  )}
                </div>
                {emailError && (
                  <p id="signup-email-error" className="mt-1 text-sm text-red-600" role="alert">
                    {emailError}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                disabled={checkingEmail || !!emailError}
                className="w-full bg-[#0080A3] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#006280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0080A3] flex items-center justify-center gap-2"
              >
                Suivant
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleFormSubmit}>
              <p className="text-sm text-gray-600">
                Ces informations permettent de créer des rapports de conformité plus précis et adaptés à votre secteur vis-à-vis de l&apos;IA Act.
              </p>

              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  Entreprise <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    autoComplete="organization"
                    required
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className={`w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 transition-colors ${inputFocusClass}`}
                    placeholder="Nom de votre entreprise"
                  />
                </div>
              </div>

              {/* Industry */}
              <div>
                <CompanySectorSelector
                  value={industrySelection}
                  onChange={(selection) => {
                    setIndustrySelection(selection)
                    setFormData(prev => ({
                      ...prev,
                      mainIndustryId: selection.mainIndustryId,
                      subCategoryId: selection.subCategoryId
                    }))
                    setIndustryError('')
                    setError('')
                  }}
                  error={industryError}
                  required
                />
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start gap-3">
                <input
                  id="acceptTerms"
                  name="acceptTerms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className={`mt-1 h-4 w-4 rounded border-gray-300 text-[#0080A3] cursor-pointer focus-visible:ring-offset-2 ${inputFocusClass}`}
                  required
                />
                <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                  J&apos;accepte les{' '}
                  <Link
                    href="/conditions-generales"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#0080A3] hover:text-[#006280] underline transition-colors"
                  >
                    Conditions Générales d&apos;Utilisation
                  </Link>
                  {' '}<span className="text-red-500">*</span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={formLoading}
                  className="w-full sm:w-auto px-5 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Retour
                </button>

                <button
                  type="submit"
                  disabled={formLoading || !!emailError || !!industryError || checkingEmail || !acceptTerms}
                  className="w-full bg-[#0080A3] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#006280] focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0080A3] flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      Créer mon compte
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Vous avez déjà un compte ?{' '}
              <Link
                href="/login"
                className="font-medium text-[#0080A3] hover:text-[#006280] transition-colors"
              >
                Se connecter
              </Link>
            </p>
          </div>

          {step === 1 ? (
            <div className="mt-8 w-full max-w-full">
              <SecurityLogosGrid />
            </div>
          ) : (
            <div className="mt-8 w-full flex justify-center items-center gap-6 text-slate-400">
              <div className="flex items-center gap-1.5">
                <Lock size={14} aria-hidden="true" />
                <span className="text-[11px] uppercase tracking-wider font-semibold">
                  Données chiffrées
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} aria-hidden="true" />
                <span className="text-[11px] uppercase tracking-wider font-semibold">
                  Conforme RGPD
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image';
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { AUTH_PATHS, authRedirectUrl, isAuthRateLimited } from '@/lib/auth-email-links'
import { PASSWORD_HINT, validateNewPassword } from '@/lib/password-policy'
import {
  acquisitionFields,
  computeEffectiveAttribution,
  finalizePendingSignup,
  PENDING_SIGNUP_KEY,
  type PendingSignup,
} from '@/lib/signup-finalize'
import PasswordInput from '@/components/auth/PasswordInput'
import AuthShell, { AUTH_LINK_CLASS } from '@/components/auth/AuthShell'
import CompanySectorSelector, { IndustrySelection } from '@/components/CompanySectorSelector'
import SecurityLogosGrid from '@/components/ui/SecurityLogosGrid'
import { User, Building2, ArrowRight, Mail, MailCheck, Info, Lock, ShieldCheck } from 'lucide-react'
import { useAIActCountdown } from '@/app/(marketing)/conformite-ia/hooks/useAIActCountdown'
import { planIdSchema } from '@/lib/validations/pricing'
import type { PlanId } from '@/lib/stripe/config/plans'

export interface PartnerSignupConfig {
  partnerName: string
  partnerLogoSrc: string
  partnerLogoAlt: string
  partnerLogoWidth?: number
  partnerLogoHeight?: number
  partnerWebsiteUrl?: string
  badgeText?: string
  headline: string
  subheadline: string
  secondarySubheadline?: string
  partnerTitle: string
  partnerDescription: string
  partnerHighlights?: string[]
  freeNoteTitle?: string
  freeNoteSubtitle?: string
  defaultAttribution: {
    utm_source: string
    utm_medium: string
    utm_campaign?: string
  }
}

export interface SignupPageProps {
  partnerConfig?: PartnerSignupConfig
}

type SignupStep = 'form' | 'check-email' | 'processing'

interface SignupFormData {
  email: string
  firstName: string
  lastName: string
  companyName: string
  mainIndustryId: string
  subCategoryId: string
}

export default function SignupPage({ partnerConfig }: SignupPageProps = {}) {
  // Router and auth
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()

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
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

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

  const { days, label, isPassed, isMounted } = useAIActCountdown()

  const inputFocusClass =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:border-transparent'

  const signupHeadingAccentClass = 'text-3xl font-bold text-[#0080A3]'

  // Redirect authenticated users
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (signupStep !== 'processing') router.push('/dashboard/registries')
      } else {
        setIsCheckingAuth(false)
      }
    }
  }, [user, loading, router, signupStep])

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
      console.error('[signup] Vérification email', err)
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

    const passwordError = validateNewPassword(password, passwordConfirmation)
    if (passwordError) {
      setError(passwordError)
      return
    }

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

    const attribution = computeEffectiveAttribution(partnerConfig?.defaultAttribution)
    const pending: PendingSignup = {
      profile: {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName,
        mainIndustryId: formData.mainIndustryId,
        subCategoryId: formData.subCategoryId,
        ...acquisitionFields(attribution),
        ...(intentPlan ? { planIntent: intentPlan } : {}),
      },
      leadId: leadIdFromInviteRef.current,
      attribution,
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password,
        options: {
          emailRedirectTo: authRedirectUrl(AUTH_PATHS.confirmSignup),
          data: { [PENDING_SIGNUP_KEY]: pending },
        },
      })

      // Email déjà confirmé : GoTrue renvoie un utilisateur sans identité plutôt qu'une erreur.
      const alreadyRegistered =
        (signUpError as { code?: string } | null)?.code === 'user_already_exists' ||
        /already registered/i.test(signUpError?.message ?? '') ||
        (!signUpError && data.user?.identities?.length === 0)

      if (alreadyRegistered) {
        setError('Un compte existe déjà avec cette adresse email. Veuillez vous connecter.')
      } else if (signUpError) {
        console.error('[signup] signUp', signUpError)
        const code = (signUpError as { code?: string }).code
        setError(
          isAuthRateLimited(signUpError)
            ? 'Trop de demandes. Réessayez d’ici quelques minutes.'
            : code === 'weak_password'
              ? 'Mot de passe trop faible. Choisissez-en un plus long.'
              : 'Erreur lors de la création du compte. Veuillez réessayer.'
        )
      } else if (data.session) {
        // Confirmation email désactivée côté serveur : session immédiate, on finalise ici.
        setSignupStep('processing')
        await finalizePendingSignup(data.session)
        router.refresh()
        router.push('/dashboard/registries')
        return
      } else {
        setSignupStep('check-email')
      }
      setFormLoading(false)
    } catch (err) {
      console.error('[signup] Création du compte', err)
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.')
      setSignupStep('form')
      setFormLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    setResendState('sending')
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: formData.email.trim(),
      options: { emailRedirectTo: authRedirectUrl(AUTH_PATHS.confirmSignup) },
    })
    setResendState(resendError ? 'error' : 'sent')
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

  if (signupStep === 'check-email') {
    return (
      <AuthShell title="Confirmez votre adresse email">
        <div className="text-center space-y-4">
          <MailCheck className="h-12 w-12 text-[#0080A3] mx-auto" aria-hidden="true" />
          <p className="text-gray-700 break-words">
            Un email de confirmation a été envoyé à <strong>{formData.email.trim()}</strong>. Cliquez sur le lien
            pour activer votre compte.
          </p>
          {resendState === 'sent' ? (
            <p className="text-sm font-medium text-[#0080A3]">Email renvoyé.</p>
          ) : (
            <p className="text-sm text-gray-600">
              Rien reçu ?{' '}
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendState === 'sending'}
                className={`${AUTH_LINK_CLASS} underline disabled:opacity-50`}
              >
                Renvoyer l&apos;email
              </button>
            </p>
          )}
          {resendState === 'error' && (
            <p role="alert" className="text-sm text-red-600">
              Envoi impossible. Réessayez dans quelques minutes.
            </p>
          )}
        </div>
      </AuthShell>
    )
  }

  // Form step (default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl w-full space-y-8">
        {partnerConfig ? (
          <div className="flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 rounded-2xl border border-slate-200 bg-white/80 px-5 py-3 shadow-sm">
              <Image
                src="/logos/logo-maydai/logo-maydai-complet.png"
                alt="MaydAI Logo"
                width={170}
                height={42}
                className="h-10 w-auto object-contain"
                priority
              />
              <span className="text-slate-300 font-light text-2xl select-none" aria-hidden="true">
                ×
              </span>
              <Image
                src={partnerConfig.partnerLogoSrc}
                alt={partnerConfig.partnerLogoAlt}
                width={partnerConfig.partnerLogoWidth ?? 180}
                height={partnerConfig.partnerLogoHeight ?? 52}
                className="h-11 w-auto object-contain"
                priority
              />
            </div>
          </div>
        ) : (
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
        )}

        <div className="text-center flex flex-col gap-2 mb-8">
          {partnerConfig?.badgeText ? (
            <span className="inline-flex items-center gap-1.5 self-center px-3 py-1 rounded-full text-xs font-semibold bg-[#0080A3]/10 text-[#0080A3] mb-1">
              {partnerConfig.badgeText}
            </span>
          ) : null}
          <h1 className={signupHeadingAccentClass}>
            {partnerConfig ? partnerConfig.headline : 'Créer un compte'}
          </h1>
          <p className="text-base font-bold text-slate-900">
            {partnerConfig ? partnerConfig.subheadline : 'Commencez votre parcours de conformité AI Act.'}
          </p>
          {step === 1 && (
            <>
              <p className="text-base font-bold text-slate-900">
                {partnerConfig?.secondarySubheadline ?? 'Évaluation rapide, intuitive et strictement confidentielle.'}
              </p>
              {!isMounted ? (
                <div className="invisible" aria-hidden="true">
                  Chargement du compteur...
                </div>
              ) : isPassed ? (
                <p
                  className="text-base font-bold text-slate-900"
                  role="timer"
                  aria-live="polite"
                >
                  Depuis{' '}
                  <span className={signupHeadingAccentClass}>
                    {days} {label}
                  </span>
                  , l&apos;IA Act est en vigueur
                </p>
              ) : (
                <p
                  className="text-base font-bold text-slate-900"
                  role="timer"
                  aria-live="polite"
                >
                  Plus que{' '}
                  <span className={signupHeadingAccentClass}>
                    {days} {label}
                  </span>{' '}
                  avant le plein déploiement de l&apos;AI Act
                </p>
              )}
            </>
          )}
        </div>

        {partnerConfig && step === 1 && (
          <div className="bg-white/90 backdrop-blur-sm border border-[#0080A3]/20 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-slate-900">{partnerConfig.partnerTitle}</p>
              {partnerConfig.partnerWebsiteUrl ? (
                <a
                  href={partnerConfig.partnerWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-medium text-[#0080A3] hover:text-[#006280] transition-colors"
                >
                  {partnerConfig.partnerName}
                </a>
              ) : null}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mt-1.5">
              {partnerConfig.partnerDescription}
            </p>
            {partnerConfig.partnerHighlights && partnerConfig.partnerHighlights.length > 0 ? (
              <ul className="flex flex-wrap gap-2 mt-3 list-none m-0 p-0">
                {partnerConfig.partnerHighlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0080A3]" aria-hidden="true" />
                    {highlight}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

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
                  L&apos;adresse email permet de créer le compte et de recevoir votre lien d&apos;activation.
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

              <PasswordInput
                id="password"
                label="Mot de passe"
                value={password}
                onChange={(value) => {
                  setPassword(value)
                  setError('')
                }}
                autoComplete="new-password"
                hint={PASSWORD_HINT}
              />

              <PasswordInput
                id="password-confirmation"
                label="Confirmer le mot de passe"
                value={passwordConfirmation}
                onChange={(value) => {
                  setPasswordConfirmation(value)
                  setError('')
                }}
                autoComplete="new-password"
              />

              <div
                className="flex items-center justify-center gap-2 mb-4 p-3 bg-slate-50 rounded-md border border-slate-100"
                role="note"
                aria-label="Information sur la gratuité du compte"
              >
                <ShieldCheck
                  className="w-5 h-5 text-[#0080A3] shrink-0"
                  aria-hidden="true"
                />
                <p className="text-sm text-slate-600 font-medium">
                  {partnerConfig?.freeNoteTitle ?? 'Inscription gratuite.'}{' '}
                  <span className="text-slate-500 font-normal">
                    {partnerConfig?.freeNoteSubtitle ?? 'Aucune carte bancaire requise pour votre 1er registre.'}
                  </span>
                </p>
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
                      Création en cours...
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
            <div className="mt-8 pt-6 border-t border-slate-100 w-full max-w-full">
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

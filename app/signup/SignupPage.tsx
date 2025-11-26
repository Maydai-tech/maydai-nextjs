'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image';
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { validateSIREN, cleanSIREN, formatSIREN } from '@/lib/validation/siren'
import { getNAFSectorOptions } from '@/lib/constants/naf-sectors'
import OTPVerification from '@/components/auth/OTPVerification'
import { User, Building2, Briefcase, Phone, FileText, ArrowRight, CheckCircle, Mail } from 'lucide-react'

type SignupStep = 'form' | 'otp' | 'processing'

interface SignupFormData {
  email: string
  firstName: string
  lastName: string
  companyName: string
  industry: string
  phone: string
  siren: string
}

export default function SignupPage() {
  // Router and auth
  const router = useRouter()
  const { signInWithOtp, verifyOtp, user, loading } = useAuth()

  // Wizard steps
  const [step, setStep] = useState<SignupStep>('form')

  // Form data
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    firstName: '',
    lastName: '',
    companyName: '',
    industry: '',
    phone: '',
    siren: '',
  })

  // UI state
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [sirenError, setSirenError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [acceptTerms, setAcceptTerms] = useState(false)

  // NAF sectors for dropdown
  const nafSectors = getNAFSectorOptions()

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

  const handleSirenChange = (value: string) => {
    const cleaned = cleanSIREN(value)
    setFormData(prev => ({ ...prev, siren: cleaned }))

    // Validate SIREN in real-time
    if (cleaned && cleaned.length === 9) {
      if (!validateSIREN(cleaned)) {
        setSirenError('Numéro SIREN invalide')
      } else {
        setSirenError('')
      }
    } else if (cleaned.length > 0 && cleaned.length < 9) {
      setSirenError('Le SIREN doit contenir exactement 9 chiffres')
    } else {
      setSirenError('')
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFormLoading(true)

    // Validate required fields
    if (!formData.email || !formData.firstName || !formData.lastName ||
      !formData.companyName || !formData.industry) {
      setError('Veuillez remplir tous les champs obligatoires')
      setFormLoading(false)
      return
    }

    // Validate terms acceptance
    if (!acceptTerms) {
      setError('Vous devez accepter les Conditions Générales d\'Utilisation')
      setFormLoading(false)
      return
    }

    // Validate SIREN if provided
    if (formData.siren && !validateSIREN(formData.siren)) {
      setError('Numéro SIREN invalide')
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
      setStep('otp')
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
    setStep('processing')
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
        setStep('form')
        return
      }

      // Call complete-signup API with fresh token
      const response = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          companyName: formData.companyName,
          industry: formData.industry,
          phone: formData.phone || null,
          siren: formData.siren || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création du profil')
      }

      // Success! Redirect to dashboard
      router.push('/dashboard/registries')
    } catch (err) {
      console.error('Complete signup error:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du profil')
      setStep('form')
    }
  }


  // ========== RENDER STEPS ==========

  if (step === 'processing') {
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

  if (step === 'otp') {
    return (
      <OTPVerification
        email={formData.email}
        onVerify={(code) => verifyOtp(formData.email, code)}
        onSuccess={handleOtpSuccess}
        onBack={() => setStep('form')}
        onResend={() => signInWithOtp(formData.email, true)}
      />
    )
  }

  // Form step (default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
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
            Créer un compte
          </h2>
          <p className="mt-2 text-gray-600">
            Commencez votre parcours de conformité AI Act.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleFormSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

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
                  className={`w-full px-4 py-3 pl-10 pr-10 border rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:outline-none transition-colors ${emailError
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-[#0080A3] focus:ring-[#0080A3]'
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
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
            </div>

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
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
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
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                    placeholder="Dupont"
                  />
                </div>
              </div>
            </div>

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
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                  placeholder="Nom de votre entreprise"
                />
              </div>
            </div>

            {/* Industry */}
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                Secteur d'activité<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="industry"
                  name="industry"
                  required
                  value={formData.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors appearance-none"
                >
                  <option value="">Sélectionnez un secteur</option>
                  {nafSectors.map((sector) => (
                    <option key={sector.value} value={sector.value}>
                      {sector.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phone (optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone <span className="text-gray-500 text-xs">(optionnel)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>

            {/* SIREN (optional) */}
            <div>
              <label htmlFor="siren" className="block text-sm font-medium text-gray-700 mb-2">
                SIREN <span className="text-gray-500 text-xs">(optionnel)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="siren"
                  name="siren"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={formData.siren}
                  onChange={(e) => handleSirenChange(e.target.value)}
                  className={`w-full px-4 py-3 pl-10 border rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:outline-none transition-colors ${sirenError
                    ? 'border-red-300 focus:border-red-500'
                    : formData.siren && !sirenError
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-gray-300 focus:border-[#0080A3]'
                    }`}
                  placeholder="123 456 789"
                />
              </div>
              {sirenError && (
                <p className="mt-1 text-sm text-red-600">{sirenError}</p>
              )}
              {formData.siren && !sirenError && formData.siren.length === 9 && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  SIREN valide : {formatSIREN(formData.siren)}
                </p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-3">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0080A3] focus:ring-[#0080A3] cursor-pointer"
                required
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                J'accepte les{' '}
                <Link
                  href="/conditions-generales"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#0080A3] hover:text-[#006280] underline transition-colors"
                >
                  Conditions Générales d'Utilisation
                </Link>
                {' '}<span className="text-red-500">*</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={formLoading || !!sirenError || !!emailError || checkingEmail || !acceptTerms}
              className="w-full bg-[#0080A3] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#006280] focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0080A3] flex items-center justify-center gap-2"
            >
              {formLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Envoi en cours...
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

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
        </div>
      </div>
    </div>
  )
}

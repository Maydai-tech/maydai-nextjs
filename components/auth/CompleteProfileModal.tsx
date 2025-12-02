'use client'

import { useState, useEffect } from 'react'
import { X, User, Building2, Briefcase, Phone, FileText, CheckCircle } from 'lucide-react'
import { validateSIREN, cleanSIREN, formatSIREN } from '@/lib/validation/siren'
import { getNAFSectorOptions } from '@/lib/constants/naf-sectors'

interface CompleteProfileModalProps {
  isOpen: boolean
  initialData?: {
    firstName?: string
    lastName?: string
    companyName?: string
    industry?: string
    phone?: string
    siren?: string
  }
  onComplete: (data: {
    firstName: string
    lastName: string
    companyName: string
    industry: string
    phone?: string
    siren?: string
  }) => Promise<void>
}

export default function CompleteProfileModal({
  isOpen,
  initialData,
  onComplete
}: CompleteProfileModalProps) {
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    companyName: initialData?.companyName || '',
    industry: initialData?.industry || '',
    phone: initialData?.phone || '',
    siren: initialData?.siren || ''
  })

  const [error, setError] = useState('')
  const [sirenError, setSirenError] = useState('')
  const [loading, setLoading] = useState(false)

  // Update form data when initialData changes (async loading)
  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        companyName: initialData.companyName || '',
        industry: initialData.industry || '',
        phone: initialData.phone || '',
        siren: initialData.siren || ''
      })
    }
  }, [initialData])

  const nafSectors = getNAFSectorOptions()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSirenChange = (value: string) => {
    const cleaned = cleanSIREN(value)
    setFormData(prev => ({ ...prev, siren: cleaned }))

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate required fields
    if (!formData.firstName.trim()) {
      setError('Le prénom est obligatoire')
      setLoading(false)
      return
    }

    if (!formData.lastName.trim()) {
      setError('Le nom est obligatoire')
      setLoading(false)
      return
    }

    if (!formData.companyName.trim()) {
      setError('Le nom de l\'entreprise est obligatoire')
      setLoading(false)
      return
    }

    if (!formData.industry) {
      setError('Le secteur d\'activité est obligatoire')
      setLoading(false)
      return
    }

    // Validate SIREN if provided
    if (formData.siren && !validateSIREN(formData.siren)) {
      setError('Numéro SIREN invalide')
      setLoading(false)
      return
    }

    try {
      await onComplete({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        companyName: formData.companyName.trim(),
        industry: formData.industry,
        phone: formData.phone || undefined,
        siren: formData.siren || undefined
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Complétez votre profil
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Ces informations sont nécessaires pour accéder à votre espace.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

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
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
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
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
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
                required
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                placeholder="Nom de votre entreprise"
              />
            </div>
          </div>

          {/* Industry */}
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
              Secteur d'activité <span className="text-red-500">*</span>
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
                className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors appearance-none"
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
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
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
                className={`w-full px-4 py-2.5 pl-10 border rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:outline-none transition-colors ${sirenError
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !!sirenError}
            className="w-full bg-[#0080A3] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#006280] focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0080A3] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Enregistrement...
              </>
            ) : (
              'Valider mon profil'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { User, Phone } from 'lucide-react'
import { validateSIREN, cleanSIREN, formatSIREN } from '@/lib/validation/siren'
import CompanySectorSelector, { IndustrySelection } from '@/components/CompanySectorSelector'
import ProfileGovernanceFields from '@/components/Profile/ProfileGovernanceFields'
import type { ProfileType } from '@/lib/validations/governance-scores'

interface CompleteProfileModalProps {
  isOpen: boolean
  initialData?: {
    firstName?: string
    lastName?: string
    companyName?: string
    mainIndustryId?: string
    subCategoryId?: string
    phone?: string
    siren?: string
    profileType?: ProfileType
    nafCode?: string
    sirenVerifiedPappers?: boolean
    academicInstitution?: string
    academicDepartment?: string
  }
  onComplete: (data: {
    firstName: string
    lastName: string
    companyName: string
    mainIndustryId: string
    subCategoryId: string
    phone?: string
    siren?: string
    profileType: ProfileType
    nafCode?: string
    sirenVerifiedPappers: boolean
    academicInstitution?: string
    academicDepartment?: string
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
    mainIndustryId: initialData?.mainIndustryId || '',
    subCategoryId: initialData?.subCategoryId || '',
    phone: initialData?.phone || '',
    siren: initialData?.siren || '',
    profileType: initialData?.profileType || 'company',
    nafCode: initialData?.nafCode || '',
    sirenVerifiedPappers: initialData?.sirenVerifiedPappers || false,
    academicInstitution: initialData?.academicInstitution || '',
    academicDepartment: initialData?.academicDepartment || '',
  })

  const [industrySelection, setIndustrySelection] = useState<IndustrySelection>({
    mainIndustryId: initialData?.mainIndustryId || '',
    subCategoryId: initialData?.subCategoryId || ''
  })

  const [error, setError] = useState('')
  const [sirenError, setSirenError] = useState('')
  const [industryError, setIndustryError] = useState('')
  const [loading, setLoading] = useState(false)

  // Update form data when initialData changes (async loading)
  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        companyName: initialData.companyName || '',
        mainIndustryId: initialData.mainIndustryId || '',
        subCategoryId: initialData.subCategoryId || '',
        phone: initialData.phone || '',
        siren: initialData.siren || '',
        profileType: initialData.profileType || 'company',
        nafCode: initialData.nafCode || '',
        sirenVerifiedPappers: initialData.sirenVerifiedPappers || false,
        academicInstitution: initialData.academicInstitution || '',
        academicDepartment: initialData.academicDepartment || '',
      })
      setIndustrySelection({
        mainIndustryId: initialData.mainIndustryId || '',
        subCategoryId: initialData.subCategoryId || ''
      })
    }
  }, [initialData])

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

    const isAcademic = formData.profileType === 'academic'
    const resolvedCompanyName = formData.companyName.trim() || (isAcademic ? formData.academicInstitution.trim() : '')

    if (isAcademic) {
      if (!formData.academicInstitution.trim()) {
        setError('Le nom de l\'établissement est obligatoire')
        setLoading(false)
        return
      }
      if (!formData.academicDepartment.trim()) {
        setError('La promotion, la classe ou le laboratoire est obligatoire')
        setLoading(false)
        return
      }
    } else if (!resolvedCompanyName) {
      setError('Le nom de l\'entreprise est obligatoire')
      setLoading(false)
      return
    }

    if (!formData.mainIndustryId || !formData.subCategoryId) {
      setError('Le secteur d\'activité et la sous-catégorie sont obligatoires')
      if (!formData.mainIndustryId || !formData.subCategoryId) {
        setIndustryError('Veuillez sélectionner un secteur d\'activité et une sous-catégorie')
      }
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
        companyName: resolvedCompanyName,
        mainIndustryId: formData.mainIndustryId,
        subCategoryId: formData.subCategoryId,
        phone: formData.phone || undefined,
        siren: isAcademic ? undefined : formData.siren || undefined,
        profileType: formData.profileType,
        nafCode: formData.nafCode || undefined,
        sirenVerifiedPappers: isAcademic ? false : formData.sirenVerifiedPappers,
        academicInstitution: formData.academicInstitution || undefined,
        academicDepartment: formData.academicDepartment || undefined,
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

          <ProfileGovernanceFields
            profileType={formData.profileType}
            onProfileTypeChange={(profileType) => {
              setFormData((prev) => ({
                ...prev,
                profileType,
                sirenVerifiedPappers: profileType === 'academic' ? false : prev.sirenVerifiedPappers,
              }))
              setError('')
            }}
            companyName={formData.companyName}
            onCompanyNameChange={(name) => handleInputChange('companyName', name)}
            siren={formData.siren}
            onSirenChange={handleSirenChange}
            nafCode={formData.nafCode}
            onNafCodeChange={(naf) => handleInputChange('nafCode', naf)}
            sirenVerifiedPappers={formData.sirenVerifiedPappers}
            onSirenVerifiedPappersChange={(verified) =>
              setFormData((prev) => ({ ...prev, sirenVerifiedPappers: verified }))
            }
            academicInstitution={formData.academicInstitution}
            onAcademicInstitutionChange={(institution) =>
              handleInputChange('academicInstitution', institution)
            }
            academicDepartment={formData.academicDepartment}
            onAcademicDepartmentChange={(department) =>
              handleInputChange('academicDepartment', department)
            }
            onIndustryAutoSelect={(mapping) => {
              setIndustrySelection({
                mainIndustryId: mapping.mainIndustryId,
                subCategoryId: mapping.subCategoryId,
              })
              setFormData((prev) => ({
                ...prev,
                mainIndustryId: mapping.mainIndustryId,
                subCategoryId: mapping.subCategoryId,
              }))
              setIndustryError('')
              setError('')
            }}
            disabled={loading}
          />
          {sirenError && formData.profileType !== 'academic' ? (
            <p className="text-sm text-red-600">{sirenError}</p>
          ) : null}
          {formData.profileType !== 'academic' && formData.siren && !sirenError && formData.siren.length === 9 ? (
            <p className="text-sm text-green-600">SIREN valide : {formatSIREN(formData.siren)}</p>
          ) : null}

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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !!sirenError || !!industryError}
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

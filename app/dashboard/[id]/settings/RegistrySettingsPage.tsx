'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { AlertTriangle, Save, Edit, X, Settings, ArrowLeft, ShieldCheck } from 'lucide-react'
import {
  REGISTRE_MAYDAI_SEAL_ALT,
  REGISTRE_MAYDAI_SEAL_SRC,
} from '../components/RegistreMaydaiBadge'
import DeleteRegistryModal from '../components/DeleteRegistryModal'
import ConfirmCentralizedRegistryModal from '../components/ConfirmCentralizedRegistryModal'
import EditCentralizedRegistryModal from '../components/EditCentralizedRegistryModal'
import { REGISTRY_TYPES, isCustomType, getTypeLabel } from '@/lib/registry-types'
import CompanySectorSelector, { type IndustrySelection } from '@/components/CompanySectorSelector'
import RegistryCompletenessScore from '@/components/Registry/RegistryCompletenessScore'
import Tooltip from '@/components/Tooltip'
import { getIndustryDisplayText, getIndustryLabel, getSubCategoryLabel } from '@/lib/constants/industries'

const REGISTRY_INPUT_BASE =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:border-transparent transition-colors'

const HIGHLIGHT_RING_CLASS =
  'ring-2 ring-[#ffab5a] border-transparent transition-all duration-300'

function registryFieldClass(highlightMissing: boolean, isEmpty: boolean, extra = ''): string {
  const highlight = highlightMissing && isEmpty ? HIGHLIGHT_RING_CLASS : ''
  return `${REGISTRY_INPUT_BASE} ${highlight} ${extra}`.trim()
}

interface Company {
  id: string
  name: string
  industry: string
  sub_category_id?: string | null
  city: string
  country: string
  type?: string
  role?: string | null
  maydai_as_registry?: boolean
  is_centralized_registry?: boolean
  completeness_score?: number | null
  has_collaborators?: boolean
}

function isCompanyCentralized(company: Company): boolean {
  return (
    company.maydai_as_registry === true || company.is_centralized_registry === true
  )
}

/** Réponse GET/PUT company (+ champs métier optionnels du PUT). */
type CompanyApiPayload = Partial<Company> & {
  useCasesUpdated?: number
  registryScoresRecalculated?: number
}

/** Le PUT renvoie la ligne companies sans `role` ; on fusionne pour éviter un flash « accès refusé ». */
function mergeCompanyFromApi(
  previous: Company | null,
  payload: CompanyApiPayload
): Company {
  return {
    ...(previous ?? {}),
    ...payload,
    role:
      typeof payload.role === 'string'
        ? payload.role
        : previous?.role ?? null,
    has_collaborators:
      typeof payload.has_collaborators === 'boolean'
        ? payload.has_collaborators
        : previous?.has_collaborators ?? false,
  } as Company
}

function isAccessDeniedForSettings(company: Company | null): boolean {
  if (!company || company.role == null) return false
  return company.role !== 'owner'
}

export default function RegistrySettingsPage() {
  const router = useRouter()
  const resolvedParams = useParams()
  const { user, loading: authLoading, getAccessToken } = useAuth()
  const [isRefreshPending, startRefreshTransition] = useTransition()

  const [mounted, setMounted] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // General section state
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    country: ''
  })
  const [industrySelection, setIndustrySelection] = useState<IndustrySelection>({
    mainIndustryId: '',
    subCategoryId: '',
  })
  const [selectedType, setSelectedType] = useState('')
  const [customType, setCustomType] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [highlightMissing, setHighlightMissing] = useState(false)

  // Danger zone state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Centralized registry state
  const [showCentralizedRegistryModal, setShowCentralizedRegistryModal] = useState(false)
  const [showEditRegistryModal, setShowEditRegistryModal] = useState(false)
  const [confirmingRegistry, setConfirmingRegistry] = useState(false)
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null)

  const companyId = resolvedParams.id as string

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router, mounted])

  const applyOwnerFormFromCompany = useCallback((data: Company) => {
    setFormData({
      name: data.name || '',
      city: data.city || '',
      country: data.country || '',
    })
    setIndustrySelection({
      mainIndustryId: data.industry || '',
      subCategoryId: data.sub_category_id || '',
    })
    if (data.type) {
      if (isCustomType(data.type)) {
        setSelectedType('autre')
        setCustomType(data.type)
      } else {
        setSelectedType(data.type)
        setCustomType('')
      }
    } else {
      setSelectedType('')
      setCustomType('')
    }
  }, [])

  const refreshServerData = useCallback(() => {
    startRefreshTransition(() => {
      router.refresh()
    })
  }, [router])

  // Fetch company data
  useEffect(() => {
    const fetchCompany = async () => {
      if (!user || !companyId) return

      try {
        setLoading(true)
        const token = getAccessToken()
        const response = await fetch(`/api/companies/${companyId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("Vous n'avez pas accès à ce registre")
          }
          throw new Error('Erreur lors du chargement du registre')
        }

        const data = (await response.json()) as Company

        setCompany((prev) => mergeCompanyFromApi(prev, data))

        if (data.role !== 'owner') {
          return
        }

        applyOwnerFormFromCompany(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    if (mounted && user) {
      fetchCompany()
    }
  }, [user, companyId, mounted, getAccessToken, applyOwnerFormFromCompany])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    // Reset form data to company values
    if (company) {
      setFormData({
        name: company.name || '',
        city: company.city || '',
        country: company.country || ''
      })
      setIndustrySelection({
        mainIndustryId: company.industry || '',
        subCategoryId: company.sub_category_id || ''
      })
      // Reset type state
      if (company.type) {
        if (isCustomType(company.type)) {
          setSelectedType('autre')
          setCustomType(company.type)
        } else {
          setSelectedType(company.type)
          setCustomType('')
        }
      } else {
        setSelectedType('')
        setCustomType('')
      }
    }
    setIsEditing(false)
    setHighlightMissing(false)
    setError(null)
  }

  const handleHighlightRequest = () => {
    if (!isEditing) {
      setIsEditing(true)
    }
    setHighlightMissing(true)
    setTimeout(() => {
      const firstMissingField = document.querySelector(
        '#registry-form [data-missing="true"]'
      ) as HTMLElement | null
      if (firstMissingField) {
        firstMissingField.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (
          firstMissingField instanceof HTMLInputElement ||
          firstMissingField instanceof HTMLSelectElement ||
          firstMissingField instanceof HTMLTextAreaElement ||
          firstMissingField instanceof HTMLButtonElement
        ) {
          firstMissingField.focus({ preventScroll: true })
        }
      }
    }, 150)
  }

  const handleSave = async () => {
    if (!company) return

    try {
      setSaving(true)
      setSaveSuccess(false)
      const token = getAccessToken()

      // Determine the type value to send
      const typeValue = selectedType === 'autre' ? customType : selectedType

      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          type: typeValue || null
          ,
          mainIndustryId: industrySelection.mainIndustryId,
          subCategoryId: industrySelection.subCategoryId
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour')
      }

      const updatedCompany = await response.json()
      setCompany((prev) => mergeCompanyFromApi(prev, updatedCompany))
      setSaveSuccess(true)
      setIsEditing(false)
      setHighlightMissing(false)
      refreshServerData()

      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  const handleDeclareCentralizedRegistry = async () => {
    if (!company) return

    try {
      setConfirmingRegistry(true)
      setError(null)
      const token = getAccessToken()

      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ maydai_as_registry: true })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la déclaration du registre centralisé')
      }

      const updatedCompany = await response.json()
      setCompany((prev) => mergeCompanyFromApi(prev, updatedCompany))
      setShowCentralizedRegistryModal(false)
      refreshServerData()

      // Display success message with number of updated use cases
      const useCasesUpdated = updatedCompany.useCasesUpdated || 0
      if (useCasesUpdated > 0) {
        setSyncSuccessMessage(`${useCasesUpdated} cas d'usage ont été mis à jour automatiquement avec MaydAI comme registre centralisé`)
        setTimeout(() => setSyncSuccessMessage(null), 5000)
      } else {
        setSyncSuccessMessage('MaydAI a été déclaré comme registre centralisé')
        setTimeout(() => setSyncSuccessMessage(null), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setConfirmingRegistry(false)
    }
  }

  const handleUndeclareCentralizedRegistry = async () => {
    if (!company) return

    try {
      setConfirmingRegistry(true)
      setError(null)
      const token = getAccessToken()

      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ maydai_as_registry: false })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la modification')
      }

      const updatedCompany = await response.json()
      setCompany((prev) => mergeCompanyFromApi(prev, updatedCompany))
      setShowEditRegistryModal(false)
      refreshServerData()

      // Display success message with number of updated use cases
      const useCasesUpdated = updatedCompany.useCasesUpdated || 0
      if (useCasesUpdated > 0) {
        setSyncSuccessMessage(`${useCasesUpdated} cas d'usage ont été réinitialisés (registre centralisé retiré)`)
        setTimeout(() => setSyncSuccessMessage(null), 5000)
      } else {
        setSyncSuccessMessage('MaydAI n\'est plus votre registre centralisé')
        setTimeout(() => setSyncSuccessMessage(null), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setConfirmingRegistry(false)
    }
  }

  const handleDeleteRegistry = async () => {
    if (!company) return

    try {
      setDeleting(true)
      const token = getAccessToken()

      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      // Redirect to registries list
      router.push('/dashboard/registries')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setDeleting(false)
    }
  }

  const isRightsPending =
    company != null && (company.role === undefined || company.role === null)

  const showLoadingState =
    !mounted || authLoading || loading || isRefreshPending || isRightsPending

  if (showLoadingState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user || !company) {
    return null
  }

  if (isAccessDeniedForSettings(company)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Accès réservé au propriétaire
            </h1>
            <p className="text-gray-600 mb-6">
              Seul le propriétaire du registre peut accéder aux paramètres et les modifier.
            </p>
            <button
              onClick={() => router.push(`/dashboard/${companyId}`)}
              className="inline-flex items-center px-6 py-3 bg-[#0080A3] text-white rounded-lg hover:bg-[#006280] transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {isCompanyCentralized(company) && (
            <Tooltip
              title={REGISTRE_MAYDAI_SEAL_ALT}
              shortContent="Source de vérité légale (Registre MaydAI)"
              type="answer"
              position="bottom"
            >
              <img
                src={REGISTRE_MAYDAI_SEAL_SRC}
                alt={REGISTRE_MAYDAI_SEAL_ALT}
                width={36}
                height={36}
                className="object-contain drop-shadow-sm shrink-0 cursor-default"
              />
            </Tooltip>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Paramètres du registre</h1>
          {isCompanyCentralized(company) && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200"
              role="status"
              aria-label="Ce registre est défini comme centralisé"
            >
              <ShieldCheck aria-hidden="true" size={14} />
              Centralisé
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Success message for registry sync */}
        {syncSuccessMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">{syncSuccessMessage}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* General Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Informations générales
              </h2>
              <div className="flex items-center gap-6">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="inline-flex items-center px-4 py-2 text-[#0080A3] hover:text-[#006280] hover:bg-[#0080A3]/5 border border-[#0080A3] rounded-lg transition-colors font-medium"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </button>
                )}
                <div className="pl-6 border-l border-gray-200">
                  <RegistryCompletenessScore
                    score={company.completeness_score}
                    isLoading={loading}
                    onHighlightRequest={handleHighlightRequest}
                  />
                </div>
              </div>
            </div>

            <form
              id="registry-form"
              className="space-y-6"
              onSubmit={(e) => e.preventDefault()}
            >
              {/* Name */}
              <div>
                <label htmlFor="registry-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du registre *
                </label>
                {isEditing ? (
                  <input
                    id="registry-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-missing={!formData.name.trim()}
                    aria-invalid={highlightMissing && !formData.name.trim() ? true : undefined}
                    className={registryFieldClass(highlightMissing, !formData.name.trim())}
                    placeholder="Nom du registre"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{company.name || '-'}</p>
                )}
              </div>

              {/* Industry */}
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  Secteur d&apos;activité
                </span>
                {isEditing ? (
                  <CompanySectorSelector
                    value={industrySelection}
                    onChange={setIndustrySelection}
                    required={false}
                    highlightMissing={highlightMissing}
                  />
                ) : (
                  <p className="text-gray-900 py-2">
                    {company.industry && company.sub_category_id
                      ? getIndustryDisplayText(company.industry, company.sub_category_id) ||
                        `${getIndustryLabel(company.industry) || company.industry} > ${getSubCategoryLabel(company.industry, company.sub_category_id) || company.sub_category_id}`
                      : company.industry
                        ? getIndustryLabel(company.industry) || company.industry
                        : '-'}
                  </p>
                )}
              </div>

              {/* City */}
              <div>
                <label htmlFor="registry-city" className="block text-sm font-medium text-gray-700 mb-2">
                  Ville
                </label>
                {isEditing ? (
                  <input
                    id="registry-city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    data-missing={!formData.city.trim()}
                    aria-invalid={highlightMissing && !formData.city.trim() ? true : undefined}
                    className={registryFieldClass(highlightMissing, !formData.city.trim())}
                    placeholder="Ville"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{company.city || '-'}</p>
                )}
              </div>

              {/* Country */}
              <div>
                <label htmlFor="registry-country" className="block text-sm font-medium text-gray-700 mb-2">
                  Pays
                </label>
                {isEditing ? (
                  <input
                    id="registry-country"
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    data-missing={!formData.country.trim()}
                    aria-invalid={highlightMissing && !formData.country.trim() ? true : undefined}
                    className={registryFieldClass(highlightMissing, !formData.country.trim())}
                    placeholder="Pays"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{company.country || '-'}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label htmlFor="registry-type" className="block text-sm font-medium text-gray-700 mb-2">
                  Type de registre
                </label>
                {isEditing ? (
                  <div className="space-y-3">
                    <select
                      id="registry-type"
                      value={selectedType}
                      onChange={(e) => {
                        setSelectedType(e.target.value)
                        if (e.target.value !== 'autre') {
                          setCustomType('')
                        }
                      }}
                      data-missing={!selectedType}
                      aria-invalid={highlightMissing && !selectedType ? true : undefined}
                      className={`${registryFieldClass(highlightMissing, !selectedType)} bg-white`}
                    >
                      <option value="">Sélectionner un type</option>
                      {REGISTRY_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                      <option value="autre">Autre</option>
                    </select>
                    {selectedType === 'autre' && (
                      <input
                        type="text"
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                        data-missing={selectedType === 'autre' && !customType.trim()}
                        aria-invalid={
                          highlightMissing && selectedType === 'autre' && !customType.trim()
                            ? true
                            : undefined
                        }
                        className={registryFieldClass(
                          highlightMissing,
                          selectedType === 'autre' && !customType.trim()
                        )}
                        placeholder="Précisez le type (ex: Direction RH, Département IT...)"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-gray-900 py-2">{getTypeLabel(company.type)}</p>
                )}
              </div>

              {!(company.has_collaborators ?? false) && (
                <div
                  className="mt-6 p-4 rounded-md border border-[#ffab5a] bg-orange-50/50 flex flex-col gap-2"
                  role="region"
                  aria-label="Suggestion d'amélioration du score"
                >
                  <p className="text-sm text-gray-700">
                    Invitez un collaborateur pour gagner 10&nbsp;% sur votre score de complétude.
                  </p>
                  <Link
                    href={`/dashboard/${companyId}/collaboration`}
                    className="text-sm text-[#0080A3] underline hover:text-opacity-80 transition-colors w-fit focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:outline-none rounded px-1 py-0.5"
                  >
                    Aller à la section Collaboration
                  </Link>
                </div>
              )}

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Annuler</span>
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={saving || !formData.name.trim()}
                    className="px-6 py-2 bg-[#0080A3] text-white rounded-lg hover:bg-[#006280] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Enregistrer</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {saveSuccess && (
                <p className="text-sm text-green-600 font-medium">
                  Modifications enregistrées avec succès
                </p>
              )}
            </form>
          </div>

          {/* Centralized Registry Definition */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Définition du registre centralisé
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Agissant comme votre unique source de vérité, ce registre regroupe l&apos;ensemble de vos
              cas d&apos;usage IA. Ce statut garantit une vue consolidée pour vos audits et valide
              automatiquement l&apos;exigence de complétude (100&nbsp;%).
            </p>

            {isCompanyCentralized(company) ? (
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-md border border-emerald-200 bg-emerald-50/50"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className="shrink-0">
                    <img
                      src={REGISTRE_MAYDAI_SEAL_SRC}
                      alt={REGISTRE_MAYDAI_SEAL_ALT}
                      width={48}
                      height={48}
                      className="object-contain drop-shadow-sm"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-900">
                      MaydAI est votre registre centralisé
                    </h4>
                    <p className="text-xs text-emerald-700 mt-1">
                      Toutes vos informations de conformité IA sont centralisées dans cet outil.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditRegistryModal(true)}
                  className="shrink-0 text-sm font-medium text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-100 px-4 py-2 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none whitespace-nowrap shadow-sm"
                >
                  Modifier le statut
                </button>
              </div>
            ) : (
              // Not declared yet - show button
              <button
                onClick={() => setShowCentralizedRegistryModal(true)}
                className="inline-flex items-center px-6 py-3 bg-[#0080A3] text-white rounded-lg hover:bg-[#006280] transition-colors font-medium"
              >
                Déclarer MaydAI comme mon registre centralisé
              </button>
            )}
          </div>

          {/* Danger Zone Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Zone de danger
            </h2>

            <div className="border border-red-200 rounded-lg p-6 bg-red-50">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Supprimer ce registre
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Cette action est irréversible. Toutes les données associées à ce registre
                    seront définitivement supprimées, y compris tous les cas d'usage et
                    leurs réponses.
                  </p>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Supprimer le registre
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteRegistryModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteRegistry}
        registryName={company.name}
        deleting={deleting}
      />

      {/* Centralized Registry Confirmation Modal */}
      <ConfirmCentralizedRegistryModal
        isOpen={showCentralizedRegistryModal}
        onClose={() => setShowCentralizedRegistryModal(false)}
        onConfirm={handleDeclareCentralizedRegistry}
        registryName={company.name}
        confirming={confirmingRegistry}
      />

      {/* Edit Centralized Registry Modal */}
      <EditCentralizedRegistryModal
        isOpen={showEditRegistryModal}
        onClose={() => setShowEditRegistryModal(false)}
        onKeep={() => {}} // Just close the modal, no action needed
        onRemove={handleUndeclareCentralizedRegistry}
        registryName={company.name}
        updating={confirmingRegistry}
      />
    </div>
  )
}

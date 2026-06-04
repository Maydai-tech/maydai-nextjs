'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { HardDrive, User, Building2, Phone, FileText, Pencil, X, Check, Loader2, AlertTriangle, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useUserPlan } from '@/app/abonnement/hooks/useUserPlan'
import { validateSIREN, cleanSIREN, formatSIREN } from '@/lib/validation/siren'
import CompanySectorSelector, { IndustrySelection } from '@/components/CompanySectorSelector'
import { getIndustryDisplayText, getIndustryLabel, getSubCategoryLabel } from '@/lib/constants/industries'
import DeleteAccountModal from '@/components/Settings/DeleteAccountModal'
import ProfileCompletenessScore from '@/components/Settings/ProfileCompletenessScore'
import ReadOnlyEmailBlock from '@/components/Settings/ReadOnlyEmailBlock'
import {
  calculateProfileCompletenessScore,
  toProfileCompletenessInput,
} from '@/lib/validations/profile-completeness'

const INPUT_BASE_CLASS =
  'w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors'

const HIGHLIGHT_RING_CLASS =
  'ring-2 ring-[#ffab5a] border-transparent transition-all duration-300'

function fieldInputClass(highlightMissing: boolean, isEmpty: boolean, extra = ''): string {
  const highlight = highlightMissing && isEmpty ? HIGHLIGHT_RING_CLASS : ''
  return `${INPUT_BASE_CLASS} ${highlight} ${extra}`.trim()
}

interface GeneralSectionProps {
  userEmail: string | undefined
  isEmailVerified?: boolean
}

interface ProfileData {
  firstName: string
  lastName: string
  companyName: string
  mainIndustryId: string
  subCategoryId: string
  phone: string
  siren: string
}

export default function GeneralSection({ userEmail, isEmailVerified }: GeneralSectionProps) {
  const { getAccessToken } = useAuth()
  const { plan } = useUserPlan()

  // Storage state
  const [storageUsage, setStorageUsage] = useState<{
    usedStorageMb: number
    maxStorageMb: number
    percentUsed: number
  } | null>(null)
  const [loadingStorage, setLoadingStorage] = useState(true)

  // Profile state
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    companyName: '',
    mainIndustryId: '',
    subCategoryId: '',
    phone: '',
    siren: ''
  })
  const [editedData, setEditedData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    companyName: '',
    mainIndustryId: '',
    subCategoryId: '',
    phone: '',
    siren: ''
  })
  const [industrySelection, setIndustrySelection] = useState<IndustrySelection>({
    mainIndustryId: '',
    subCategoryId: ''
  })
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sirenError, setSirenError] = useState('')
  const [industryError, setIndustryError] = useState('')
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [hasCollaborators, setHasCollaborators] = useState(false)
  const [highlightMissing, setHighlightMissing] = useState(false)

  const scoreSource = isEditing ? editedData : profileData
  const completenessScore = useMemo(
    () =>
      calculateProfileCompletenessScore(
        toProfileCompletenessInput(scoreSource, hasCollaborators)
      ),
    [scoreSource, hasCollaborators, isEditing, editedData, profileData]
  )

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getAccessToken()
        if (!token) return

        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (res.ok) {
          const data = await res.json()
          const profile = {
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            companyName: data.companyName || '',
            mainIndustryId: data.mainIndustryId || '',
            subCategoryId: data.subCategoryId || '',
            phone: data.phone || '',
            siren: data.siren || ''
          }
          setProfileData(profile)
          setEditedData(profile)
          setIndustrySelection({
            mainIndustryId: data.mainIndustryId || '',
            subCategoryId: data.subCategoryId || ''
          })
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [getAccessToken])

  useEffect(() => {
    const fetchCollaborators = async () => {
      try {
        const token = getAccessToken()
        if (!token) return

        const res = await fetch('/api/collaboration/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setHasCollaborators(Array.isArray(data) && data.length > 0)
        }
      } catch (error) {
        console.error('Error fetching collaborators for completeness:', error)
      }
    }

    fetchCollaborators()
  }, [getAccessToken])

  // Fetch storage usage
  useEffect(() => {
    const fetchStorageUsage = async () => {
      try {
        const token = getAccessToken()
        if (!token) return

        const res = await fetch(`/api/storage/usage`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (res.ok) {
          const data = await res.json()
          setStorageUsage(data)
        }
      } catch (error) {
        console.error('Error fetching storage usage:', error)
      } finally {
        setLoadingStorage(false)
      }
    }

    fetchStorageUsage()
  }, [getAccessToken])

  const formatStorage = (storageMb: number): string => {
    if (storageMb >= 1024) {
      return `${(storageMb / 1024).toFixed(2)} Go`
    }
    return `${storageMb.toFixed(2)} Mo`
  }

  const handleEditChange = (field: keyof ProfileData, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')

    // Validate SIREN in real-time
    if (field === 'siren') {
      const cleaned = cleanSIREN(value)
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
  }

  const handleStartEdit = () => {
    setEditedData({ ...profileData })
    setIndustrySelection({
      mainIndustryId: profileData.mainIndustryId,
      subCategoryId: profileData.subCategoryId
    })
    setIsEditing(true)
    setError('')
    setSuccess('')
    setSirenError('')
    setIndustryError('')
  }

  const handleCancelEdit = () => {
    setEditedData({ ...profileData })
    setIndustrySelection({
      mainIndustryId: profileData.mainIndustryId,
      subCategoryId: profileData.subCategoryId
    })
    setIsEditing(false)
    setHighlightMissing(false)
    setError('')
    setSirenError('')
    setIndustryError('')
  }

  const handleHighlightRequest = () => {
    const needsEditOpen = !isEditing
    if (needsEditOpen) {
      handleStartEdit()
    }
    setHighlightMissing(true)
    setTimeout(
      () => {
        const firstMissingField = document.querySelector(
          '#profile-form [data-missing="true"]'
        ) as HTMLElement | null
        if (firstMissingField) {
          firstMissingField.scrollIntoView({ behavior: 'smooth', block: 'center' })
          if (
            firstMissingField instanceof HTMLInputElement ||
            firstMissingField instanceof HTMLSelectElement ||
            firstMissingField instanceof HTMLTextAreaElement ||
            firstMissingField instanceof HTMLButtonElement ||
            firstMissingField instanceof HTMLAnchorElement
          ) {
            firstMissingField.focus({ preventScroll: true })
          }
        }
      },
      needsEditOpen ? 200 : 100
    )
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')

    // Validate required fields
    if (!editedData.firstName || !editedData.lastName || !editedData.companyName || !editedData.mainIndustryId || !editedData.subCategoryId) {
      setError('Les champs prénom, nom, entreprise, secteur principal et sous-catégorie sont obligatoires')
      if (!editedData.mainIndustryId || !editedData.subCategoryId) {
        setIndustryError('Veuillez sélectionner un secteur d\'activité et une sous-catégorie')
      }
      return
    }

    // Validate SIREN if provided
    if (editedData.siren) {
      const cleaned = cleanSIREN(editedData.siren)
      if (cleaned.length > 0 && !validateSIREN(cleaned)) {
        setError('Numéro SIREN invalide')
        return
      }
    }

    setSaving(true)

    try {
      const token = getAccessToken()
      if (!token) {
        setError('Session expirée, veuillez vous reconnecter')
        return
      }

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: editedData.firstName,
          lastName: editedData.lastName,
          companyName: editedData.companyName,
          mainIndustryId: editedData.mainIndustryId,
          subCategoryId: editedData.subCategoryId,
          phone: editedData.phone,
          siren: editedData.siren ? cleanSIREN(editedData.siren) : ''
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      // Update local state
      setProfileData({ ...editedData, siren: editedData.siren ? cleanSIREN(editedData.siren) : '' })
      setIndustrySelection({
        mainIndustryId: editedData.mainIndustryId,
        subCategoryId: editedData.subCategoryId
      })
      setIsEditing(false)
      setHighlightMissing(false)
      setSuccess('Profil mis à jour avec succès')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="space-y-8">
      {/* En-tête Informations générales + score de complétude */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 bg-slate-50 p-6 rounded-lg border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Informations générales</h2>
          <p className="text-gray-500">Gérez vos informations personnelles et les paramètres de votre compte</p>
        </div>
        <ProfileCompletenessScore
          score={completenessScore}
          isLoading={loadingProfile}
          onHighlightRequest={handleHighlightRequest}
        />
      </div>

      {/* Messages de succès/erreur */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            {success}
          </p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <ReadOnlyEmailBlock userEmail={userEmail} isVerified={isEmailVerified} />

      {/* Carte Informations personnelles */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <User className="w-5 h-5 text-[#0080A3] mr-2" />
              Informations personnelles
            </h3>
            <p className="text-gray-500 text-sm">Vos informations de profil et d'entreprise</p>
          </div>
          {!isEditing && !loadingProfile && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0080A3] bg-[#0080A3]/10 rounded-lg hover:bg-[#0080A3]/20 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Modifier
            </button>
          )}
        </div>

        {loadingProfile ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0080A3]"></div>
          </div>
        ) : isEditing ? (
          /* Mode édition */
          <form id="profile-form" className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {/* Prénom & Nom */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="profile-firstName"
                    type="text"
                    value={editedData.firstName}
                    onChange={(e) => handleEditChange('firstName', e.target.value)}
                    data-missing={!editedData.firstName}
                    aria-invalid={highlightMissing && !editedData.firstName ? true : undefined}
                    className={fieldInputClass(highlightMissing, !editedData.firstName)}
                    placeholder="Jean"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="profile-lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="profile-lastName"
                    type="text"
                    value={editedData.lastName}
                    onChange={(e) => handleEditChange('lastName', e.target.value)}
                    data-missing={!editedData.lastName}
                    aria-invalid={highlightMissing && !editedData.lastName ? true : undefined}
                    className={fieldInputClass(highlightMissing, !editedData.lastName)}
                    placeholder="Dupont"
                  />
                </div>
              </div>
            </div>

            {/* Entreprise */}
            <div>
              <label htmlFor="profile-companyName" className="block text-sm font-medium text-gray-700 mb-2">
                Entreprise <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="profile-companyName"
                  type="text"
                  value={editedData.companyName}
                  onChange={(e) => handleEditChange('companyName', e.target.value)}
                  data-missing={!editedData.companyName}
                  aria-invalid={highlightMissing && !editedData.companyName ? true : undefined}
                  className={fieldInputClass(highlightMissing, !editedData.companyName)}
                  placeholder="Nom de votre entreprise"
                />
              </div>
            </div>

            {/* Secteur d'activité */}
            <div>
              <CompanySectorSelector
                value={industrySelection}
                onChange={(selection) => {
                  setIndustrySelection(selection)
                  setEditedData(prev => ({
                    ...prev,
                    mainIndustryId: selection.mainIndustryId,
                    subCategoryId: selection.subCategoryId
                  }))
                  setIndustryError('')
                  setError('')
                }}
                error={industryError}
                required
                highlightMissing={highlightMissing}
              />
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone <span className="text-gray-500 text-xs">(recommandé pour le score)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="profile-phone"
                  type="tel"
                  value={editedData.phone}
                  onChange={(e) => handleEditChange('phone', e.target.value)}
                  data-missing={!editedData.phone}
                  aria-invalid={highlightMissing && !editedData.phone ? true : undefined}
                  className={fieldInputClass(highlightMissing, !editedData.phone)}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>

            {/* SIREN */}
            <div>
              <label htmlFor="profile-siren" className="block text-sm font-medium text-gray-700 mb-2">
                SIREN <span className="text-gray-500 text-xs">(recommandé pour le score)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="profile-siren"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={editedData.siren}
                  onChange={(e) => handleEditChange('siren', cleanSIREN(e.target.value))}
                  data-missing={!editedData.siren}
                  aria-invalid={highlightMissing && !editedData.siren ? true : undefined}
                  className={fieldInputClass(
                    highlightMissing,
                    !editedData.siren,
                    sirenError
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : editedData.siren && !sirenError && editedData.siren.length === 9
                        ? 'border-green-300 focus:border-green-500'
                        : ''
                  )}
                  placeholder="123456789"
                />
              </div>
              {sirenError && (
                <p className="mt-1 text-sm text-red-600">{sirenError}</p>
              )}
              {editedData.siren && !sirenError && editedData.siren.length === 9 && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  SIREN valide : {formatSIREN(editedData.siren)}
                </p>
              )}
            </div>

            {!hasCollaborators && (
              <div
                className={`p-4 rounded-lg border ${
                  highlightMissing
                    ? 'ring-2 ring-[#ffab5a] border-transparent bg-orange-50/40'
                    : 'border-gray-100 bg-gray-50/80'
                }`}
              >
                <p className="text-sm text-gray-700 mb-2">
                  Invitez un collaborateur pour gagner 15&nbsp;% sur votre score de complétude.
                </p>
                <Link
                  href="/settings?section=collaboration"
                  data-missing={!hasCollaborators}
                  className="text-sm font-medium text-[#0080A3] underline hover:text-opacity-80 focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:outline-none rounded px-1 py-0.5"
                >
                  Aller à la section Collaboration
                </Link>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !!sirenError || !!industryError}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#0080A3] rounded-lg hover:bg-[#006280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Enregistrer
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
            </div>
          </form>
        ) : (
          /* Mode affichage */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Prénom</p>
                <p className="text-gray-900 font-medium">{profileData.firstName || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Nom</p>
                <p className="text-gray-900 font-medium">{profileData.lastName || '-'}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Entreprise</p>
              <p className="text-gray-900 font-medium">{profileData.companyName || '-'}</p>
            </div>

            <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Secteur d'activité</p>
              <p className="text-gray-900 font-medium">
                {profileData.mainIndustryId && profileData.subCategoryId
                  ? getIndustryDisplayText(profileData.mainIndustryId, profileData.subCategoryId) ||
                    `${getIndustryLabel(profileData.mainIndustryId) || profileData.mainIndustryId} > ${getSubCategoryLabel(profileData.mainIndustryId, profileData.subCategoryId) || profileData.subCategoryId}`
                  : profileData.mainIndustryId
                    ? getIndustryLabel(profileData.mainIndustryId) || profileData.mainIndustryId
                    : '-'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Téléphone</p>
                <p className="text-gray-900 font-medium">{profileData.phone || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">SIREN</p>
                <p className="text-gray-900 font-medium">
                  {profileData.siren ? formatSIREN(profileData.siren) : '-'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Carte Stockage */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <HardDrive className="w-5 h-5 text-[#0080A3] mr-2" />
            Stockage
          </h3>
          <p className="text-gray-500 text-sm">Usage du stockage de vos fichiers de conformité</p>
        </div>

        {loadingStorage ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0080A3]"></div>
          </div>
        ) : storageUsage ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Espace utilisé
              </span>
              <span className="text-sm text-gray-900 font-semibold">
                {formatStorage(storageUsage.usedStorageMb)} / {formatStorage(storageUsage.maxStorageMb)}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  storageUsage.percentUsed >= 90
                    ? 'bg-red-500'
                    : storageUsage.percentUsed >= 75
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(storageUsage.percentUsed, 100)}%` }}
              />
            </div>

            {storageUsage.percentUsed >= 90 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">
                  Vous approchez de la limite de stockage. Supprimez des fichiers ou passez à un plan supérieur.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-500">Impossible de charger les informations de stockage</p>
          </div>
        )}
      </div>

      {/* Zone de danger */}
      <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-red-700 mb-2 flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            Zone de danger
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-red-50/60 border border-red-100 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">Supprimer mon compte</p>
            <p className="text-xs text-gray-500">Profil, abonnement et entreprises possédées seront supprimés.</p>
          </div>
          <button
            onClick={() => setShowDeleteAccountModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer mon compte
          </button>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
      />
    </div>
  )
}

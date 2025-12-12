'use client'

import { useEffect, useState } from 'react'
import { Mail, HardDrive, User, Building2, Phone, FileText, Pencil, X, Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useUserPlan } from '@/app/abonnement/hooks/useUserPlan'
import { validateSIREN, cleanSIREN, formatSIREN } from '@/lib/validation/siren'
import CompanySectorSelector, { IndustrySelection } from '@/components/CompanySectorSelector'
import { getIndustryDisplayText, getIndustryLabel, getSubCategoryLabel } from '@/lib/constants/industries'

interface GeneralSectionProps {
  userEmail: string | undefined
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

export default function GeneralSection({ userEmail }: GeneralSectionProps) {
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
    setError('')
    setSirenError('')
    setIndustryError('')
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
      {/* Header avec avatar */}
      <div className="flex items-center space-x-6 p-6 bg-blue-50/50 rounded-xl border border-gray-100">
        <div className="flex-shrink-0">
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Informations générales</h2>
          <p className="text-gray-500">Gérez vos informations personnelles et les paramètres de votre compte</p>
        </div>
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

      {/* Carte Email */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <Mail className="w-5 h-5 text-[#0080A3] mr-2" />
            Adresse e-mail
          </h3>
          <p className="text-gray-500 text-sm">Votre adresse e-mail associée à ce compte (non modifiable)</p>
        </div>

        <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-900 font-medium">{userEmail}</span>
          </div>
        </div>
      </div>

      {/* Carte Informations personnelles */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <User className="w-5 h-5 text-[#0080A3] mr-2" />
              Informations personnelles
            </h3>
            <p className="text-gray-500 text-sm">Vos informations de profil et d'entreprise</p>
          </div>
          {!isEditing && !loadingProfile && (
            <button
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
          <div className="space-y-4">
            {/* Prénom & Nom */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={editedData.firstName}
                    onChange={(e) => handleEditChange('firstName', e.target.value)}
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                    placeholder="Jean"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={editedData.lastName}
                    onChange={(e) => handleEditChange('lastName', e.target.value)}
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                    placeholder="Dupont"
                  />
                </div>
              </div>
            </div>

            {/* Entreprise */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entreprise <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={editedData.companyName}
                  onChange={(e) => handleEditChange('companyName', e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
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
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone <span className="text-gray-500 text-xs">(optionnel)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={editedData.phone}
                  onChange={(e) => handleEditChange('phone', e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>

            {/* SIREN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SIREN <span className="text-gray-500 text-xs">(optionnel)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={editedData.siren}
                  onChange={(e) => handleEditChange('siren', cleanSIREN(e.target.value))}
                  className={`w-full px-4 py-3 pl-10 border rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:outline-none transition-colors ${
                    sirenError
                      ? 'border-red-300 focus:border-red-500'
                      : editedData.siren && !sirenError && editedData.siren.length === 9
                        ? 'border-green-300 focus:border-green-500'
                        : 'border-gray-300 focus:border-[#0080A3]'
                  }`}
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

            {/* Boutons d'action */}
            <div className="flex items-center gap-3 pt-4">
              <button
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
                onClick={handleCancelEdit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
            </div>
          </div>
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
    </div>
  )
}

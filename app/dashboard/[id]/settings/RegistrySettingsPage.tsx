'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { AlertTriangle, Save, Edit, X, CheckCircle } from 'lucide-react'
import DeleteRegistryModal from '../components/DeleteRegistryModal'
import ConfirmCentralizedRegistryModal from '../components/ConfirmCentralizedRegistryModal'
import EditCentralizedRegistryModal from '../components/EditCentralizedRegistryModal'
import { REGISTRY_TYPES, isCustomType, getTypeLabel } from '@/lib/registry-types'

interface Company {
  id: string
  name: string
  industry: string
  city: string
  country: string
  type?: string
  role: string
  maydai_as_registry?: boolean
}

export default function RegistrySettingsPage() {
  const router = useRouter()
  const resolvedParams = useParams()
  const { user, loading: authLoading, getAccessToken } = useAuth()

  const [mounted, setMounted] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // General section state
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    city: '',
    country: ''
  })
  const [selectedType, setSelectedType] = useState('')
  const [customType, setCustomType] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

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

  // Fetch company data
  useEffect(() => {
    const fetchCompany = async () => {
      if (!user || !companyId) return

      try {
        setLoading(true)
        const token = getAccessToken()
        const response = await fetch(`/api/companies/${companyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Vous n\'avez pas accès à ce registre')
          }
          throw new Error('Erreur lors du chargement du registre')
        }

        const data = await response.json()

        // Only owners can access settings
        if (data.role !== 'owner') {
          router.push(`/dashboard/${companyId}`)
          return
        }

        setCompany(data)
        setFormData({
          name: data.name || '',
          industry: data.industry || '',
          city: data.city || '',
          country: data.country || ''
        })
        // Initialize type state
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    if (mounted && user) {
      fetchCompany()
    }
  }, [user, companyId, mounted, getAccessToken, router])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    // Reset form data to company values
    if (company) {
      setFormData({
        name: company.name || '',
        industry: company.industry || '',
        city: company.city || '',
        country: company.country || ''
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
    setError(null)
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
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour')
      }

      const updatedCompany = await response.json()
      setCompany(updatedCompany)
      setSaveSuccess(true)
      setIsEditing(false)

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
      setCompany(updatedCompany)
      setShowCentralizedRegistryModal(false)

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
      setCompany(updatedCompany)
      setShowEditRegistryModal(false)

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

  if (!mounted || authLoading || loading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Paramètres du registre</h1>
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Informations générales
              </h2>
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-4 py-2 text-[#0080A3] hover:text-[#006280] hover:bg-[#0080A3]/5 border border-[#0080A3] rounded-lg transition-colors font-medium"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du registre *
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                    placeholder="Nom du registre"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{company.name || '-'}</p>
                )}
              </div>

              {/* Industry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secteur d'activité
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                    placeholder="Ex: Technologie, Santé, Finance..."
                  />
                ) : (
                  <p className="text-gray-900 py-2">{company.industry || '-'}</p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                    placeholder="Ville"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{company.city || '-'}</p>
                )}
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pays
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                    placeholder="Pays"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{company.country || '-'}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de registre
                </label>
                {isEditing ? (
                  <div className="space-y-3">
                    <select
                      value={selectedType}
                      onChange={(e) => {
                        setSelectedType(e.target.value)
                        if (e.target.value !== 'autre') {
                          setCustomType('')
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:border-transparent bg-white"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                        placeholder="Précisez le type (ex: Direction RH, Département IT...)"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-gray-900 py-2">{getTypeLabel(company.type)}</p>
                )}
              </div>

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
            </div>
          </div>

          {/* Centralized Registry Definition */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Définition du registre centralisé
            </h2>
            <p className="text-gray-700 mb-4">
              Le registre centralisé est un registre qui contient toutes les informations liées à la conformité des cas d'usage IA.
            </p>

            {company.maydai_as_registry ? (
              // Already declared - show success message with edit button
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">
                        MaydAI est votre registre centralisé
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Toutes vos informations de conformité IA sont centralisées dans cet outil.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditRegistryModal(true)}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Modifier
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

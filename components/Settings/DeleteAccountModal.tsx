'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, X, Trash2, Loader2, Building2, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth'

interface DeletionPreviewCollaborator {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  role: string
}

interface DeletionPreviewCompany {
  id: string
  name: string | null
  usecaseCount: number
  collaborators: DeletionPreviewCollaborator[]
}

interface DeletionPreview {
  ownedCompanies: DeletionPreviewCompany[]
  collaboratingCompanies: { id: string; name: string | null }[]
}

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

const CONFIRM_WORD = 'SUPPRIMER'

export default function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const { getAccessToken, deleteAccount } = useAuth()
  const router = useRouter()

  const [preview, setPreview] = useState<DeletionPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      // Réinitialiser à la fermeture
      setConfirmText('')
      setError('')
      setPreview(null)
      return
    }

    const fetchPreview = async () => {
      setLoadingPreview(true)
      setError('')
      try {
        const token = getAccessToken()
        if (!token) throw new Error('Session expirée, veuillez vous reconnecter')

        const res = await fetch('/api/account', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) throw new Error('Impossible de charger les données à supprimer')

        const data = await res.json()
        setPreview(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        setLoadingPreview(false)
      }
    }

    fetchPreview()
  }, [isOpen, getAccessToken])

  if (!isOpen) return null

  const handleDelete = async () => {
    setError('')
    setDeleting(true)
    try {
      await deleteAccount()
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du compte')
      setDeleting(false)
    }
  }

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD && !deleting

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Supprimer mon compte</h3>
            </div>
            <button
              onClick={onClose}
              disabled={deleting}
              className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Avertissement */}
          <p className="text-gray-600 mb-4 leading-relaxed">
            Cette action est <span className="font-semibold text-red-600">définitive et irréversible</span>.
            Toutes vos données seront supprimées conformément au RGPD : profil, abonnement, et les
            entreprises que vous possédez (ainsi que leurs cas d'usage et l'accès de leurs collaborateurs).
          </p>

          {loadingPreview ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0080A3]"></div>
            </div>
          ) : (
            <>
              {/* Companies possédées impactées */}
              {preview && preview.ownedCompanies.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-700 mb-3">
                    Entreprises qui seront entièrement supprimées :
                  </p>
                  <ul className="space-y-3">
                    {preview.ownedCompanies.map((company) => (
                      <li key={company.id} className="text-sm">
                        <div className="flex items-center gap-2 text-gray-900 font-medium">
                          <Building2 className="w-4 h-4 text-red-500 flex-shrink-0" />
                          {company.name || 'Entreprise sans nom'}
                          <span className="text-xs text-gray-500 font-normal">
                            ({company.usecaseCount} cas d'usage)
                          </span>
                        </div>
                        {company.collaborators.length > 0 && (
                          <div className="mt-1 ml-6 flex items-start gap-2 text-xs text-gray-600">
                            <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span>
                              {company.collaborators.length} collaborateur
                              {company.collaborators.length > 1 ? 's' : ''} perdront leur accès :{' '}
                              {company.collaborators
                                .map((c) =>
                                  [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'inconnu'
                                )
                                .join(', ')}
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 mt-3">
                    Si vous souhaitez conserver une de ces entreprises, transférez d'abord sa propriété
                    à un collaborateur avant de supprimer votre compte.
                  </p>
                </div>
              )}

              {/* Companies où l'utilisateur est seulement collaborateur */}
              {preview && preview.collaboratingCompanies.length > 0 && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Vous serez retiré(e) de{' '}
                    <span className="font-medium">{preview.collaboratingCompanies.length}</span> entreprise
                    {preview.collaboratingCompanies.length > 1 ? 's' : ''} où vous collaborez (sans les supprimer).
                  </p>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Confirmation par saisie */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pour confirmer, saisissez <span className="font-bold text-red-600">{CONFIRM_WORD}</span> :
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors disabled:opacity-50"
              placeholder={CONFIRM_WORD}
              autoComplete="off"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:space-x-4 gap-3 sm:gap-0">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Supprimer définitivement
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

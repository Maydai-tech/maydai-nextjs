'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useUserPlan } from '@/app/abonnement/hooks/useUserPlan'
import ComplianceFileUpload from './ComplianceFileUpload'
import UploadedFileDisplay from './UploadedFileDisplay'

interface RegistryProofUploadProps {
  usecaseId: string
  registryCase: 'A' | 'C'
  onUploadComplete: () => void
  onClose: () => void
}

export default function RegistryProofUpload({
  usecaseId,
  registryCase,
  onUploadComplete,
  onClose
}: RegistryProofUploadProps) {
  const { getAccessToken } = useAuth()
  const { plan } = useUserPlan()
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [document, setDocument] = useState<{
    fileUrl: string | null
    status: string | null
  } | null>(null)
  const [loadingDocument, setLoadingDocument] = useState(true)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch existing document
  useEffect(() => {
    const fetchDocument = async () => {
      const token = getAccessToken()
      if (!token) return

      try {
        const res = await fetch(`/api/dossiers/${usecaseId}/registry_proof`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (res.ok) {
          const data = await res.json()
          setDocument(data)
        }
      } catch (err) {
        console.error('Error fetching document:', err)
      } finally {
        setLoadingDocument(false)
      }
    }

    fetchDocument()
  }, [usecaseId, getAccessToken])

  const handleFileUpload = async (file: File) => {
    setError(null)
    const token = getAccessToken()
    if (!token) {
      setError('Erreur d\'authentification')
      return
    }

    try {
      setUploading(true)

      // Check storage limit
      const fileSizeMb = file.size / (1024 * 1024)
      const maxStorageMb = plan.maxStorageMb || 250

      const storageRes = await fetch(`/api/storage/usage`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (storageRes.ok) {
        const storageData = await storageRes.json()
        const usedStorageMb = storageData.usedStorageMb

        if (usedStorageMb + fileSizeMb > maxStorageMb) {
          setError(
            `Limite de stockage dépassée.\n\n` +
            `Stockage actuel : ${usedStorageMb.toFixed(2)} Mo\n` +
            `Fichier : ${fileSizeMb.toFixed(2)} Mo\n` +
            `Limite du plan : ${maxStorageMb} Mo\n\n` +
            `Pour augmenter votre limite de stockage, veuillez passer à un plan supérieur.`
          )
          setUploading(false)
          return
        }
      }

      // Upload file
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/dossiers/${usecaseId}/registry_proof/upload`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      if (res.ok) {
        // Upload succeeded - show success and close
        setUploadSuccess(true)

        // Try to refresh document data (non-blocking)
        try {
          const getRes = await fetch(`/api/dossiers/${usecaseId}/registry_proof`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (getRes.ok) {
            const data = await getRes.json()
            setDocument(data)
          }
        } catch (err) {
          console.log('Could not refresh document data, but upload succeeded')
        }

        // Auto-close after 2 seconds regardless of refresh result
        setTimeout(() => {
          onUploadComplete()
        }, 2000)
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
        setError(`Erreur lors de l'upload: ${errorData.error || 'Erreur inconnue'}`)
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      setError('Erreur lors de l\'upload du fichier')
    } finally {
      setUploading(false)
    }
  }

  const handleFileDelete = async () => {
    const token = getAccessToken()
    if (!token) return

    try {
      setDeleting(true)

      const res = await fetch(`/api/dossiers/${usecaseId}/registry_proof/upload`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        // Refresh document data
        const getRes = await fetch(`/api/dossiers/${usecaseId}/registry_proof`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (getRes.ok) {
          const data = await getRes.json()
          setDocument(data)
        }
      } else {
        setError('Erreur lors de la suppression du fichier')
      }
    } catch (err) {
      console.error('Error deleting file:', err)
      setError('Erreur lors de la suppression du fichier')
    } finally {
      setDeleting(false)
    }
  }

  const getTitle = () => {
    if (registryCase === 'A') {
      return 'Prouver l\'usage d\'un registre centralisé'
    }
    return 'Prouver l\'usage de votre registre centralisé'
  }

  const getDescription = () => {
    if (registryCase === 'A') {
      return 'Téléversez un document prouvant l\'utilisation d\'un registre centralisé pour vos systèmes d\'IA (capture d\'écran de l\'outil, attestation du responsable, etc.).'
    }
    return 'Téléversez un document prouvant l\'utilisation de votre registre centralisé existant (capture d\'écran, attestation, etc.).'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {getTitle()}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-600">
            {getDescription()}
          </p>

          {/* Success message */}
          {uploadSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Document uploadé avec succès !
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Fermeture automatique dans 2 secondes...
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 whitespace-pre-line">
                {error}
              </p>
            </div>
          )}

          {/* Loading state */}
          {loadingDocument ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-[#0080A3] animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Show uploaded file if exists */}
              {document?.fileUrl ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document uploadé
                  </label>
                  <UploadedFileDisplay
                    fileUrl={document.fileUrl}
                    onDelete={handleFileDelete}
                    isDeleting={deleting}
                  />
                </div>
              ) : (
                <>
                  {/* File upload */}
                  <ComplianceFileUpload
                    label="Téléverser un document"
                    helpText="Formats acceptés : .pdf, .png, .jpg, .jpeg (max 10MB)"
                    acceptedFormats=".pdf,.png,.jpg,.jpeg"
                    onFileSelected={handleFileUpload}
                  />

                  {/* Uploading state */}
                  {uploading && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Upload en cours...
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={uploading || deleting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {document?.fileUrl ? 'Fermer' : 'Annuler'}
          </button>
        </div>
      </div>
    </div>
  )
}

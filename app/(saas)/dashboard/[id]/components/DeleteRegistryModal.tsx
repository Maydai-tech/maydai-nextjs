'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface DeleteRegistryModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  registryName: string
  deleting: boolean
}

export default function DeleteRegistryModal({
  isOpen,
  onClose,
  onConfirm,
  registryName,
  deleting
}: DeleteRegistryModalProps) {
  const [confirmationText, setConfirmationText] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmationText('')
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const isConfirmationValid = confirmationText === registryName

  const handleConfirm = async () => {
    if (!isConfirmationValid) {
      setError('Le nom saisi ne correspond pas au nom du registre')
      return
    }

    try {
      setError(null)
      await onConfirm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="bg-red-50 p-2 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Supprimer le registre
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Cette action est irréversible
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={deleting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-2">
                  Attention : Cette action supprimera définitivement :
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Le registre "{registryName}"</li>
                  <li>Tous les cas d'usage associés</li>
                  <li>Toutes les réponses aux questionnaires</li>
                  <li>Les accès collaborateurs au registre</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pour confirmer, saisissez le nom du registre :{' '}
              <span className="font-semibold text-gray-900" data-testid="registry-name-to-confirm">{registryName}</span>
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => {
                setConfirmationText(e.target.value)
                setError(null)
              }}
              placeholder="Saisissez le nom du registre"
              disabled={deleting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              data-testid="delete-registry-button"
              onClick={handleConfirm}
              disabled={!isConfirmationValid || deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Suppression en cours...
                </>
              ) : (
                'Supprimer définitivement'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

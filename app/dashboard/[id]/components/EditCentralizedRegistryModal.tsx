'use client'

import { X, CheckCircle, XCircle } from 'lucide-react'

interface EditCentralizedRegistryModalProps {
  isOpen: boolean
  onClose: () => void
  onKeep: () => void
  onRemove: () => Promise<void>
  registryName: string
  updating: boolean
}

export default function EditCentralizedRegistryModal({
  isOpen,
  onClose,
  onKeep,
  onRemove,
  registryName,
  updating
}: EditCentralizedRegistryModalProps) {
  if (!isOpen) return null

  const handleRemove = async () => {
    try {
      await onRemove()
    } catch (err) {
      console.error('Error removing centralized registry:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Modifier le registre centralisé
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Que souhaitez-vous faire ?
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={updating}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Current Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              Actuellement, <span className="font-semibold">{registryName}</span> utilise MaydAI comme registre centralisé.
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {/* Option 1: Keep MaydAI */}
            <button
              onClick={() => {
                onKeep()
                onClose()
              }}
              disabled={updating}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-[#0080A3] hover:bg-[#0080A3]/5 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-[#0080A3] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 group-hover:text-[#0080A3]">
                    Garder MaydAI comme registre centralisé
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Continuer à utiliser MaydAI pour centraliser vos informations de conformité IA
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2: Remove MaydAI */}
            <button
              onClick={handleRemove}
              disabled={updating}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start space-x-3">
                <XCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 group-hover:text-orange-900">
                    Retirer MaydAI comme registre centralisé
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    MaydAI ne sera plus votre outil de référence pour la conformité IA
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Loading State */}
          {updating && (
            <div className="flex items-center justify-center py-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0080A3] mr-2"></div>
              <span className="text-sm text-gray-600">Mise à jour en cours...</span>
            </div>
          )}

          {/* Cancel Button */}
          {!updating && (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

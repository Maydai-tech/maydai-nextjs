'use client'

import { X, CheckCircle } from 'lucide-react'

interface ConfirmCentralizedRegistryModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  registryName: string
  confirming: boolean
}

export default function ConfirmCentralizedRegistryModal({
  isOpen,
  onClose,
  onConfirm,
  registryName,
  confirming
}: ConfirmCentralizedRegistryModalProps) {
  if (!isOpen) return null

  const handleConfirm = async () => {
    try {
      await onConfirm()
    } catch (err) {
      // Error handling is done in parent component
      console.error('Error confirming centralized registry:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="bg-[#0080A3]/10 p-2 rounded-lg">
                <CheckCircle className="h-6 w-6 text-[#0080A3]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Déclarer MaydAI comme registre centralisé
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Confirmation requise
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={confirming}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Information Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-3">
                Vous êtes sur le point de déclarer MaydAI comme registre centralisé pour :
              </p>
              <p className="font-semibold text-base mb-3 text-gray-900">
                {registryName}
              </p>
              <p className="mb-2">
                Cela signifie que :
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>MaydAI sera votre outil principal pour gérer la conformité des cas d'usage IA</li>
                <li>Toutes les informations de conformité seront centralisées dans cet outil</li>
                <li>Vous pourrez générer des rapports de conformité à partir de MaydAI</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              onClick={onClose}
              disabled={confirming}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-4 py-2 bg-[#0080A3] text-white rounded-lg hover:bg-[#006280] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {confirming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Confirmation en cours...
                </>
              ) : (
                'Confirmer'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'

interface CancelSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  nextBillingDate: string
  planName: string
  loading?: boolean
}

export default function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  nextBillingDate,
  planName,
  loading = false
}: CancelSubscriptionModalProps) {
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen || !mounted) return null

  const handleConfirm = () => {
    if (confirmationChecked && !loading) {
      onConfirm()
    }
  }

  const handleClose = () => {
    if (!loading) {
      setConfirmationChecked(false)
      onClose()
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleClose()
        }
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto relative"
        style={{ zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Annuler votre abonnement MaydAI ?
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Votre abonnement <span className="font-semibold">{planName}</span> sera annulé et vous perdrez l'accès aux fonctionnalités premium à partir du{' '}
              <span className="font-semibold text-red-600">{nextBillingDate}</span>.
            </p>
          </div>

          {/* Confirmation checkbox */}
          <div className="mb-6">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmationChecked}
                onChange={(e) => setConfirmationChecked(e.target.checked)}
                disabled={loading}
                className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded disabled:opacity-50"
              />
              <span className="text-sm text-gray-700">
                Je comprends les conséquences et souhaite annuler mon abonnement
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={!confirmationChecked || loading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Annulation en cours...
                </>
              ) : (
                'Confirmer l\'annulation'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
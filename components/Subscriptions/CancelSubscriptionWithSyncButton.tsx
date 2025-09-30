'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle, Loader2, X } from 'lucide-react'
import { useCancelSubscriptionWithSync } from '@/app/abonnement/hooks/useCancelSubscriptionWithSync'
import { createPortal } from 'react-dom'

interface CancelSubscriptionWithSyncButtonProps {
  subscriptionId?: string
  planName: string
  nextBillingDate: string
  onSuccess?: () => void
  className?: string
  variant?: 'button' | 'link'
}

export default function CancelSubscriptionWithSyncButton({
  subscriptionId,
  planName,
  nextBillingDate,
  onSuccess,
  className = '',
  variant = 'button'
}: CancelSubscriptionWithSyncButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const { cancelWithSync, isLoading, syncCompleted, error, reset } = useCancelSubscriptionWithSync()

  const handleOpenModal = () => {
    reset() // Réinitialiser l'état
    setConfirmationChecked(false)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    if (!isLoading) {
      setShowModal(false)
      setConfirmationChecked(false)
      reset()
    }
  }

  const handleConfirm = async () => {
    if (!confirmationChecked || isLoading) return

    try {
      await cancelWithSync(subscriptionId)
      // Attendre un peu pour montrer le succès
      setTimeout(() => {
        handleCloseModal()
        onSuccess?.()
      }, 2000)
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error)
    }
  }

  const renderLoadingState = () => {
    if (!isLoading) return null

    if (syncCompleted) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Abonnement annulé avec succès</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 text-blue-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Annulation en cours...</span>
      </div>
    )
  }

  const renderError = () => {
    if (!error) return null

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Erreur</span>
        </div>
        <p className="text-sm text-red-700 mt-1">{error}</p>
      </div>
    )
  }

  const buttonClasses = variant === 'button'
    ? `px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors ${className}`
    : `text-red-600 hover:text-red-800 underline transition-colors ${className}`

  const modal = showModal && createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          handleCloseModal()
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
            <div className={`p-2 rounded-lg ${syncCompleted ? 'bg-green-100' : 'bg-red-100'}`}>
              {syncCompleted ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {syncCompleted ? 'Abonnement annulé' : 'Annuler votre abonnement MaydAI ?'}
            </h2>
          </div>
          <button
            onClick={handleCloseModal}
            disabled={isLoading && !syncCompleted}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {syncCompleted ? (
            <div className="text-center">
              <div className="mb-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              </div>
              <p className="text-gray-700 mb-4">
                Votre abonnement <span className="font-semibold">{planName}</span> a été annulé avec succès.
                Vous conserverez l'accès aux fonctionnalités premium jusqu'au{' '}
                <span className="font-semibold">{nextBillingDate}</span>.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Votre abonnement <span className="font-semibold">{planName}</span> sera annulé et vous perdrez l'accès aux fonctionnalités premium à partir du{' '}
                  <span className="font-semibold text-red-600">{nextBillingDate}</span>.
                </p>

                {/* État de chargement */}
                {renderLoadingState()}

                {/* Erreurs */}
                {renderError()}
              </div>

              {!isLoading && (
                <>
                  {/* Confirmation checkbox */}
                  <div className="mb-6">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmationChecked}
                        onChange={(e) => setConfirmationChecked(e.target.checked)}
                        className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        Je comprends les conséquences et souhaite annuler mon abonnement
                      </span>
                    </label>
                  </div>
                </>
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            {!syncCompleted && (
              <button
                onClick={handleCloseModal}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
            )}

            {syncCompleted ? (
              <button
                onClick={handleCloseModal}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 transition-colors"
              >
                Fermer
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!confirmationChecked || isLoading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    {syncCompleted ? 'Terminé !' : 'Annulation...'}
                  </>
                ) : (
                  'Confirmer l\'annulation'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )

  return (
    <>
      <button onClick={handleOpenModal} className={buttonClasses}>
        Annuler l'abonnement
      </button>
      {modal}
    </>
  )
}
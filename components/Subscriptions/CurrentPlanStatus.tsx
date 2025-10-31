'use client'

import React, { useState } from 'react'
import { CreditCard, Calendar, Download, Settings, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import CancelSubscriptionModal from './CancelSubscriptionModal'
import ReactivateSubscriptionModal from './ReactivateSubscriptionModal'
import { useCancelSubscriptionWithSync } from '@/app/abonnement/hooks/useCancelSubscriptionWithSync'
import { useReactivateSubscription } from '@/app/abonnement/hooks/useReactivateSubscription'

interface CurrentPlanStatusProps {
  planName: string
  billingCycle: 'monthly' | 'yearly'
  nextBillingDate: string
  nextBillingAmount: string
  onCancelSuccess?: () => void // Callback pour rafraîchir les données parent après annulation
  isFreePlan?: boolean
  isCanceled?: boolean
  cancelAtPeriodEnd?: boolean
}

export default function CurrentPlanStatus({
  planName,
  billingCycle,
  nextBillingDate,
  nextBillingAmount,
  onCancelSuccess,
  isFreePlan = false,
  isCanceled = false,
  cancelAtPeriodEnd = false
}: CurrentPlanStatusProps) {
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showReactivateModal, setShowReactivateModal] = useState(false)
  const { cancelWithSync, isLoading, syncCompleted, error, reset } = useCancelSubscriptionWithSync()
  const { reactivateSubscription, isLoading: isReactivating, error: reactivateError, success: reactivateSuccess, reset: resetReactivate } = useReactivateSubscription()

  const handleCancelClick = () => {
    reset() // Réinitialiser l'état
    setShowCancelModal(true)
  }

  const handleConfirmCancel = async () => {
    try {
      await cancelWithSync()
      // La synchronisation est gérée par le hook, le modal se fermera automatiquement
      // quand syncCompleted deviendra true dans le modal
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error)
    }
  }

  // Fermer le modal et rafraîchir quand la synchronisation est terminée
  React.useEffect(() => {
    if (syncCompleted && showCancelModal) {
      setShowCancelModal(false)
      onCancelSuccess?.() // Rafraîchir les données parent
      reset() // Réinitialiser pour la prochaine fois
    }
  }, [syncCompleted, showCancelModal, onCancelSuccess, reset])

  const handleCloseModal = () => {
    if (!isLoading) {
      setShowCancelModal(false)
      reset()
    }
  }

  const handleReactivateClick = () => {
    resetReactivate()
    setShowReactivateModal(true)
  }

  const handleConfirmReactivate = async () => {
    try {
      await reactivateSubscription()
      // Le modal se fermera automatiquement après succès
    } catch (error) {
      console.error('Erreur lors de la réactivation:', error)
    }
  }

  const handleCloseReactivateModal = () => {
    if (!isReactivating) {
      setShowReactivateModal(false)
      resetReactivate()
    }
  }

  // Fermer le modal de réactivation et rafraîchir quand le succès est atteint
  React.useEffect(() => {
    if (reactivateSuccess && showReactivateModal) {
      setTimeout(() => {
        setShowReactivateModal(false)
        onCancelSuccess?.() // Rafraîchir les données parent
        resetReactivate()
      }, 2000) // Fermer après 2s pour montrer le succès
    }
  }, [reactivateSuccess, showReactivateModal, onCancelSuccess, resetReactivate])
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-[#0080A3]/10 p-3 rounded-lg">
            <CreditCard className="h-6 w-6 text-[#0080A3]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Plan actuel</h3>
            <p className="text-gray-600">
              {planName} • Facturation {billingCycle === 'monthly' ? 'mensuelle' : 'annuelle'}
            </p>
            {!isFreePlan && !cancelAtPeriodEnd && (
              <button
                onClick={handleCancelClick}
                className="text-sm text-red-600 hover:text-red-700 transition-colors duration-200 underline"
              >
                Annuler mon abonnement
              </button>
            )}
            {cancelAtPeriodEnd && !isFreePlan && (
              <button
                onClick={handleReactivateClick}
                className="text-sm text-green-600 hover:text-green-700 transition-colors duration-200 underline"
              >
                Réactiver mon abonnement
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            {cancelAtPeriodEnd ? (
              <>
                <p className="text-sm text-red-500">Abonnement annulé</p>
                <p className="text-lg font-semibold text-red-600">Expire le {nextBillingDate}</p>
                <p className="text-sm text-gray-500">Plus de renouvellement</p>
              </>
            ) : !isFreePlan ? (
              <>
                <p className="text-sm text-gray-500">Prochaine facturation</p>
                <p className="text-lg font-semibold text-gray-900">{nextBillingAmount}€</p>
                <p className="text-sm text-gray-500">{nextBillingDate}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">Plan gratuit</p>
                <p className="text-lg font-semibold text-gray-900">0€</p>
                <p className="text-sm text-gray-500">Aucune facturation</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'annulation */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmCancel}
        nextBillingDate={nextBillingDate}
        planName={planName}
        loading={isLoading}
        syncCompleted={syncCompleted}
        error={error}
      />

      {/* Modal de réactivation */}
      <ReactivateSubscriptionModal
        isOpen={showReactivateModal}
        onClose={handleCloseReactivateModal}
        onConfirm={handleConfirmReactivate}
        nextBillingDate={nextBillingDate}
        planName={planName}
        loading={isReactivating}
        success={reactivateSuccess}
        error={reactivateError}
      />
    </div>
  )
}

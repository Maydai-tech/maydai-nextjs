'use client'

import React, { useState } from 'react'
import { CreditCard, Calendar, Download, Settings, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import CancelSubscriptionModal from './CancelSubscriptionModal'
import { useCancelSubscriptionWithSync } from '@/app/abonnement/hooks/useCancelSubscriptionWithSync'

interface CurrentPlanStatusProps {
  planName: string
  billingCycle: 'monthly' | 'yearly'
  nextBillingDate: string
  nextBillingAmount: number
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
  const { cancelWithSync, isLoading, syncCompleted, error, reset } = useCancelSubscriptionWithSync()

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
      setTimeout(() => {
        setShowCancelModal(false)
        onCancelSuccess?.() // Rafraîchir les données parent
        reset() // Réinitialiser pour la prochaine fois
      }, 2000) // Laisser 2 secondes pour voir le message de succès
    }
  }, [syncCompleted, showCancelModal, onCancelSuccess, reset])

  const handleCloseModal = () => {
    if (!isLoading) {
      setShowCancelModal(false)
      reset()
    }
  }
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



          {cancelAtPeriodEnd && (
            <div className="px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg">
              Annulation programmée
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-50/80 rounded-lg hover:bg-gray-100/80 transition-all duration-200 hover:scale-[1.02]">
            <Download className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Télécharger facture</span>
          </button>

          <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-50/80 rounded-lg hover:bg-gray-100/80 transition-all duration-200 hover:scale-[1.02]">
            <Calendar className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Historique</span>
          </button>

          <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-50/80 rounded-lg hover:bg-gray-100/80 transition-all duration-200 hover:scale-[1.02]">
            <Settings className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Paramètres</span>
          </button>
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
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ArrowRight, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'

interface ChangePlanModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  currentPlan: {
    name: string
    price: number
  }
  newPlan: {
    name: string
    price: number
  }
  billingCycle: 'monthly' | 'yearly'
  loading?: boolean
  success?: boolean
  error?: string | null
  cancelAtPeriodEnd?: boolean
}

export default function ChangePlanModal({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  newPlan,
  billingCycle,
  loading = false,
  success = false,
  error = null,
  cancelAtPeriodEnd = false
}: ChangePlanModalProps) {
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reset checkbox when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmationChecked(false)
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const handleConfirm = () => {
    if (confirmationChecked && !loading) {
      onConfirm()
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  const isUpgrade = newPlan.price > currentPlan.price
  const isDowngrade = newPlan.price < currentPlan.price
  const priceDifference = Math.abs(newPlan.price - currentPlan.price)
  const cycleLabel = billingCycle === 'monthly' ? 'mois' : 'an'

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
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-auto relative"
        style={{ zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              success ? 'bg-green-100' : loading ? 'bg-blue-100' : 'bg-[#0080A3]/10'
            }`}>
              {success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : loading ? (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5 text-[#0080A3]" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {success
                ? 'Plan modifié avec succès'
                : loading
                  ? 'Changement en cours...'
                  : 'Changer votre plan MaydAI'
              }
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading && !success}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
              {/* Plan Comparison */}
              <div className="mb-6">
                <div className="flex items-center justify-center gap-4 mb-6">
                  {/* Current Plan */}
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Plan actuel</p>
                    <p className="font-semibold text-gray-900">{currentPlan.name}</p>
                    <p className="text-lg font-bold text-gray-600 mt-1">
                      {currentPlan.price}€<span className="text-sm font-normal">/{cycleLabel}</span>
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <ArrowRight className="h-6 w-6 text-[#0080A3]" />
                  </div>

                  {/* New Plan */}
                  <div className="flex-1 bg-[#0080A3]/5 border-2 border-[#0080A3] rounded-lg p-4 text-center">
                    <p className="text-xs text-[#0080A3] mb-1">Nouveau plan</p>
                    <p className="font-semibold text-gray-900">{newPlan.name}</p>
                    <p className="text-lg font-bold text-[#0080A3] mt-1">
                      {newPlan.price}€<span className="text-sm font-normal">/{cycleLabel}</span>
                    </p>
                  </div>
                </div>

                {/* Pricing Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-2">Tarification du changement</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Changement effectif <strong>immédiatement</strong></li>
                        {isUpgrade && (
                          <li>• Vous serez facturé au <strong>prorata</strong> pour le temps restant jusqu'à votre prochaine facturation</li>
                        )}
                        {isDowngrade && (
                          <li>• Un <strong>crédit</strong> sera appliqué au prorata sur votre prochaine facture</li>
                        )}
                        <li>• Différence de prix : <strong>{isUpgrade ? '+' : '-'}{priceDifference}€/{cycleLabel}</strong></li>
                      </ul>
                      <p className="text-xs text-blue-700 mt-3 italic">
                        Le montant exact du prorata sera calculé automatiquement par Stripe en fonction du temps restant sur votre cycle de facturation actuel.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reactivation Notice */}
                {cancelAtPeriodEnd && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900 mb-1">Réactivation automatique</p>
                        <p className="text-sm text-green-800">
                          Votre abonnement était prévu pour être annulé à la fin de la période. En reprenant un plan, votre abonnement sera <strong>automatiquement réactivé</strong> et ne sera plus marqué pour annulation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Loading State */}
              {loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    <div>
                      <p className="text-blue-800 font-medium">Modification en cours...</p>
                      <p className="text-blue-700 text-sm">Veuillez patienter</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">Erreur</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              )}

              {/* Confirmation checkbox */}
              <div className="mb-6">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmationChecked}
                    onChange={(e) => setConfirmationChecked(e.target.checked)}
                    disabled={loading}
                    className="mt-1 h-4 w-4 text-[#0080A3] focus:ring-[#0080A3] border-gray-300 rounded disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">
                    Je comprends et souhaite changer mon plan
                  </span>
                </label>
              </div>

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            {!success && (
              <button
                onClick={handleClose}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
            )}

            {success ? (
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 transition-colors"
              >
                Fermer
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!confirmationChecked || loading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-[#0080A3] border border-transparent rounded-lg hover:bg-[#006d8a] focus:ring-4 focus:ring-[#0080A3]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Changement...
                  </>
                ) : (
                  'Confirmer le changement'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

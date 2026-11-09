'use client'

import Link from 'next/link'
import { formatRemainingPurgeLabel, type EntitySlotOccupancyInput } from '@/lib/validations/governance-scores'

interface FreemiumDeletionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmDelete: () => void
  isDeleting: boolean
  entityType: 'company' | 'usecase'
  entityName: string
  isFreemium: boolean
  quotaReachedError: string | null
  confirmationMessage?: string | null
}

export function PurgeStatusBadge({ entity }: { entity?: EntitySlotOccupancyInput | null }) {
  const label = formatRemainingPurgeLabel(entity)
  if (!label) return null
  return (
    <p className="mt-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-1 inline-block">
      {label}
    </p>
  )
}

export default function FreemiumDeletionModal({
  isOpen,
  onClose,
  onConfirmDelete,
  isDeleting,
  entityType,
  entityName,
  isFreemium,
  quotaReachedError,
  confirmationMessage,
}: FreemiumDeletionModalProps) {
  if (!isOpen) return null

  const entityLabel = entityType === 'company' ? 'registre' : "cas d'usage"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        {isFreemium ? (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              ⚠️ Alerte de Traçabilité AI Act : La réglementation européenne impose de conserver l&apos;historique de vos évaluations IA. En supprimant cet élément, vous perdrez votre antériorité de conformité.
            </h2>
            <p className="text-sm text-gray-700 mb-3">
              En offre Freemium, toute suppression nécessite une validation par email et un délai de sécurité de 24h avant de libérer votre espace (limité à 1 fois par mois).
            </p>
            <p className="text-sm text-gray-700 mb-4">
              Besoin d&apos;auditer un nouveau cas d&apos;usage immédiatement sans perdre votre historique ? Passez au forfait 9 €/mois.
            </p>
            <p className="text-sm text-gray-500 mb-4">{entityLabel} : {entityName}</p>
            {quotaReachedError ? (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {quotaReachedError}
              </p>
            ) : null}
            {confirmationMessage ? (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {confirmationMessage}
              </p>
            ) : null}
            <div className="flex flex-col gap-3">
              <Link
                href="/abonnement"
                className="inline-flex justify-center rounded-lg bg-[#0080A3] px-4 py-3 text-sm font-semibold text-white hover:bg-[#006280]"
              >
                Débloquer des registres supplémentaires (9 €)
              </Link>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={isDeleting || Boolean(quotaReachedError) || Boolean(confirmationMessage)}
                className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? 'Envoi…' : "Recevoir l'email de confirmation de suppression"}
              </button>
              <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
                Fermer
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Supprimer {entityLabel}</h2>
            <p className="text-sm text-gray-700 mb-4">
              La suppression de « {entityName} » est immédiate et définitive.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
                Annuler
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Utilitaires pour le formatage des données d'abonnement
 * Fonctions simples pour formater les dates, montants et cycles de facturation
 */

import { BillingCycle } from './types'

/**
 * Détermine le cycle de facturation basé sur le plan
 * Pour l'instant, on considère que tous les plans sont mensuels par défaut
 * Cette logique peut être enrichie plus tard avec des données de Stripe
 */
export function formatBillingCycle(planId: string): BillingCycle {
  // Pour l'instant, tous les plans sont en facturation mensuelle
  // Cette fonction peut être enrichie plus tard avec la logique Stripe
  return 'monthly'
}

/**
 * Formate la prochaine date de facturation
 * @param date - Date de fin de période au format ISO string
 * @returns Date formatée en français ou "Gratuit" si pas de date
 */
export function formatNextBillingDate(date: string | null): string {
  if (!date) {
    return 'Gratuit'
  }

  try {
    const nextDate = new Date(date)
    return nextDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error)
    return 'Date invalide'
  }
}

/**
 * Calcule le montant de la prochaine facturation
 * Basé sur le plan et le cycle de facturation
 */
export function calculateNextBillingAmount(planId: string, billingCycle: BillingCycle): number {
  // Mapping des prix par plan et cycle
  const prices = {
    starter: { monthly: 0, yearly: 0 },
    pro: { monthly: 10, yearly: 100 },
    enterprise: { monthly: 1000, yearly: 10000 }
  }

  const planPrices = prices[planId as keyof typeof prices]
  if (!planPrices) {
    return 0 // Plan inconnu = gratuit
  }

  return planPrices[billingCycle]
}

/**
 * Vérifie si l'abonnement est actif
 * @param status - Statut de l'abonnement depuis Stripe
 * @returns true si l'abonnement est actif
 */
export function isSubscriptionActive(status: string): boolean {
  const activeStatuses = ['active', 'trialing']
  return activeStatuses.includes(status.toLowerCase())
}

/**
 * Vérifie si l'abonnement va être annulé à la fin de la période
 * @param cancelAtPeriodEnd - Indicateur d'annulation
 * @param status - Statut de l'abonnement
 * @returns true si l'abonnement sera annulé
 */
export function isSubscriptionCanceling(cancelAtPeriodEnd: boolean, status: string): boolean {
  return cancelAtPeriodEnd && isSubscriptionActive(status)
}

/**
 * Formate le statut d'abonnement pour l'affichage
 * @param status - Statut brut de l'abonnement
 * @returns Statut formaté en français
 */
export function formatSubscriptionStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'active': 'Actif',
    'inactive': 'Inactif',
    'canceled': 'Annulé',
    'past_due': 'Impayé',
    'trialing': 'Période d\'essai',
    'incomplete': 'Incomplet',
    'incomplete_expired': 'Expiré'
  }

  return statusMap[status.toLowerCase()] || 'Statut inconnu'
}
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
 * Récupère les prix en temps réel depuis la table plans
 */
export async function calculateNextBillingAmount(planId: string, billingCycle: BillingCycle): Promise<number> {
  try {
    // Importer la fonction de récupération des plans
    const { fetchPlans } = await import('@/lib/api/plans')

    // Récupérer tous les plans (avec cache de 5 minutes)
    const plans = await fetchPlans()

    // Trouver le plan correspondant
    const plan = plans.find(p => p.id === planId)

    if (!plan) {
      console.warn(`Plan ${planId} not found, returning 0`)
      return 0
    }

    // Retourner le prix selon le cycle de facturation
    return billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly
  } catch (error) {
    console.error('Error calculating next billing amount:', error)
    return 0
  }
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
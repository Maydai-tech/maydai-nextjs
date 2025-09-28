/**
 * Service de mapping des plans d'abonnement
 * Fait le lien entre les IDs de plans et leurs informations d'affichage
 */

import { PlanInfo } from './types'

// Mapping des plans avec leurs informations d'affichage
const PLAN_MAPPING: Record<string, PlanInfo> = {
  'starter': {
    id: 'starter',
    name: 'starter',
    displayName: 'La Mise en Bouche',
    description: 'Plan gratuit pour découvrir MaydAI',
    isFree: true
  },
  'pro': {
    id: 'pro',
    name: 'pro',
    displayName: 'L\'Appétit Vient en Mangeant',
    description: 'Plan professionnel pour les organisations',
    isFree: false
  },
  'enterprise': {
    id: 'enterprise',
    name: 'enterprise',
    displayName: 'Le Pilote',
    description: 'Plan entreprise avec accompagnement',
    isFree: false
  }
}

/**
 * Récupère les informations d'affichage d'un plan
 * @param planId - L'ID du plan (starter, pro, enterprise)
 * @returns Les informations du plan ou le plan par défaut
 */
export function getPlanInfo(planId: string): PlanInfo {
  return PLAN_MAPPING[planId] || getDefaultPlan()
}

/**
 * Récupère le plan par défaut (plan gratuit)
 * @returns Le plan starter par défaut
 */
export function getDefaultPlan(): PlanInfo {
  return PLAN_MAPPING['starter']
}

/**
 * Vérifie si un plan existe
 * @param planId - L'ID du plan à vérifier
 * @returns true si le plan existe, false sinon
 */
export function isPlanValid(planId: string): boolean {
  return planId in PLAN_MAPPING
}

/**
 * Récupère tous les plans disponibles
 * @returns La liste de tous les plans
 */
export function getAllPlans(): PlanInfo[] {
  return Object.values(PLAN_MAPPING)
}

/**
 * Récupère seulement les plans payants
 * @returns La liste des plans payants
 */
export function getPaidPlans(): PlanInfo[] {
  return Object.values(PLAN_MAPPING).filter(plan => !plan.isFree)
}
'use client'

import { EvaluationPageContent } from './EvaluationPageContent'

/**
 * Évaluation : pas de `UseCaseLayout` / `UseCaseRiskContext` volontairement (UX pleine page).
 * Parcours court V3 : `?parcours=court` — même graphe / codes / moteur ; fin sur 3 étapes synthétiques puis complétion identique au long (score, rapport, dashboard).
 */
export default function UseCaseEvaluationPage() {
  return <EvaluationPageContent />
}

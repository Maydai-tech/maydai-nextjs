'use client'

import { EvaluationPageContent } from './EvaluationPageContent'

/**
 * Évaluation : pas de `UseCaseLayout` / `UseCaseRiskContext` volontairement (UX pleine page).
 * Parcours court V3 : `?parcours=court` — même graphe / codes / moteur ; sans bloc E5, avec enchaînement Q12 puis E6 si le graphe le prévoit.
 */
export default function UseCaseEvaluationPage() {
  return <EvaluationPageContent />
}

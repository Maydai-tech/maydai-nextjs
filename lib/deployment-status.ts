/** Valeurs persistées pour `usecases.deployment_phase` (création / édition). */
export const DEPLOYMENT_PHASE_PRODUCTION = 'En production' as const
export const DEPLOYMENT_PHASE_TEST = 'En phase de test / Expérimentation' as const
export const DEPLOYMENT_PHASE_PROJECT = 'En projet (Non déployé)' as const

export const DEPLOYMENT_PHASE_OPTIONS = [
  DEPLOYMENT_PHASE_PRODUCTION,
  DEPLOYMENT_PHASE_TEST,
  DEPLOYMENT_PHASE_PROJECT,
] as const

export type DeploymentPhaseValue = (typeof DEPLOYMENT_PHASE_OPTIONS)[number]

function inferActifInactifFromDateOnly(deploymentDate?: string | null): 'Actif' | 'Inactif' {
  if (!deploymentDate) return 'Inactif'
  try {
    const deployment = new Date(deploymentDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deployment.setHours(0, 0, 0, 0)
    if (Number.isNaN(deployment.getTime())) return 'Inactif'
    return deployment <= today ? 'Actif' : 'Inactif'
  } catch {
    return 'Inactif'
  }
}

/**
 * Pastille Actif / Inactif : priorité à `deployment_phase` si renseignée, sinon inférence historique sur la date seule.
 */
export function getDeploymentStatus(
  deploymentDate?: string | null,
  deploymentPhase?: string | null
): 'Actif' | 'Inactif' {
  const phase = deploymentPhase?.trim()
  if (phase) {
    if (phase === DEPLOYMENT_PHASE_PROJECT) {
      return 'Inactif'
    }
    if (phase === DEPLOYMENT_PHASE_PRODUCTION || phase === DEPLOYMENT_PHASE_TEST) {
      const dateStr = deploymentDate?.trim()
      if (!dateStr) return 'Inactif'
      return inferActifInactifFromDateOnly(deploymentDate)
    }
  }
  return inferActifInactifFromDateOnly(deploymentDate)
}

export function getDeploymentDateFieldLabel(phase: string): string {
  if (phase === DEPLOYMENT_PHASE_PROJECT) {
    return 'Date de déploiement prévue'
  }
  return 'Date de mise en service (exacte ou approximative)'
}

export function getDeploymentStatusColor(status: 'Actif' | 'Inactif') {
  if (status === 'Actif') {
    return {
      backgroundColor: '#f1fdfa',
      color: '#0080a3',
      border: 'border border-[#0080a3]',
    }
  }
  return {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    border: 'border border-gray-300',
  }
}

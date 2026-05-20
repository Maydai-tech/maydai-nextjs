import {
  DEPLOYMENT_PHASE_PRODUCTION,
  DEPLOYMENT_PHASE_PROJECT,
  DEPLOYMENT_PHASE_TEST,
  DEPLOYMENT_PHASE_UI_OPTIONS,
  normalizeDeploymentPhaseKey,
  type DeploymentPhaseKey,
} from '@/lib/deployment-phase'

export {
  DEPLOYMENT_PHASE_KEYS,
  DEPLOYMENT_PHASE_LABELS,
  DEPLOYMENT_PHASE_UI_OPTIONS,
  DEPLOYMENT_PHASE_PRODUCTION,
  DEPLOYMENT_PHASE_PROJECT,
  DEPLOYMENT_PHASE_TEST,
  deploymentPhaseKeySchema,
  getDeploymentPhaseLabel,
  normalizeDeploymentPhaseKey,
  type DeploymentPhaseKey,
} from '@/lib/deployment-phase'

/** @deprecated Utiliser `DEPLOYMENT_PHASE_UI_OPTIONS` (value = clé technique, label = libellé FR). */
export const DEPLOYMENT_PHASE_OPTIONS = DEPLOYMENT_PHASE_UI_OPTIONS

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
  const key = normalizeDeploymentPhaseKey(deploymentPhase)
  if (key) {
    if (key === DEPLOYMENT_PHASE_PROJECT) {
      return 'Inactif'
    }
    if (key === DEPLOYMENT_PHASE_PRODUCTION || key === DEPLOYMENT_PHASE_TEST) {
      const dateStr = deploymentDate?.trim()
      if (!dateStr) return 'Inactif'
      return inferActifInactifFromDateOnly(deploymentDate)
    }
  }
  return inferActifInactifFromDateOnly(deploymentDate)
}

export function getDeploymentDateFieldLabel(phase: string): string {
  const key = normalizeDeploymentPhaseKey(phase)
  if (key === DEPLOYMENT_PHASE_PROJECT) {
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

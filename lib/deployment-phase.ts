import { z } from 'zod'

/** Clés techniques persistées en base (`deployment_phase_enum`). */
export const DEPLOYMENT_PHASE_KEYS = ['en_projet', 'en_production', 'en_test'] as const

export type DeploymentPhaseKey = (typeof DEPLOYMENT_PHASE_KEYS)[number]

export const DEPLOYMENT_PHASE_PROJECT: DeploymentPhaseKey = 'en_projet'
export const DEPLOYMENT_PHASE_PRODUCTION: DeploymentPhaseKey = 'en_production'
export const DEPLOYMENT_PHASE_TEST: DeploymentPhaseKey = 'en_test'

export const deploymentPhaseKeySchema = z.enum(DEPLOYMENT_PHASE_KEYS)

/** Libellés français affichés dans l'UI (jamais envoyés à l'API). */
export const DEPLOYMENT_PHASE_LABELS: Record<DeploymentPhaseKey, string> = {
  en_projet: 'En projet (Non déployé)',
  en_production: 'En production',
  en_test: 'En phase de test / Expérimentation',
}

export const DEPLOYMENT_PHASE_UI_OPTIONS = DEPLOYMENT_PHASE_KEYS.map((value) => ({
  value,
  label: DEPLOYMENT_PHASE_LABELS[value],
}))

const LEGACY_FRENCH_LABEL_TO_KEY: Record<string, DeploymentPhaseKey> = {
  [DEPLOYMENT_PHASE_LABELS.en_projet]: 'en_projet',
  [DEPLOYMENT_PHASE_LABELS.en_production]: 'en_production',
  [DEPLOYMENT_PHASE_LABELS.en_test]: 'en_test',
}

function resolveKnownDeploymentPhaseKey(
  trimmed: string
): DeploymentPhaseKey | null {
  if (DEPLOYMENT_PHASE_KEYS.includes(trimmed as DeploymentPhaseKey)) {
    return trimmed as DeploymentPhaseKey
  }
  return LEGACY_FRENCH_LABEL_TO_KEY[trimmed] ?? null
}

/**
 * Lecture DB / affichage : clé technique, libellé français legacy, ou fallback `en_projet`.
 */
export function normalizeDeploymentPhaseKey(
  phase?: string | null
): DeploymentPhaseKey | null {
  const trimmed = phase?.trim()
  if (!trimmed) return null
  return resolveKnownDeploymentPhaseKey(trimmed) ?? DEPLOYMENT_PHASE_PROJECT
}

export function getDeploymentPhaseLabel(phase?: string | null): string {
  const key = normalizeDeploymentPhaseKey(phase)
  if (!key) return phase?.trim() ?? ''
  return DEPLOYMENT_PHASE_LABELS[key]
}

/** Préprocess API : vide → défaut, libellés legacy → clés ; valeurs inconnues laissées pour échec z.enum. */
export function normalizeDeploymentPhaseInput(val: unknown): unknown {
  if (val === undefined || val === null) return 'en_projet'
  if (typeof val !== 'string') return val
  const trimmed = val.trim()
  if (!trimmed) return 'en_projet'
  return resolveKnownDeploymentPhaseKey(trimmed) ?? trimmed
}

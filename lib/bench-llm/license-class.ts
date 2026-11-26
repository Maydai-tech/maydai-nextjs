import { foldControlTowerHeader } from '@/lib/bench-llm/control-tower-headers'

export const LICENSE_CLASSES = [
  'proprietary',
  'open_free',
  'open_conditional',
  'open_non_commercial',
  'open_to_qualify',
  'unknown',
] as const

export type LicenseClass = (typeof LICENSE_CLASSES)[number]

export const LICENSE_CLASS_LABELS: Record<LicenseClass, string> = {
  proprietary: 'Propriétaire',
  open_free: 'Poids ouverts, licence libre',
  open_conditional: 'Poids ouverts, licence commerciale sous conditions',
  open_non_commercial: 'Poids ouverts, licence non commerciale',
  open_to_qualify: 'Poids ouverts, licence à qualifier',
  unknown: 'Non renseigné',
}

export const OPEN_LICENSE_CLASSES: readonly LicenseClass[] = [
  'open_free',
  'open_conditional',
  'open_non_commercial',
  'open_to_qualify',
]

export function licenseClassFromLabel(label: string): LicenseClass | 'empty' | 'invalid' {
  const text = foldControlTowerHeader(label)
  if (!text) return 'empty'
  const match = (Object.entries(LICENSE_CLASS_LABELS) as Array<[LicenseClass, string]>)
    .find(([, value]) => foldControlTowerHeader(value) === text)
  return match ? match[0] : 'invalid'
}

/** Un tiret seul, comme dans l’onglet des licences, veut dire « pas de valeur ». */
export function blankLicenseText(value: string): string | null {
  const text = value.trim()
  if (!text || text === '-') return null
  return text
}

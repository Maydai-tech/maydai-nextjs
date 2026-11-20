import { CONTROL_TOWER_ROLES, type ControlTowerRole } from '@/lib/bench-llm/control-tower-roles'
import { foldControlTowerHeader } from '@/lib/bench-llm/control-tower-headers'

export type LineKind = 'modele' | 'variante' | 'doublon' | 'hors_champ' | 'inconnu'

const SIZE_PATTERN = /\b\d+(?:x\d+)?b\b/g

export function parameterSizes(name: string): string[] {
  const folded = foldControlTowerHeader(name).replace(/[^a-z0-9]+/g, ' ')
  return [...folded.matchAll(SIZE_PATTERN)].map((match) => match[0])
}

export function lineKindFromRole(role: string | null | undefined): LineKind {
  switch (role) {
    case 'base':
    case 'version':
    case 'non_documente':
      return 'modele'
    case 'stade':
    case 'reglage':
    case 'format':
      return 'variante'
    case 'alias':
      return 'doublon'
    case 'auxiliaire':
    case 'introuvable':
      return 'hors_champ'
    default:
      return 'inconnu'
  }
}

export function roleFromLineLabels(
  typeLigne: string,
  precision: string,
): ControlTowerRole | null | 'invalid' {
  const type = foldControlTowerHeader(typeLigne)
  const detail = foldControlTowerHeader(precision)
  if (!type && !detail) return null
  if (type === 'modele') {
    if (!detail || detail === 'fiche de base') return 'base'
    if (detail === 'fiche de version') return 'version'
    if (detail === 'fiche de constat') return 'non_documente'
    return 'invalid'
  }
  if (type === 'variante') {
    if (detail === 'stade') return 'stade'
    if (detail === 'reglage') return 'reglage'
    if (detail === 'format' || detail === 'instantane') return 'format'
    return 'invalid'
  }
  if (type === 'doublon') return detail ? 'invalid' : 'alias'
  if (type === 'hors champ') {
    if (detail === 'auxiliaire') return 'auxiliaire'
    if (detail === 'introuvable') return 'introuvable'
    return 'invalid'
  }
  return 'invalid'
}

export function roleFromLegacyLabel(value: string): ControlTowerRole | null | 'invalid' {
  const text = foldControlTowerHeader(value).replace(/ /g, '_')
  if (!text) return null
  if ((CONTROL_TOWER_ROLES as readonly string[]).includes(text)) return text as ControlTowerRole
  return 'invalid'
}

export function explainReferenceRefusal(input: {
  modelId: string
  modelName: string
  referenceId: string | null
  names: ReadonlyMap<string, string>
  kinds: ReadonlyMap<string, LineKind>
  references: ReadonlyMap<string, string | null>
}): string | null {
  const referenceId = input.referenceId
  if (!referenceId) return null
  if (referenceId === input.modelId) return 'la ligne de référence est la ligne elle-même'
  if ((input.kinds.get(referenceId) ?? 'inconnu') !== 'modele') {
    return "la ligne de référence n'est pas de type Modèle"
  }
  const ownSizes = parameterSizes(input.modelName)
  const targetSizes = parameterSizes(input.names.get(referenceId) ?? '')
  if (ownSizes.length > 0 && targetSizes.length > 0 && ownSizes.join(' ') !== targetSizes.join(' ')) {
    return 'la taille diffère de la ligne de référence'
  }

  const seen = new Set<string>([input.modelId])
  let current: string | null = referenceId
  let hops = 0
  while (current) {
    hops += 1
    if (seen.has(current)) return 'boucle de lignes de référence'
    if (hops > 1) return 'chaîne de lignes de référence'
    seen.add(current)
    current = input.references.get(current) ?? null
  }
  return null
}

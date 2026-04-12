/**
 * Affichage admin / dashboard : distingue classification V3 (impossible / qualified),
 * cas legacy (V1/V2) et absence de niveau.
 */

/** Recadrage scores (maturité / conformité) vs qualification AI Act — périmètre use case V3. */
export const V3_IMPOSSIBLE_MATURITY_SCORES_DISCLAIMER =
  'Les scores affichés ci-dessous reflètent l’évaluation de maturité / conformité, mais ne constituent pas une qualification réglementaire AI Act.'

const QUALIFIED_LEVELS = new Set([
  'minimal',
  'limited',
  'high',
  'unacceptable',
  'systemic',
])

export function hasQualifiedRiskLevel(riskLevel: string | null | undefined): boolean {
  const r = riskLevel?.trim().toLowerCase()
  return !!r && QUALIFIED_LEVELS.has(r)
}

export function isClassificationImpossible(
  classificationStatus: string | null | undefined
): boolean {
  return classificationStatus === 'impossible'
}

/** Libellé métier court (listes, badges, exports). */
export function getClassificationRiskDisplayLabel(
  classificationStatus: string | null | undefined,
  riskLevel: string | null | undefined
): string {
  if (isClassificationImpossible(classificationStatus)) {
    return 'Classification impossible'
  }
  if (classificationStatus === 'qualified') {
    return hasQualifiedRiskLevel(riskLevel) ? qualifiedLevelLabel(riskLevel!) : 'Non évalué'
  }
  if (hasQualifiedRiskLevel(riskLevel)) {
    return qualifiedLevelLabel(riskLevel!)
  }
  return 'Non évalué'
}

function qualifiedLevelLabel(level: string): string {
  switch (level.trim().toLowerCase()) {
    case 'minimal':
      return 'Minimal'
    case 'limited':
      return 'Limité'
    case 'high':
      return 'Élevé'
    case 'unacceptable':
      return 'Inacceptable'
    case 'systemic':
      return 'Systémique'
    default:
      return level
  }
}

export function isUnevaluatedRiskDisplay(
  classificationStatus: string | null | undefined,
  riskLevel: string | null | undefined
): boolean {
  return getClassificationRiskDisplayLabel(classificationStatus, riskLevel) === 'Non évalué'
}

/**
 * Filtre liste admin : niveaux standards n’incluent jamais les cas `impossible`.
 * Valeurs spéciales : `impossible`, `unevaluated`.
 */
export function matchesAdminRiskLevelFilter(
  filter: string,
  classificationStatus: string | null | undefined,
  riskLevel: string | null | undefined
): boolean {
  if (!filter) return true
  if (filter === 'impossible') {
    return isClassificationImpossible(classificationStatus)
  }
  if (filter === 'unevaluated') {
    return isUnevaluatedRiskDisplay(classificationStatus, riskLevel)
  }
  if (isClassificationImpossible(classificationStatus)) {
    return false
  }
  const want = filter.toLowerCase()
  return hasQualifiedRiskLevel(riskLevel) && riskLevel!.trim().toLowerCase() === want
}

/** Style type todo-helpers / dossiers (cartes liste). */
export interface ListRiskBadgeStyle {
  bg: string
  border: string
  text: string
  label: string
}

export function getListRiskBadgeStyle(
  classificationStatus: string | null | undefined,
  riskLevel: string | null | undefined
): ListRiskBadgeStyle {
  if (isClassificationImpossible(classificationStatus)) {
    return {
      bg: 'bg-violet-50',
      border: 'border-violet-300',
      text: 'text-violet-900',
      label: 'Classification impossible',
    }
  }
  if (!hasQualifiedRiskLevel(riskLevel)) {
    return {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      text: 'text-gray-800',
      label: 'Non évalué',
    }
  }
  switch (riskLevel!.trim().toLowerCase()) {
    case 'minimal':
      return {
        bg: 'bg-[#f1fdfa]',
        border: 'border-green-300',
        text: 'text-green-800',
        label: qualifiedLevelLabel(riskLevel!),
      }
    case 'limited':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-300',
        text: 'text-yellow-800',
        label: qualifiedLevelLabel(riskLevel!),
      }
    case 'high':
    case 'systemic':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        text: 'text-orange-800',
        label: qualifiedLevelLabel(riskLevel!),
      }
    case 'unacceptable':
      return {
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-red-800',
        label: qualifiedLevelLabel(riskLevel!),
      }
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-300',
        text: 'text-gray-800',
        label: qualifiedLevelLabel(riskLevel!),
      }
  }
}

/** Pastille compacte (dashboard entreprise). */
export function getClassificationRiskPillClasses(
  classificationStatus: string | null | undefined,
  riskLevel: string | null | undefined
): string {
  if (isClassificationImpossible(classificationStatus)) {
    return 'text-violet-800 bg-violet-50 border border-violet-200'
  }
  if (!hasQualifiedRiskLevel(riskLevel)) {
    return 'text-gray-700 bg-gray-50 border border-gray-200'
  }
  switch (riskLevel!.trim().toLowerCase()) {
    case 'unacceptable':
      return 'text-red-700 bg-red-50 border border-red-200'
    case 'high':
    case 'systemic':
      return 'text-red-700 bg-red-50 border border-red-200'
    case 'limited':
      return 'text-yellow-700 bg-yellow-50 border border-yellow-200'
    case 'minimal':
      return 'text-green-700 bg-green-50 border border-green-200'
    default:
      return 'text-gray-700 bg-gray-50 border border-gray-200'
  }
}

export type RiskPyramidBucket =
  | 'minimal'
  | 'limited'
  | 'high'
  | 'unacceptable'
  | 'impossible'
  | 'unevaluated'

export interface RiskPyramidCounts {
  minimal: number
  limited: number
  high: number
  unacceptable: number
  impossible: number
  unevaluated: number
}

export function getRiskPyramidBucket(
  classificationStatus: string | null | undefined,
  riskLevel: string | null | undefined
): RiskPyramidBucket {
  if (isClassificationImpossible(classificationStatus)) {
    return 'impossible'
  }
  if (isUnevaluatedRiskDisplay(classificationStatus, riskLevel)) {
    return 'unevaluated'
  }
  const r = riskLevel!.trim().toLowerCase()
  if (r === 'minimal') return 'minimal'
  if (r === 'limited') return 'limited'
  if (r === 'high' || r === 'systemic') return 'high'
  if (r === 'unacceptable') return 'unacceptable'
  return 'unevaluated'
}

export function computeRiskPyramidCounts(
  useCases: Array<{ risk_level?: string | null; classification_status?: string | null }>
): RiskPyramidCounts {
  const counts: RiskPyramidCounts = {
    minimal: 0,
    limited: 0,
    high: 0,
    unacceptable: 0,
    impossible: 0,
    unevaluated: 0,
  }
  for (const uc of useCases || []) {
    const b = getRiskPyramidBucket(uc.classification_status, uc.risk_level)
    counts[b]++
  }
  return counts
}

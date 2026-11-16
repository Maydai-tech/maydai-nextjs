/**
 * Catégories de constat documentaire. La couleur suit la catégorie.
 * Le libellé affiché reste celui de la fiche (`status_label`).
 * Cette table doit encore être validée par l'équipe juridique.
 */

export const STATUS_CATEGORIES = [
  'DOCUMENTED',
  'REFERENCED',
  'DOWNSTREAM',
  'NOT_PUBLISHED',
  'NOT_APPLICABLE',
  'RESERVATION',
  'NOT_DOCUMENTED',
  'UNMAPPED',
] as const

export type StatusCategory = (typeof STATUS_CATEGORIES)[number]

export const LEGACY_COMPLIANCE_STATUSES = ['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT'] as const
export type LegacyComplianceStatus = (typeof LEGACY_COMPLIANCE_STATUSES)[number]

export type StatusColorName = 'green' | 'blue' | 'gray' | 'orange' | 'red' | 'neutral'

type PrefixRule = {
  prefix: string
  category: StatusCategory
}

const PREFIX_RULES: PrefixRule[] = [
  { prefix: 'documente indirectement', category: 'REFERENCED' },
  { prefix: 'renvoi au modele de base', category: 'REFERENCED' },
  { prefix: 'non documente', category: 'NOT_DOCUMENTED' },
  { prefix: 'non evalue', category: 'NOT_DOCUMENTED' },
  { prefix: 'partiellement documente', category: 'RESERVATION' },
  { prefix: 'position proposee par l\'agent', category: 'RESERVATION' },
  { prefix: 'documente', category: 'DOCUMENTED' },
  { prefix: 'a charge de l\'integrateur', category: 'DOWNSTREAM' },
  { prefix: 'a charge du deployeur', category: 'DOWNSTREAM' },
  { prefix: 'hors perimetre public', category: 'NOT_PUBLISHED' },
  { prefix: 'non publie', category: 'NOT_PUBLISHED' },
  { prefix: 'non applicable', category: 'NOT_APPLICABLE' },
]

export function stripMarkdownBold(value: string): string {
  return value.replace(/\*\*/g, '').replace(/__/g, '').trim()
}

export function foldStatusLabel(value: string): string {
  return stripMarkdownBold(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function isEmojiOnly(label: string, emoji: string): boolean {
  const compact = (value: string) => stripMarkdownBold(value).replace(/\uFE0F/g, '').replace(/\s/g, '')
  return compact(label) === compact(emoji)
}

export function categorizeStatusLabel(rawLabel: string): StatusCategory {
  const cleaned = stripMarkdownBold(rawLabel)
  if (cleaned.startsWith('⚠️')) return 'RESERVATION'
  if (cleaned.startsWith('✅')) return 'DOCUMENTED'
  if (cleaned.startsWith('❌')) return 'NOT_DOCUMENTED'

  const folded = foldStatusLabel(cleaned)
  if (!folded) return 'UNMAPPED'
  const match = PREFIX_RULES.find((rule) => folded.startsWith(rule.prefix))
  return match?.category ?? 'UNMAPPED'
}

export function displayStatusLabel(statusLabel: string | undefined, status: string): string {
  const cleaned = stripMarkdownBold(statusLabel ?? '')
  if (isEmojiOnly(cleaned, '✅')) return 'Documenté'
  if (isEmojiOnly(cleaned, '⚠️')) return 'Réserve'
  if (isEmojiOnly(cleaned, '❌')) return 'Non documenté'
  if (cleaned) return cleaned
  switch (status) {
    case 'COMPLIANT':
    case 'DOCUMENTED':
      return 'Documenté'
    case 'PARTIAL':
    case 'RESERVATION':
      return 'Réserve'
    case 'NON_COMPLIANT':
    case 'NOT_DOCUMENTED':
      return 'Non documenté'
    case 'REFERENCED':
      return 'Documenté indirectement'
    case 'DOWNSTREAM':
      return 'À charge en aval'
    case 'NOT_PUBLISHED':
      return 'Non publié'
    case 'NOT_APPLICABLE':
      return 'Non applicable'
    case 'UNMAPPED':
      return 'Non reconnu'
    default:
      return status
  }
}

export function statusColorName(status: string): StatusColorName {
  switch (status) {
    case 'DOCUMENTED':
    case 'COMPLIANT':
      return 'green'
    case 'REFERENCED':
    case 'DOWNSTREAM':
      return 'blue'
    case 'NOT_PUBLISHED':
    case 'NOT_APPLICABLE':
      return 'gray'
    case 'RESERVATION':
    case 'PARTIAL':
      return 'orange'
    case 'NOT_DOCUMENTED':
    case 'NON_COMPLIANT':
      return 'red'
    default:
      return 'neutral'
  }
}

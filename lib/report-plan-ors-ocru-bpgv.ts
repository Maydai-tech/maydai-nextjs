import { REPORT_STANDARD_SLOT_KEYS_ORDERED } from '@/lib/canonical-actions'
import type { ReportCanonicalItem } from '@/lib/report-canonical-items'

type LegalCode = ReportCanonicalItem['legal']['code']

export type ReportLegalGroupCode = 'ORS' | 'OCRU' | 'BPGV'

export const REPORT_LEGAL_GROUP_ORDER: readonly ReportLegalGroupCode[] = [
  'ORS',
  'OCRU',
  'BPGV',
]

export const REPORT_LEGAL_GROUP_COPY: Record<
  ReportLegalGroupCode,
  { title: string; subtitle: string }
> = {
  ORS: {
    title: 'ORS — Obligation réglementaire stricte (AI Act)',
    subtitle:
      "Ces éléments relèvent d’exigences directement applicables dans votre situation au regard de l’AI Act.",
  },
  OCRU: {
    title: 'OCRU — Obligation conditionnée (au rôle ou à l’usage)',
    subtitle:
      'Cette obligation dépend du rôle ou de l’usage déclaré pour ce système d’IA.',
  },
  BPGV: {
    title: 'BPGV — Bonnes pratiques et gouvernance (recommandées)',
    subtitle:
      'Ces mesures renforcent la traçabilité, la maîtrise et la préparation de l’organisation en cas d’audit.',
  },
}

function slotOrderIndex(item: ReportCanonicalItem): number {
  const idx = REPORT_STANDARD_SLOT_KEYS_ORDERED.indexOf(
    item.identity.report_slot_key as any,
  )
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
}

function isProofComplete(item: ReportCanonicalItem): boolean {
  return item.evidence.status === 'complete' || item.evidence.status === 'validated'
}

function isProofMissingOrIncomplete(item: ReportCanonicalItem): boolean {
  return item.evidence.status === 'incomplete' || item.evidence.status === 'not_tracked'
}

/**
 * Tri interne des items (par groupe) selon la règle produit:
 * 1) déclaration = OUI + preuve absente/non suivie/incomplète
 * 2) déclaration = NON
 * 3) déclaration = Information insuffisante
 * 4) preuve complète/validée
 *
 * Tie-breaker: ordre canonique des slots.
 */
export function sortItemsWithinLegalGroup(
  items: ReportCanonicalItem[],
): ReportCanonicalItem[] {
  return [...items].sort((a, b) => {
    const ra = rankItem(a)
    const rb = rankItem(b)
    if (ra !== rb) return ra - rb
    return slotOrderIndex(a) - slotOrderIndex(b)
  })
}

function rankItem(item: ReportCanonicalItem): number {
  if (isProofComplete(item)) return 4

  const decl = item.declaration.status

  if (decl === 'OUI' && isProofMissingOrIncomplete(item)) return 1
  if (decl === 'NON') return 2
  if (decl === 'Information insuffisante') return 3

  // Cas résiduels (déclaration null ou autres): les placer avant les preuves complètes, après les cas prioritaires.
  return 3
}

export type ReportLegalGroup = {
  code: ReportLegalGroupCode
  title: string
  subtitle: string
  items: ReportCanonicalItem[]
}

/**
 * Regroupe les items canoniques par typologie ORS/OCRU/BPGV, masque NAD,
 * filtre les groupes vides, applique le tri interne et respecte l’ordre ORS→OCRU→BPGV.
 */
export function groupStandardPlanItemsByLegalCode(
  items: ReportCanonicalItem[],
): ReportLegalGroup[] {
  const buckets: Record<ReportLegalGroupCode, ReportCanonicalItem[]> = {
    ORS: [],
    OCRU: [],
    BPGV: [],
  }

  for (const item of items) {
    const code = item.legal.code as LegalCode
    if (code === 'ORS' || code === 'OCRU' || code === 'BPGV') {
      buckets[code].push(item)
    }
  }

  const out: ReportLegalGroup[] = []
  for (const code of REPORT_LEGAL_GROUP_ORDER) {
    const sorted = sortItemsWithinLegalGroup(buckets[code])
    if (sorted.length === 0) continue
    const copy = REPORT_LEGAL_GROUP_COPY[code]
    out.push({ code, title: copy.title, subtitle: copy.subtitle, items: sorted })
  }
  return out
}


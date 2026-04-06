/**
 * Items canoniques du rapport (phases 3–4) — taxonomie juridique + lien catalogue / slots / preuves.
 * Les slots LLM (quick_win_*, etc.) restent la clé JSON ; le contenu exploitable (CTA, preuve, texte de secours)
 * est piloté par le catalogue et les statuts déterministes, pas par la seule présence de texte LLM.
 */

import {
  REPORT_STANDARD_SLOT_KEYS_ORDERED,
  buildDashboardDossierDeepLink,
  buildDashboardTodoListDeepLink,
  getCanonicalActionByReportSlot,
  getComplianceNormalizedPointsForDocType,
  getRegistryNormalizedPointsFromCatalog,
  resolveCanonicalDocType,
} from '@/lib/canonical-actions'
import { getReportPlanNarrativeLine } from '@/lib/report-plan-ui'
import type { RiskLevelCode } from '@/lib/risk-level'
import type { SlotStatus, SlotStatusMap } from '@/lib/slot-statuses'
import type { UseCaseNextSteps } from '@/lib/supabase'

/** Réexport — ordre des 9 slots = `REPORT_STANDARD_SLOT_KEYS_ORDERED` (catalogue). */
export const STANDARD_PLAN_SLOT_KEYS_ORDERED: readonly string[] = [...REPORT_STANDARD_SLOT_KEYS_ORDERED]

function reportCtaPointsAndDocType(action: {
  doc_type_canonique: string
  todo_action_label: string
}): { title: string; points: number; docType: string } {
  const docType = action.doc_type_canonique
  const points =
    docType === 'registry_proof'
      ? getRegistryNormalizedPointsFromCatalog()
      : getComplianceNormalizedPointsForDocType(docType)
  return { title: action.todo_action_label, points, docType }
}

function isDocumentActionCompleted(
  docType: string,
  documentStatuses: Record<string, { status: string } | undefined>,
  companyMaydaiAsRegistry?: boolean
): boolean {
  if (!documentStatuses || !docType) return false
  const canonical = resolveCanonicalDocType(docType)
  if (canonical === 'registry_proof') {
    if (companyMaydaiAsRegistry) return true
    const docStatus = documentStatuses['registry_proof']
    if (!docStatus) return false
    return docStatus.status === 'complete' || docStatus.status === 'validated'
  }
  const docStatus = documentStatuses[canonical]
  if (!docStatus) return false
  return docStatus.status === 'complete' || docStatus.status === 'validated'
}

/** Taxonomie juridique validée (produit / conformité). */
export type LegalTaxonomyCode = 'ORS' | 'OCRU' | 'BPGV' | 'NAD'

export const LEGAL_TAXONOMY_LABELS: Record<LegalTaxonomyCode, string> = {
  ORS: 'Obligation réglementaire stricte (AI Act)',
  OCRU: 'Obligation conditionnée (au rôle ou à l’usage)',
  BPGV: 'Bonne pratique et gouvernance (volontaire)',
  NAD: 'Non applicable (selon les éléments déclarés)',
}

/** Abrégés pour badges UI. */
export const LEGAL_TAXONOMY_SHORT: Record<LegalTaxonomyCode, string> = {
  ORS: 'ORS',
  OCRU: 'OCRU',
  BPGV: 'BPGV',
  NAD: 'NAD',
}

/**
 * Matrice statut juridique × niveau de risque (source métier phase 4).
 * Clés = `canonical_action_code` du catalogue.
 */
export const LEGAL_STATUS_BY_RISK: Record<string, Record<RiskLevelCode, LegalTaxonomyCode>> = {
  MAYDAI_REGISTRY: {
    minimal: 'BPGV',
    limited: 'BPGV',
    high: 'OCRU',
    unacceptable: 'NAD',
  },
  MAYDAI_HUMAN_OVERSIGHT: {
    minimal: 'BPGV',
    limited: 'BPGV',
    high: 'OCRU',
    unacceptable: 'NAD',
  },
  MAYDAI_SYSTEM_INSTRUCTIONS: {
    minimal: 'BPGV',
    limited: 'BPGV',
    high: 'OCRU',
    unacceptable: 'ORS',
  },
  MAYDAI_TECHNICAL_DOCUMENTATION: {
    minimal: 'BPGV',
    limited: 'BPGV',
    high: 'OCRU',
    unacceptable: 'NAD',
  },
  MAYDAI_TRANSPARENCY_MARKING: {
    minimal: 'BPGV',
    limited: 'OCRU',
    high: 'OCRU',
    unacceptable: 'NAD',
  },
  MAYDAI_DATA_QUALITY: {
    minimal: 'BPGV',
    limited: 'BPGV',
    high: 'OCRU',
    unacceptable: 'NAD',
  },
  MAYDAI_RISK_MANAGEMENT: {
    minimal: 'BPGV',
    limited: 'BPGV',
    high: 'OCRU',
    unacceptable: 'NAD',
  },
  MAYDAI_CONTINUOUS_MONITORING: {
    minimal: 'BPGV',
    limited: 'BPGV',
    high: 'OCRU',
    unacceptable: 'NAD',
  },
  MAYDAI_TRAINING_COMPLIANCE: {
    minimal: 'ORS',
    limited: 'ORS',
    high: 'ORS',
    unacceptable: 'NAD',
  },
  MAYDAI_STOPPING_PROOF: {
    minimal: 'NAD',
    limited: 'NAD',
    high: 'NAD',
    unacceptable: 'ORS',
  },
}

/**
 * Fondement juridique principal (synthèse produit — à affiner en phase ultérieure).
 */
export const LEGAL_BASIS_PRIMARY: Record<string, string> = {
  MAYDAI_REGISTRY:
    'AI Act — traçabilité et registre des systèmes d’IA (exigences renforcées selon la qualification du risque).',
  MAYDAI_HUMAN_OVERSIGHT:
    'AI Act — surveillance humaine et gouvernance opérationnelle (human oversight), selon le niveau de risque du système.',
  MAYDAI_SYSTEM_INSTRUCTIONS:
    'AI Act — documentation et maîtrise du comportement du système (instructions, prompts, limitations).',
  MAYDAI_TECHNICAL_DOCUMENTATION:
    'AI Act — documentation technique et informations requises pour les systèmes à obligations renforcées.',
  MAYDAI_TRANSPARENCY_MARKING:
    'AI Act — transparence vis-à-vis des utilisateurs et information sur l’usage de l’IA.',
  MAYDAI_DATA_QUALITY:
    'AI Act — gouvernance des données, qualité et gestion des biais pour les systèmes concernés.',
  MAYDAI_RISK_MANAGEMENT:
    'AI Act — système de gestion des risques pour les systèmes à exigences élevées.',
  MAYDAI_CONTINUOUS_MONITORING:
    'AI Act — surveillance post-mise sur le marché et gestion du cycle de vie du système.',
  MAYDAI_TRAINING_COMPLIANCE:
    'AI Act — compétences et formation des personnes impliquées dans le cycle de vie du système d’IA.',
  MAYDAI_STOPPING_PROOF:
    'AI Act — cessation ou non-déploiement des systèmes interdits ; preuve et traçabilité.',
}

export function getLegalTaxonomyForAction(
  canonicalActionCode: string,
  riskLevel: RiskLevelCode
): LegalTaxonomyCode {
  const row = LEGAL_STATUS_BY_RISK[canonicalActionCode]
  if (!row) return 'BPGV'
  return row[riskLevel] ?? 'BPGV'
}

export type DeclarationStatusValue = SlotStatus

export type EvidenceStatusValue =
  | 'complete'
  | 'validated'
  | 'incomplete'
  | 'not_tracked'
  | 'not_applicable'

export interface ReportItemCta {
  completed: boolean
  todoUrl: string
  dossierUrl: string
  label: string
  points: number
}

/**
 * Identité produit + ancrage technique (catalogue, preuve, slot JSON transitoire).
 */
export interface ReportItemIdentity {
  canonical_action_code: string
  doc_type_canonique: string
  /** Clé slot narrative LLM / JSON `next_steps` (couche transitoire). */
  report_slot_key: string
  /** Libellé action depuis le catalogue (`label`). */
  action_label: string
  /** Niveau de risque ayant servi à résoudre le pilier juridique (traçabilité). */
  risk_level: RiskLevelCode
}

/**
 * Pilier 1 — Statut juridique (taxonomie ORS / OCRU / BPGV / NAD).
 * Pilier 2 — Fondement juridique principal (texte court produit).
 */
export interface ReportItemLegalPillar {
  code: LegalTaxonomyCode
  label_long: string
  basis_primary: string
}

/** Pilier 4 — Déclaration (réponses questionnaire / statut déterministe du slot). */
export interface ReportItemDeclarationPillar {
  status: DeclarationStatusValue | null
}

/** Pilier 5 — État de preuve dossier (quand applicable). */
export interface ReportItemEvidencePillar {
  status: EvidenceStatusValue
}

/** Pilier 3 — Justification métier / gouvernance (alignée sur `todo_explanation` du catalogue). */
export interface ReportItemGovernancePillar {
  rationale: string
}

/** Narratif affiché (LLM si présent, sinon secours questionnaire + catalogue). */
export interface ReportItemNarrativePillar {
  text: string
  source_slot_key: string
}

/**
 * Item de rapport — structure canonique phase 4 (lecture juridique + produit + future preuve / revue).
 *
 * Doctrine produit : `legal` (statut + fondement), `governance` (métier), `declaration`, `evidence`, `narrative`, `cta`.
 */
export interface ReportCanonicalItem {
  identity: ReportItemIdentity
  legal: ReportItemLegalPillar
  declaration: ReportItemDeclarationPillar
  evidence: ReportItemEvidencePillar
  governance: ReportItemGovernancePillar
  narrative: ReportItemNarrativePillar
  cta: ReportItemCta
}

/**
 * Vue à plat pour intégrations externes / sérialisation JSON simple (optionnel).
 * Ne remplace pas `ReportCanonicalItem` côté UI interne.
 */
export function flattenReportCanonicalItem(item: ReportCanonicalItem): Record<string, unknown> {
  return {
    canonical_action_code: item.identity.canonical_action_code,
    doc_type_canonique: item.identity.doc_type_canonique,
    report_slot_key: item.identity.report_slot_key,
    action_label: item.identity.action_label,
    risk_level: item.identity.risk_level,
    legal_status: item.legal.code,
    legal_status_label: item.legal.label_long,
    legal_basis: item.legal.basis_primary,
    business_rationale: item.governance.rationale,
    narrative_text: item.narrative.text,
    narrative_source_slot_key: item.narrative.source_slot_key,
    declaration_status: item.declaration.status,
    evidence_status: item.evidence.status,
    cta: item.cta,
  }
}

/** Libellés compacts pour export PDF (cohérents avec le web). */
export function declarationStatusPdfLabel(d: DeclarationStatusValue | null): string {
  if (d == null) return 'Déclaratif : —'
  if (d === 'OUI') return 'Déclaratif : OUI'
  if (d === 'NON') return 'Déclaratif : NON'
  return 'Déclaratif : information insuffisante'
}

export function evidenceStatusPdfLabel(e: EvidenceStatusValue): string {
  switch (e) {
    case 'complete':
      return 'Preuve : complétée'
    case 'validated':
      return 'Preuve : validée'
    case 'incomplete':
      return 'Preuve : à fournir'
    case 'not_tracked':
      return 'Preuve : non suivie'
    case 'not_applicable':
      return 'Preuve : N/A'
    default:
      return 'Preuve : —'
  }
}

function slotNarrativeFromNextSteps(
  nextSteps: Partial<UseCaseNextSteps> | null | undefined,
  slotKey: string
): string | null {
  if (!nextSteps) return null
  const raw = nextSteps[slotKey as keyof UseCaseNextSteps]
  return typeof raw === 'string' ? raw : null
}

function resolveEvidenceStatus(
  legalStatus: LegalTaxonomyCode,
  docType: string,
  documentStatuses: Record<string, { status: string } | undefined>,
  maydaiAsRegistry: boolean | undefined,
  docCompleted: boolean
): EvidenceStatusValue {
  if (legalStatus === 'NAD') return 'not_applicable'
  if (docCompleted) {
    const s = documentStatuses[docType]?.status
    if (s === 'validated') return 'validated'
    return 'complete'
  }
  if (!documentStatuses[docType]) return 'not_tracked'
  return 'incomplete'
}

export function buildReportCanonicalItemForSlot(params: {
  reportSlotKey: string
  riskLevel: RiskLevelCode
  nextSteps: Partial<UseCaseNextSteps> | null | undefined
  slotStatuses: SlotStatusMap | null
  documentStatuses: Record<string, { status: string } | undefined>
  maydaiAsRegistry?: boolean
  companyId: string
  useCaseId: string
}): ReportCanonicalItem | null {
  const {
    reportSlotKey,
    riskLevel,
    nextSteps,
    slotStatuses,
    documentStatuses,
    maydaiAsRegistry,
    companyId,
    useCaseId,
  } = params

  const action = getCanonicalActionByReportSlot(reportSlotKey)
  if (!action) return null

  const metadata = reportCtaPointsAndDocType(action)
  const llmText = slotNarrativeFromNextSteps(nextSteps, reportSlotKey)
  const declaration_status = slotStatuses?.[reportSlotKey as keyof SlotStatusMap] ?? null
  const narrative_text = getReportPlanNarrativeLine(llmText, declaration_status, action)

  const legal_status = getLegalTaxonomyForAction(action.canonical_action_code, riskLevel)
  const legal_basis =
    LEGAL_BASIS_PRIMARY[action.canonical_action_code] ??
    `Cadre AI Act — exigences applicables selon la qualification du risque pour : ${action.label}.`
  const business_rationale = action.todo_explanation

  const docCompleted = isDocumentActionCompleted(metadata.docType, documentStatuses, maydaiAsRegistry)
  const evidence_status = resolveEvidenceStatus(
    legal_status,
    metadata.docType,
    documentStatuses,
    maydaiAsRegistry,
    docCompleted
  )

  const dossierUrl = buildDashboardDossierDeepLink(companyId, useCaseId, metadata.docType)
  const todoUrl = buildDashboardTodoListDeepLink(companyId, useCaseId, metadata.docType)

  return {
    identity: {
      canonical_action_code: action.canonical_action_code,
      doc_type_canonique: action.doc_type_canonique,
      report_slot_key: reportSlotKey,
      action_label: action.label,
      risk_level: riskLevel,
    },
    legal: {
      code: legal_status,
      label_long: LEGAL_TAXONOMY_LABELS[legal_status],
      basis_primary: legal_basis,
    },
    declaration: { status: declaration_status },
    evidence: { status: evidence_status },
    governance: { rationale: business_rationale },
    narrative: { text: narrative_text, source_slot_key: reportSlotKey },
    cta: {
      completed: docCompleted,
      dossierUrl,
      todoUrl,
      label: metadata.title,
      points: metadata.points,
    },
  }
}

/** Utile pour tests, PDF ou API futures : les 9 items dans l’ordre des groupes d’affichage. */
export function buildAllStandardPlanCanonicalItems(params: {
  slotKeysOrdered: readonly string[]
  riskLevel: RiskLevelCode
  nextSteps: Partial<UseCaseNextSteps> | null | undefined
  slotStatuses: SlotStatusMap | null
  documentStatuses: Record<string, { status: string } | undefined>
  maydaiAsRegistry?: boolean
  companyId: string
  useCaseId: string
}): ReportCanonicalItem[] {
  const out: ReportCanonicalItem[] = []
  for (const reportSlotKey of params.slotKeysOrdered) {
    const item = buildReportCanonicalItemForSlot({
      reportSlotKey,
      riskLevel: params.riskLevel,
      nextSteps: params.nextSteps,
      slotStatuses: params.slotStatuses,
      documentStatuses: params.documentStatuses,
      maydaiAsRegistry: params.maydaiAsRegistry,
      companyId: params.companyId,
      useCaseId: params.useCaseId,
    })
    if (item) out.push(item)
  }
  return out
}

/**
 * Découpe la liste d’items (ordre = `REPORT_STANDARD_SLOT_KEYS_ORDERED`) en 3 groupes affichage web/PDF.
 */
export function partitionStandardPlanCanonicalItems(
  items: ReportCanonicalItem[]
): [ReportCanonicalItem[], ReportCanonicalItem[], ReportCanonicalItem[]] {
  return [items.slice(0, 3), items.slice(3, 6), items.slice(6, 9)]
}

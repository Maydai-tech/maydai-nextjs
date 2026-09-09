import { resolveCanonicalDocType } from '@/lib/canonical-actions'
import { DECLARATION_PROOF_FLOW_COPY } from '@/lib/declaration-proof-flow-copy'
import {
  DOC_TYPE_LABELS,
  EVENT_TYPE_LABELS,
  FIELD_LABELS,
  type UseCaseHistoryEntry,
  type UseCaseHistoryEventType,
} from '@/lib/usecase-history'
import type { ReportCanonicalItem } from '@/lib/report-canonical-items'
import type { PDFReportData, PdfCanonicalItem, PdfSystemCardSection, UseCaseNextSteps } from '@/app/(saas)/usecases/[id]/components/pdf/types'
import type {
  ActivityHistoryItem,
  PdfDocumentItem,
} from '@/lib/validations/pdf.schema'
import {
  PILLAR_CODE_TO_DOC_TYPE,
  type SystemCardPillar,
} from '@/lib/validations/system-card'

/** Sélection Supabase pour la génération PDF (cas + historique + dossier). */
export const USECASE_PDF_SELECT = `
  *,
  companies(
    id,
    name,
    industry,
    city,
    country,
    maydai_as_registry
  ),
  compl_ai_models(
    id,
    model_name,
    model_provider,
    model_type,
    version,
    slug
  ),
  usecase_history(
    id,
    event_type,
    created_at,
    metadata,
    field_name,
    user_id,
    user:profiles(first_name, last_name)
  ),
  dossiers(
    id,
    dossier_documents(
      doc_type,
      status,
      form_data,
      maydai_prefill_applied,
      user_completion_applied
    )
  )
`

const RAW_URL_REGEX = /https?:\/\/[^\s)\]>]+/gi

const POSITIVE_DOCUMENT_STATUSES = new Set(['complete', 'validated', 'completed'])

/**
 * Remplace les URLs brutes par des libellés lisibles dans le PDF.
 */
export function cleanPdfUrls(text: string): string {
  if (!text) return text

  return text.replace(RAW_URL_REGEX, (url) => {
    const lower = url.toLowerCase()
    if (lower.includes('/todo-list') || lower.includes('/todo')) {
      return `[${DECLARATION_PROOF_FLOW_COPY.linkLabelTodo}]`
    }
    if (lower.includes('/dossier')) {
      return `[${DECLARATION_PROOF_FLOW_COPY.linkLabelDossierCase}]`
    }
    if (lower.includes('/dashboard')) {
      return '[Lien vers le dossier]'
    }
    return '[Lien MaydAI]'
  })
}

export function isPdfDocumentStatusPositive(status: string | null | undefined): boolean {
  if (!status) return false
  return POSITIVE_DOCUMENT_STATUSES.has(status)
}

export function findPdfDocumentByType(
  docType: string,
  documents: PdfDocumentItem[]
): PdfDocumentItem | undefined {
  const canonical = resolveCanonicalDocType(docType)
  return documents.find((doc) => resolveCanonicalDocType(doc.doc_type) === canonical)
}

/** Règle 6.7 — vérifie explicitement le tableau `documents`, sans présumer de l’état. */
export function isPdfDocumentCompletedInPayload(
  docType: string,
  documents: PdfDocumentItem[]
): boolean {
  const doc = findPdfDocumentByType(docType, documents)
  if (!doc) return false
  return isPdfDocumentStatusPositive(doc.status)
}

function buildHistoryEventLabel(entry: UseCaseHistoryEntry): string {
  if (entry.event_type === 'field_updated') {
    const questionLabel = entry.metadata?.question_label
    if (typeof questionLabel === 'string' && questionLabel.trim().length > 0) {
      return `${questionLabel} modifié`
    }
    if (entry.field_name) {
      const fieldLabel = FIELD_LABELS[entry.field_name] || entry.field_name
      return `${fieldLabel} modifié`
    }
    return EVENT_TYPE_LABELS.field_updated
  }

  const docType = entry.metadata?.doc_type
  if (typeof docType === 'string' && docType.length > 0) {
    const docTypeLabel = DOC_TYPE_LABELS[docType] || docType
    if (entry.event_type === 'document_uploaded') {
      return `Document complété : ${docTypeLabel}`
    }
    if (entry.event_type === 'document_modified') {
      return `Document modifié : ${docTypeLabel}`
    }
    if (entry.event_type === 'document_reset') {
      return `Document réinitialisé : ${docTypeLabel}`
    }
  }

  const eventType = entry.event_type as UseCaseHistoryEventType
  return EVENT_TYPE_LABELS[eventType] ?? entry.event_type
}

function buildHistoryUserName(entry: UseCaseHistoryEntry): string {
  if (entry.user?.first_name || entry.user?.last_name) {
    return `${entry.user.first_name || ''} ${entry.user.last_name || ''}`.trim()
  }
  return 'Utilisateur inconnu'
}

function extractHistoryScoreImpact(metadata: Record<string, unknown> | null | undefined): number {
  const raw = metadata?.score_change
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
}

export function mapUseCaseHistoryToPdfItems(
  rows: UseCaseHistoryEntry[] | null | undefined
): ActivityHistoryItem[] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((entry) => ({
      id: entry.id,
      event_type: entry.event_type,
      created_at: entry.created_at,
      metadata: {
        label: buildHistoryEventLabel(entry),
        score_impact: extractHistoryScoreImpact(entry.metadata),
        user_name: buildHistoryUserName(entry),
      },
    }))
}

type PdfDossierDocumentRow = {
  doc_type: string
  status: string | null
  form_data?: Record<string, unknown> | null
  maydai_prefill_applied?: boolean | null
  user_completion_applied?: boolean | null
}

type UseCasePdfQueryRow = {
  dossiers?:
    | {
        id: string
        dossier_documents?: PdfDossierDocumentRow[] | null
      }
    | {
        id: string
        dossier_documents?: PdfDossierDocumentRow[] | null
      }[]
    | null
  usecase_history?: UseCaseHistoryEntry[] | null
}

function firstDossier(useCaseRow: UseCasePdfQueryRow) {
  const dossiers = useCaseRow.dossiers
  return Array.isArray(dossiers) ? dossiers[0] : dossiers
}

export function extractPdfDocumentsFromUseCaseRow(
  useCaseRow: UseCasePdfQueryRow
): PdfDocumentItem[] {
  const rows = firstDossier(useCaseRow)?.dossier_documents ?? []

  return rows.map((row) => ({
    doc_type: resolveCanonicalDocType(row.doc_type),
    status: row.status || 'incomplete',
    maydai_prefill_applied: Boolean(row.maydai_prefill_applied),
    user_completion_applied: Boolean(row.user_completion_applied),
  }))
}

export function extractPdfSystemCardNotesByDocType(
  useCaseRow: UseCasePdfQueryRow
): Record<string, string> {
  const rows = firstDossier(useCaseRow)?.dossier_documents ?? []
  const notes: Record<string, string> = {}

  for (const row of rows) {
    const formData = row.form_data
    const rawNotes = formData && typeof formData === 'object' ? formData.system_card_notes : null
    if (typeof rawNotes !== 'string' || !rawNotes.trim()) continue
    notes[resolveCanonicalDocType(row.doc_type)] = rawNotes.trim()
  }

  return notes
}

export function buildPdfSystemCardSections(
  pillars: SystemCardPillar[],
  notesByDocType: Record<string, string>
): PdfSystemCardSection[] {
  return pillars.map((pillar) => {
    const docType = PILLAR_CODE_TO_DOC_TYPE[pillar.pillar_code]
    const userNotes = notesByDocType[docType]
    return userNotes ? { pillar, userNotes } : { pillar }
  })
}

/**
 * Colle la fiche System Card sous une action PDF uniquement si
 * `maydai_prefill_applied` est vrai pour le document correspondant.
 */
export function attachSystemCardSectionsToCanonicalItems(params: {
  items: PdfCanonicalItem[]
  documents: PdfDocumentItem[]
  pillars: SystemCardPillar[]
  notesByDocType: Record<string, string>
}): PdfCanonicalItem[] {
  const { items, documents, pillars, notesByDocType } = params

  return items.map((item) => {
    const docType = item.identity.doc_type_canonique
    const dbDoc = documents.find((doc) => doc.doc_type === docType)

    if (!dbDoc?.maydai_prefill_applied) {
      return item
    }

    const matchingPillar = pillars.find(
      (pillar) => PILLAR_CODE_TO_DOC_TYPE[pillar.pillar_code] === docType
    )
    if (!matchingPillar) {
      return item
    }

    const userNotes = notesByDocType[docType]
    return {
      ...item,
      maydai_prefill_applied: dbDoc.maydai_prefill_applied,
      user_completion_applied: dbDoc.user_completion_applied,
      systemCardSection: userNotes
        ? { pillar: matchingPillar, userNotes }
        : { pillar: matchingPillar },
    }
  })
}

export function extractPdfHistoryFromUseCaseRow(
  useCaseRow: UseCasePdfQueryRow
): ActivityHistoryItem[] {
  return mapUseCaseHistoryToPdfItems(useCaseRow.usecase_history ?? [])
}

export function mergePdfDocumentsToStatusMap(
  documents: PdfDocumentItem[]
): Record<string, { status: string }> {
  const acc = new Map<string, { status: string; rank: number }>()

  for (const doc of documents) {
    const canon = resolveCanonicalDocType(doc.doc_type)
    const rank = doc.status === 'validated' ? 3 : doc.status === 'complete' || doc.status === 'completed' ? 2 : 1
    const prev = acc.get(canon)
    if (!prev || rank > prev.rank) {
      acc.set(canon, { status: doc.status, rank })
    }
  }

  const out: Record<string, { status: string }> = {}
  acc.forEach((value, key) => {
    out[key] = { status: value.status }
  })
  return out
}

/**
 * Règle 6.7 — Synchronisation des points (BPGV / ORS / OCRU).
 * Trois états : à récupérer, gagnés via preuve, ou preuve documentée sans gain réel.
 */
export function buildRule67PointsLine(
  item: ReportCanonicalItem,
  documents: PdfDocumentItem[]
): string | null {
  const points = item.cta.points
  if (points === undefined || points <= 0) return null

  const docType = item.identity.doc_type_canonique
  if (!docType) {
    return `${DECLARATION_PROOF_FLOW_COPY.reportPdfPointsToRecoverPrefix} : +${points} pt`
  }

  const isCompleted = isPdfDocumentCompletedInPayload(docType, documents)

  if (isCompleted) {
    if (item.cta.isActuallyGained) {
      return `+${points} ${DECLARATION_PROOF_FLOW_COPY.reportPdfPointsGainedSuffix}`
    }
    return DECLARATION_PROOF_FLOW_COPY.reportPdfPointsAlreadyCreditedLine
  }

  return `${DECLARATION_PROOF_FLOW_COPY.reportPdfPointsToRecoverPrefix} : +${points} pt`
}

export function applyRule67PointsSync(
  items: ReportCanonicalItem[],
  documents: PdfDocumentItem[]
): ReportCanonicalItem[] {
  return items.map((item) => ({
    ...item,
    cta: {
      ...item.cta,
      pointsLine: buildRule67PointsLine(item, documents),
    },
  }))
}

function sanitizeNextSteps(nextSteps: UseCaseNextSteps | null): UseCaseNextSteps | null {
  if (!nextSteps) return null

  const sanitized = { ...nextSteps }
  for (const key of Object.keys(sanitized) as (keyof UseCaseNextSteps)[]) {
    const value = sanitized[key]
    if (typeof value === 'string') {
      sanitized[key] = cleanPdfUrls(value)
    }
  }
  return sanitized
}

function sanitizeCanonicalPlanItems(items: PdfCanonicalItem[] | undefined): PdfCanonicalItem[] {
  return (items ?? []).map((item) => ({
    ...item,
    legal: {
      ...item.legal,
      basis_primary: cleanPdfUrls(item.legal.basis_primary),
    },
    governance: {
      ...item.governance,
      rationale: cleanPdfUrls(item.governance.rationale),
    },
    narrative: {
      ...item.narrative,
      text: cleanPdfUrls(item.narrative.text),
    },
    cta: {
      ...item.cta,
      label: cleanPdfUrls(item.cta.label),
      pointsLine: item.cta.pointsLine ? cleanPdfUrls(item.cta.pointsLine) : item.cta.pointsLine,
    },
    systemCardSection: item.systemCardSection
      ? {
          ...item.systemCardSection,
          userNotes: item.systemCardSection.userNotes
            ? cleanPdfUrls(item.systemCardSection.userNotes)
            : item.systemCardSection.userNotes,
        }
      : item.systemCardSection,
  }))
}

/** Nettoie le payload PDF avant injection dans le moteur de rendu. */
export function sanitizePdfReportData(data: PDFReportData): PDFReportData {
  return {
    ...data,
    nextSteps: sanitizeNextSteps(data.nextSteps),
    canonicalPlanItems: sanitizeCanonicalPlanItems(data.canonicalPlanItems),
    systemCardSections: (data.systemCardSections ?? []).map((section) => ({
      ...section,
      userNotes: section.userNotes ? cleanPdfUrls(section.userNotes) : section.userNotes,
    })),
    useCase: {
      ...data.useCase,
      description:
        typeof data.useCase.description === 'string'
          ? cleanPdfUrls(data.useCase.description)
          : data.useCase.description,
    },
  }
}

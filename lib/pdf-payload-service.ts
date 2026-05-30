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
import type { PDFReportData, UseCaseNextSteps } from '@/app/usecases/[id]/components/pdf/types'
import type {
  ActivityHistoryItem,
  PdfDocumentItem,
} from '@/lib/validations/pdf.schema'

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
    version
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
      status
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

type UseCasePdfQueryRow = {
  dossiers?:
    | {
        id: string
        dossier_documents?: { doc_type: string; status: string | null }[] | null
      }
    | {
        id: string
        dossier_documents?: { doc_type: string; status: string | null }[] | null
      }[]
    | null
  usecase_history?: UseCaseHistoryEntry[] | null
}

export function extractPdfDocumentsFromUseCaseRow(
  useCaseRow: UseCasePdfQueryRow
): PdfDocumentItem[] {
  const dossiers = useCaseRow.dossiers
  const dossier = Array.isArray(dossiers) ? dossiers[0] : dossiers
  const rows = dossier?.dossier_documents ?? []

  return rows.map((row) => ({
    doc_type: resolveCanonicalDocType(row.doc_type),
    status: row.status || 'incomplete',
  }))
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
 * Le libellé « Acquis » n’est appliqué que si le document correspondant est présent
 * dans `documents` avec un statut positif.
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

  if (isPdfDocumentCompletedInPayload(docType, documents)) {
    return `${DECLARATION_PROOF_FLOW_COPY.reportPdfPointsAcquiredPrefix} (+${points} pt)`
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

function sanitizeCanonicalPlanItems(items: ReportCanonicalItem[] | undefined): ReportCanonicalItem[] {
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
  }))
}

/** Nettoie le payload PDF avant injection dans le moteur de rendu. */
export function sanitizePdfReportData(data: PDFReportData): PDFReportData {
  return {
    ...data,
    nextSteps: sanitizeNextSteps(data.nextSteps),
    canonicalPlanItems: sanitizeCanonicalPlanItems(data.canonicalPlanItems),
    useCase: {
      ...data.useCase,
      description:
        typeof data.useCase.description === 'string'
          ? cleanPdfUrls(data.useCase.description)
          : data.useCase.description,
    },
  }
}

/**
 * Modèle de données pour le PDF léger « pré-diagnostic parcours court » (serveur).
 * Réutilise le même vocabulaire et les mêmes listes que l’écran `V3ShortPathOutcome`.
 */

import { DECLARATION_PROOF_FLOW_COPY } from '@/lib/declaration-proof-flow-copy'
import { resolveQualificationOutcomeV3 } from '@/lib/qualification-v3-decision'
import { loadQuestions } from './questions-loader'
import { getV3ShortPathOutcomeSignals } from './v3-short-path-outcome-signals'
import {
  getV3ShortPathImmediateImplicationLines,
  getV3ShortPathWhyLongPathBullets,
  v3ShortPathQualificationShortLabel,
  v3ShortPathRiskDisplayLabel,
  V3_SHORT_PATH_ESTABLISHED_CORE_BULLETS,
  V3_SHORT_PATH_REMAINING_ITEMS,
} from './v3-short-path-outcome-summary'

export const V3_PREDIAGNOSTIC_PDF_DISCLAIMER =
  'Document interne — pré-diagnostic MaydAI (parcours court). Ne remplace pas un audit juridique, ni le rapport complet MaydAI après parcours long, ni l’examen des preuves dans le dossier du cas.'

export type V3PrediagnosticPdfLink = { label: string; href: string }

export type V3PrediagnosticPdfModel = {
  generatedAtIso: string
  useCaseName: string
  companyName: string | null
  qualificationLine: string
  riskLine: string
  implications: string[]
  establishedCore: readonly string[]
  transparencySignals: { title: string; detail: string }[]
  remainingItems: readonly { title: string; detail: string }[]
  whyLong: string[]
  links: V3PrediagnosticPdfLink[]
  disclaimer: string
  filRougeTitle: string
  filRougeBody: string
  notRapportCompletNote: string
}

export function buildV3PrediagnosticPdfModel(params: {
  useCaseId: string
  useCaseName: string | null | undefined
  companyId: string
  companyName?: string | null
  systemType: string | null | undefined
  answers: Record<string, unknown>
  baseUrl: string
}): V3PrediagnosticPdfModel {
  const out = resolveQualificationOutcomeV3(params.answers, params.systemType)
  const qs = loadQuestions()
  const signals = getV3ShortPathOutcomeSignals(params.answers, qs)
  const implications = getV3ShortPathImmediateImplicationLines(out.risk_level, out.classification_status)
  const whyLong = getV3ShortPathWhyLongPathBullets(out.classification_status)

  const b = (params.baseUrl || '').replace(/\/$/, '')
  const id = params.useCaseId
  const cid = params.companyId

  const links: V3PrediagnosticPdfLink[] = []
  if (b) {
    links.push({ label: 'Parcours complet (même questionnaire)', href: `${b}/usecases/${id}/evaluation` })
    links.push({ label: 'Synthèse du cas', href: `${b}/usecases/${id}` })
    links.push({
      label: DECLARATION_PROOF_FLOW_COPY.linkLabelDossierCase,
      href: `${b}/dashboard/${cid}/dossiers/${id}`,
    })
    links.push({
      label: DECLARATION_PROOF_FLOW_COPY.linkLabelTodo,
      href: `${b}/dashboard/${cid}/todo-list?usecase=${id}`,
    })
  }

  return {
    generatedAtIso: new Date().toISOString(),
    useCaseName: (params.useCaseName ?? '').trim() || 'Cas d’usage',
    companyName: params.companyName?.trim() || null,
    qualificationLine: v3ShortPathQualificationShortLabel(out.classification_status),
    riskLine: v3ShortPathRiskDisplayLabel(out.risk_level, out.classification_status),
    implications,
    establishedCore: V3_SHORT_PATH_ESTABLISHED_CORE_BULLETS,
    transparencySignals: signals,
    remainingItems: V3_SHORT_PATH_REMAINING_ITEMS,
    whyLong,
    links,
    disclaimer: V3_PREDIAGNOSTIC_PDF_DISCLAIMER,
    filRougeTitle: DECLARATION_PROOF_FLOW_COPY.filRougeTitle,
    filRougeBody: DECLARATION_PROOF_FLOW_COPY.filRougeBody,
    notRapportCompletNote:
      'Ce document est distinct du rapport d’audit PDF MaydAI (parcours long, cas complété, plan détaillé et score de maturité).',
  }
}

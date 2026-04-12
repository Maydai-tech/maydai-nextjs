/**
 * Instrumentation parcours court V3 — événements dataLayer / GTM uniquement.
 * Aucune donnée de réponse questionnaire, pas de texte libre utilisateur.
 * Voir docs/v3-short-path-analytics-events.md pour la liste et le pilotage.
 */

import { sendGTMEvent, type GTMEvent } from '@/lib/gtm'
import { V3_PRODUCT_SYSTEM_TYPE } from '@/lib/qualification-v3-decision'

const QV = 3 as const

export type V3ShortPathSystemTypeBucket = 'produit' | 'autre' | 'unknown'

export type V3ShortPathCtaId =
  | 'evaluation_long'
  | 'evaluation_short'
  | 'overview'
  | 'dossier'
  | 'todo'
  | 'dashboard'
  | 'copy_summary'
  | 'download_txt'
  | 'download_md'
  | 'download_pdf_prediagnostic'
  | 'mailto_prepare'

export function v3ShortPathSystemTypeBucket(systemType: string | null | undefined): V3ShortPathSystemTypeBucket {
  const t = (systemType ?? '').trim()
  if (!t) return 'unknown'
  if (t === V3_PRODUCT_SYSTEM_TYPE) return 'produit'
  return 'autre'
}

function push(payload: Record<string, unknown> & { event: string }): void {
  sendGTMEvent(payload as GTMEvent)
}

/** Première entrée sur la page d’évaluation en mode parcours court (une fois par chargement page). */
export function trackV3ShortPathSessionStart(params: {
  usecase_id: string
  system_type_bucket: V3ShortPathSystemTypeBucket
  page_path?: string
  referrer_excerpt?: string
  /** Surface d’origine si l’URL contient `?entree=` / `&entree=`. */
  entry_surface?: string
}): void {
  push({
    event: 'v3_short_path_start',
    questionnaire_version: QV,
    usecase_id: params.usecase_id,
    system_type_bucket: params.system_type_bucket,
    ...(params.page_path && { page_path: params.page_path }),
    ...(params.referrer_excerpt && { referrer_excerpt: params.referrer_excerpt }),
    ...(params.entry_surface && { entry_surface: params.entry_surface }),
  })
}

/** Ouverture de la page d’évaluation en parcours long avec `entree=` (hors `v3_short_path_start`). */
export function trackV3EvaluationEntrySurface(params: {
  usecase_id: string
  questionnaire_version: number
  entry_surface: string
  system_type_bucket: V3ShortPathSystemTypeBucket
}): void {
  push({
    event: 'v3_evaluation_entry_surface',
    questionnaire_version: params.questionnaire_version,
    usecase_id: params.usecase_id,
    path_mode: 'long' as const,
    entry_surface: params.entry_surface,
    system_type_bucket: params.system_type_bucket,
  })
}

/** Entrée dans un segment métier (1–5) — une fois par segment et par session de questions affichées. */
export function trackV3ShortPathSegmentView(params: {
  usecase_id: string
  segment_order: number
  segment_key: string
  question_id: string
}): void {
  push({
    event: 'v3_short_path_segment',
    questionnaire_version: QV,
    usecase_id: params.usecase_id,
    segment_order: params.segment_order,
    segment_key: params.segment_key,
    question_id: params.question_id,
  })
}

/** L’écran de sortie courte est affiché (avant ou pendant chargement du niveau). */
export function trackV3ShortPathOutcomeView(params: { usecase_id: string }): void {
  push({
    event: 'v3_short_path_outcome_view',
    questionnaire_version: QV,
    usecase_id: params.usecase_id,
  })
}

/** Résultat moteur disponible (après API risk-level). */
export function trackV3ShortPathOutcomeResult(params: {
  usecase_id: string
  system_type_bucket: V3ShortPathSystemTypeBucket
  classification_status: string
  risk_level: string | null | undefined
}): void {
  push({
    event: 'v3_short_path_outcome_result',
    questionnaire_version: QV,
    usecase_id: params.usecase_id,
    system_type_bucket: params.system_type_bucket,
    classification_status: params.classification_status,
    risk_level: params.risk_level ?? null,
  })
}

/** Clic sur un CTA de la sortie courte ou actions d’export. */
export function trackV3ShortPathCta(params: {
  usecase_id: string
  system_type_bucket: V3ShortPathSystemTypeBucket
  cta: V3ShortPathCtaId
  /** Contexte optionnel (ex. classification déjà connue côté client). */
  classification_status?: string
  risk_level?: string | null
  /**
   * Zone d’écran / parcours (conversion court → long) — optionnel, événements inchangés si absent.
   * Ex. `outcome_hero`, `outcome_quick_links`, `intro_primary`, `overview_v3_card`, `header_v3_resume`.
   */
  cta_placement?: string
  /**
   * Segmentation produit stable (impossible | minimal | limited | high | unacceptable | qualified_neutral).
   * Facilite les rapports sans dupliquer classification + risk en logique côté outil BI.
   */
  outcome_funnel_key?: string
}): void {
  push({
    event: 'v3_short_path_cta',
    questionnaire_version: QV,
    usecase_id: params.usecase_id,
    system_type_bucket: params.system_type_bucket,
    cta: params.cta,
    ...(params.classification_status != null && { classification_status: params.classification_status }),
    ...(params.risk_level !== undefined && { risk_level: params.risk_level }),
    ...(params.cta_placement && { cta_placement: params.cta_placement }),
    ...(params.outcome_funnel_key && { outcome_funnel_key: params.outcome_funnel_key }),
  })
}

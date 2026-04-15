import {
  QUESTIONNAIRE_VERSION_V1,
  QUESTIONNAIRE_VERSION_V2,
  normalizeQuestionnaireVersion,
} from '@/lib/questionnaire-version'

/** Champs source V1 utiles à la duplication vers un nouveau cas V2 (sans réponses ni métadonnées de parcours V2). */
export type DuplicateV1SourceRow = {
  company_id: string
  name: string
  description?: string | null
  deployment_date?: string | null
  deployment_phase?: string | null
  responsible_service?: string | null
  technology_partner?: string | null
  llm_model_version?: string | null
  primary_model_id?: string | null
  ai_category?: string | null
  system_type?: string | null
  deployment_countries?: string[] | null
  company_status?: string | null
  questionnaire_version?: number | null
}

export function isEligibleV1SourceForV2Duplicate(source: DuplicateV1SourceRow): boolean {
  return normalizeQuestionnaireVersion(source.questionnaire_version) === QUESTIONNAIRE_VERSION_V1
}

/**
 * Payload d’insert Supabase pour un nouveau cas V2 — questionnaire vierge côté réponses ;
 * `active_question_codes` = [] (défaut serveur), pas de `bpgv_variant` / `ors_exit`.
 */
export function buildV2DuplicateInsertPayload(
  source: DuplicateV1SourceRow,
  userId: string,
  nowIso: string
): Record<string, unknown> {
  const baseName = (source.name || 'Cas d’usage').trim()
  return {
    name: baseName.endsWith('(V2)') ? baseName : `${baseName} (V2)`,
    description: source.description ?? null,
    company_id: source.company_id,
    deployment_date: source.deployment_date ?? null,
    deployment_phase: source.deployment_phase ?? null,
    responsible_service: source.responsible_service ?? null,
    technology_partner: source.technology_partner ?? null,
    llm_model_version: source.llm_model_version ?? null,
    primary_model_id: source.primary_model_id ?? null,
    ai_category: source.ai_category ?? null,
    system_type: source.system_type ?? null,
    deployment_countries: source.deployment_countries ?? [],
    company_status: source.company_status ?? null,
    questionnaire_version: QUESTIONNAIRE_VERSION_V2,
    bpgv_variant: null,
    ors_exit: null,
    active_question_codes: [],
    status: 'draft',
    risk_level: 'minimal',
    score_base: null,
    score_model: null,
    score_final: null,
    is_eliminated: false,
    elimination_reason: null,
    report_summary: null,
    report_generated_at: null,
    updated_by: userId,
    created_at: nowIso,
    updated_at: nowIso,
  }
}

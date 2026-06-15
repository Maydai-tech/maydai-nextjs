/**
 * Service de calcul et persistance du score d'un cas d'usage.
 *
 * Ce module extrait la logique de calcul auparavant inline dans
 * `app/api/usecases/[id]/calculate-score/route.ts`, afin de pouvoir :
 *  - l'appeler depuis le route API avec le client authentifié de l'utilisateur (RLS), et
 *  - la réutiliser côté serveur avec un client service-role pour recalculer
 *    automatiquement les use cases d'un modèle dont les scores ont changé
 *    (édition admin ou import CSV), quel que soit le propriétaire du use case.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  calculateBaseScore,
  calculateFinalScore,
  determineCompanyStatus,
  getCompanyStatusDefinition,
  COMPL_AI_MULTIPLIER,
  type UserResponse,
  type CompanyStatus,
  type CompleteScoreResult,
} from '@/lib/score-calculator-simple'
import { mergeChecklistIntoDbResponseRows } from '@/lib/merge-checklist-into-user-responses'
import { recordUseCaseHistory } from '@/lib/usecase-history'
import { deriveRiskLevelFromResponses } from '@/lib/risk-level'
import {
  normalizeQuestionnaireVersion,
  QUESTIONNAIRE_VERSION_V2,
  QUESTIONNAIRE_VERSION_V3,
} from '@/lib/questionnaire-version'
import {
  buildV2ScoringContextFromDbResponses,
  dbResponsesToQuestionnaireAnswers,
} from '@/lib/scoring-v2-server'
import { buildV3ScoringContextFromDbResponses } from '@/lib/scoring-v3-server'
import { resolveQualificationOutcomeV3 } from '@/lib/qualification-v3-decision'
import { getServiceRoleClient, recalculateModelMaydaiScores } from '@/lib/maydai-calculator'

/**
 * Erreur métier du calcul de score, porteuse d'un code HTTP pour le route.
 * `details` permet de préserver le `hint` Supabase en cas d'échec d'update.
 */
export class UseCaseScoreError extends Error {
  status: number
  details?: string
  /** true quand le use case n'a aucune réponse exploitable (skip non fatal en lot). */
  noInput: boolean

  constructor(message: string, status: number, options?: { details?: string; noInput?: boolean }) {
    super(message)
    this.name = 'UseCaseScoreError'
    this.status = status
    this.details = options?.details
    this.noInput = options?.noInput ?? false
  }
}

export interface CalculateAndPersistOptions {
  /** Client Supabase (utilisateur+RLS depuis le route, ou service-role pour le cascade). */
  client: SupabaseClient
  usecaseId: string
  /** Auteur de l'action. `null` => recalcul automatique (système). */
  actorUserId: string | null
  requestPathMode?: 'short'
  /**
   * Enregistrer un événement `reevaluated` dans l'historique du use case.
   * Défaut : true si `actorUserId` est défini, false sinon (recalcul automatique).
   */
  recordHistory?: boolean
}

export interface CalculateAndPersistResult {
  finalResult: CompleteScoreResult
  company_status: CompanyStatus
  company_status_definition: string
  classification_status: string | null
  risk_level: string | null
}

/**
 * Calcule le score d'un cas d'usage et persiste le résultat dans `usecases`.
 *
 * NB : l'authentification et l'autorisation (accès du user au use case) ne sont
 * PAS gérées ici — elles restent de la responsabilité de l'appelant (le route API).
 *
 * @throws {UseCaseScoreError} en cas de use case introuvable, sans réponses,
 *   de paramètre invalide ou d'échec de mise à jour.
 */
export async function calculateAndPersistUseCaseScore(
  opts: CalculateAndPersistOptions
): Promise<CalculateAndPersistResult> {
  const { client: supabase, usecaseId, actorUserId, requestPathMode } = opts
  const recordHistory = opts.recordHistory ?? actorUserId !== null

  // ===== Chargement du use case (champs scoring + checklists + modèle) =====
  const { data: usecase, error: usecaseError } = await supabase
    .from('usecases')
    .select(
      'company_id, questionnaire_version, system_type, path_mode, primary_model_id, checklist_gov_enterprise, checklist_gov_usecase'
    )
    .eq('id', usecaseId)
    .single()

  if (usecaseError || !usecase) {
    throw new UseCaseScoreError("Cas d'usage non trouvé", 404)
  }

  const questionnaireVersion = normalizeQuestionnaireVersion(usecase.questionnaire_version)

  if (requestPathMode === 'short' && questionnaireVersion !== QUESTIONNAIRE_VERSION_V3) {
    throw new UseCaseScoreError('path_mode=short réservé au questionnaire V3', 400)
  }

  // ===== Score précédent (pour l'historique) =====
  const { data: currentScoreData } = await supabase
    .from('usecases')
    .select('score_final, risk_level')
    .eq('id', usecaseId)
    .single()

  const previousScore = currentScoreData?.score_final ?? null
  const previousRiskLevel = currentScoreData?.risk_level ?? null

  // ===== Réponses utilisateur + fusion des checklists =====
  const { data: responses, error: responsesError } = await supabase
    .from('usecase_responses')
    .select('*')
    .eq('usecase_id', usecaseId)

  if (responsesError) {
    throw new UseCaseScoreError('Impossible de récupérer les réponses', 500)
  }

  const checklistEnt = (usecase as { checklist_gov_enterprise?: string[] | null })
    .checklist_gov_enterprise
  const checklistUc = (usecase as { checklist_gov_usecase?: string[] | null }).checklist_gov_usecase
  const mergedResponses = mergeChecklistIntoDbResponseRows(
    responses ?? [],
    checklistEnt ?? null,
    checklistUc ?? null
  )

  const hasAnyInput =
    mergedResponses.length > 0 ||
    (Array.isArray(checklistEnt) && checklistEnt.length > 0) ||
    (Array.isArray(checklistUc) && checklistUc.length > 0)
  if (!hasAnyInput) {
    throw new UseCaseScoreError("Aucune réponse trouvée pour ce cas d'usage", 404, {
      noInput: true,
    })
  }

  // ===== Score de base =====
  const userResponses: UserResponse[] = mergedResponses.map((response) => ({
    question_code: response.question_code,
    single_value: response.single_value,
    multiple_codes: response.multiple_codes,
    conditional_main: response.conditional_main,
    conditional_keys: response.conditional_keys,
    conditional_values: response.conditional_values,
  }))

  const dbPathMode = (usecase as { path_mode?: string | null }).path_mode
  let v3QuestionnairePathMode: 'long' | 'short' = 'long'
  if (questionnaireVersion === QUESTIONNAIRE_VERSION_V3) {
    if (dbPathMode === 'short') v3QuestionnairePathMode = 'short'
    else if (dbPathMode === 'long') v3QuestionnairePathMode = 'long'
    else if (requestPathMode === 'short') v3QuestionnairePathMode = 'short'
    else v3QuestionnairePathMode = 'long'
  }

  const v2ScoringCtx =
    questionnaireVersion === QUESTIONNAIRE_VERSION_V2
      ? buildV2ScoringContextFromDbResponses(questionnaireVersion, mergedResponses)
      : null
  const v3ScoringCtx =
    questionnaireVersion === QUESTIONNAIRE_VERSION_V3
      ? buildV3ScoringContextFromDbResponses(
          questionnaireVersion,
          mergedResponses,
          (usecase as { system_type?: string | null }).system_type,
          v3QuestionnairePathMode
        )
      : null

  const baseScoreResult = v3ScoringCtx
    ? calculateBaseScore(userResponses, {
        activeQuestionCodes: v3ScoringCtx.scoringActiveQuestionCodes,
      })
    : v2ScoringCtx
      ? calculateBaseScore(userResponses, {
          activeQuestionCodes: v2ScoringCtx.scoringActiveQuestionCodes,
        })
      : calculateBaseScore(userResponses)

  // ===== Statut d'entreprise =====
  const companyStatus = determineCompanyStatus(userResponses)

  // ===== Score modèle COMPL-AI =====
  let modelScore: number | null = null
  try {
    const primaryModelId = (usecase as { primary_model_id?: string | null }).primary_model_id
    if (primaryModelId) {
      const { data: evaluations, error: evalError } = await supabase
        .from('compl_ai_evaluations')
        .select('score, principle_id')
        .eq('model_id', primaryModelId)
        .not('score', 'is', null)

      if (!evalError && evaluations && evaluations.length > 0) {
        const principleScores: Record<string, { sum: number; count: number }> = {}
        evaluations.forEach((evaluation: { score: number; principle_id: string }) => {
          const principleId = evaluation.principle_id
          if (!principleScores[principleId]) {
            principleScores[principleId] = { sum: 0, count: 0 }
          }
          principleScores[principleId].sum += evaluation.score
          principleScores[principleId].count += 1
        })

        const principleAverages = Object.values(principleScores).map(
          (data) => data.sum / data.count
        )
        const globalAverageScore =
          principleAverages.length > 0
            ? principleAverages.reduce((sum, avg) => sum + avg, 0) / principleAverages.length
            : 0

        modelScore = globalAverageScore * COMPL_AI_MULTIPLIER
      }
    }
  } catch (error) {
    console.warn('⚠️ Erreur lors de la récupération du score modèle:', error)
    // Continuer sans le score modèle
  }

  // ===== Score final =====
  const finalResult = calculateFinalScore(baseScoreResult, modelScore, usecaseId, {
    activeQuestionCodes:
      v3ScoringCtx?.scoringActiveQuestionCodes ?? v2ScoringCtx?.scoringActiveQuestionCodes,
    questionnairePathMode:
      questionnaireVersion === QUESTIONNAIRE_VERSION_V3 ? v3QuestionnairePathMode : undefined,
  })

  // ===== Niveau de risque / classification =====
  let riskLevel: string | null
  let classificationStatusForDb: string | null = null

  if (questionnaireVersion === QUESTIONNAIRE_VERSION_V3) {
    const answers = dbResponsesToQuestionnaireAnswers(mergedResponses)
    const v3Outcome = resolveQualificationOutcomeV3(
      answers,
      (usecase as { system_type?: string | null }).system_type
    )
    if (v3Outcome.classification_status === 'impossible') {
      riskLevel = null
      classificationStatusForDb = 'impossible'
    } else {
      riskLevel = v3Outcome.risk_level ?? 'minimal'
      classificationStatusForDb = 'qualified'
    }
  } else {
    riskLevel = deriveRiskLevelFromResponses(mergedResponses)
  }

  // ===== Persistance =====
  const nowIso = new Date().toISOString()
  const roundedScoreBase = Math.round(Number(finalResult.scores.score_base))
  const roundedScoreFinal = Math.round(Number(finalResult.scores.score_final))
  const persistedScoreModel =
    finalResult.scores.score_model == null
      ? null
      : Math.round(Number(finalResult.scores.score_model))

  const updateData: Record<string, unknown> = {
    score_base: roundedScoreBase,
    score_model: persistedScoreModel,
    score_final: roundedScoreFinal,
    is_eliminated: finalResult.scores.is_eliminated,
    elimination_reason: finalResult.scores.elimination_reason,
    risk_level: riskLevel,
    company_status: companyStatus,
    last_calculation_date: nowIso,
    updated_at: nowIso,
  }

  // En recalcul automatique (actorUserId null) on conserve `updated_by` existant
  // plutôt que d'écrire l'id d'un admin qui n'appartient pas à la company du use case.
  if (actorUserId) {
    updateData.updated_by = actorUserId
  }

  if (questionnaireVersion === QUESTIONNAIRE_VERSION_V3 && v3QuestionnairePathMode === 'short') {
    updateData.short_path_initial_score = roundedScoreFinal
    updateData.short_path_completed_at = nowIso
  }

  if (questionnaireVersion === QUESTIONNAIRE_VERSION_V3) {
    updateData.path_mode = v3QuestionnairePathMode
  }

  if (v3ScoringCtx) {
    updateData.bpgv_variant = v3ScoringCtx.bpgv_variant
    updateData.ors_exit = v3ScoringCtx.ors_exit
    updateData.active_question_codes = v3ScoringCtx.active_question_codes
    updateData.classification_status = classificationStatusForDb
  } else if (v2ScoringCtx) {
    updateData.bpgv_variant = v2ScoringCtx.bpgv_variant
    updateData.ors_exit = v2ScoringCtx.ors_exit
    updateData.active_question_codes = v2ScoringCtx.active_question_codes
    updateData.classification_status = null
  }

  const { error: updateError } = await supabase
    .from('usecases')
    .update(updateData)
    .eq('id', usecaseId)

  if (updateError) {
    const message =
      typeof updateError.message === 'string' && updateError.message.length > 0
        ? updateError.message
        : 'Impossible de mettre à jour les scores'
    throw new UseCaseScoreError(message, 500, {
      details: 'hint' in updateError ? (updateError as { hint?: string }).hint : undefined,
    })
  }

  // ===== Historique (uniquement pour les recalculs manuels) =====
  if (recordHistory && actorUserId) {
    await recordUseCaseHistory(supabase, usecaseId, actorUserId, 'reevaluated', {
      metadata:
        questionnaireVersion === QUESTIONNAIRE_VERSION_V3 && v3QuestionnairePathMode === 'short'
          ? {
              path_mode: 'short',
              short_path_initial_score: roundedScoreFinal,
              previous_risk_level: previousRiskLevel,
              new_risk_level: riskLevel,
            }
          : {
              previous_score: previousScore,
              new_score: finalResult.scores.score_final,
              score_change:
                previousScore !== null
                  ? Math.round((finalResult.scores.score_final - previousScore) * 100) / 100
                  : null,
              previous_risk_level: previousRiskLevel,
              new_risk_level: riskLevel,
            },
    })
  }

  return {
    finalResult,
    company_status: companyStatus,
    company_status_definition: getCompanyStatusDefinition(companyStatus),
    classification_status: classificationStatusForDb,
    risk_level: riskLevel,
  }
}

export interface BulkRecalcItemError {
  usecase_id: string
  error: string
}

export interface BulkRecalcSummary {
  model_id?: string
  /** Nombre de use cases pour lesquels un recalcul a été tenté. */
  processed_count: number
  success_count: number
  /** Use cases ignorés faute de réponses exploitables. */
  skipped_count: number
  error_count: number
  errors: BulkRecalcItemError[]
}

const CASCADE_BATCH_SIZE = 8

/**
 * Recalcule automatiquement, via un client service-role, l'ensemble des scores
 * impactés par une modification des scores d'un modèle :
 *  1. rafraîchit les `maydai_score` du modèle (`compl_ai_evaluations.maydai_score`) ;
 *  2. recalcule le `score_final` de tous les use cases dont `primary_model_id = modelId`.
 *
 * Conçu pour être appelé depuis les routes admin (édition de score, import CSV).
 * Chaque use case est isolé : une erreur n'interrompt pas le lot.
 */
export async function recalculateUseCaseScoresForModel(
  modelId: string
): Promise<BulkRecalcSummary> {
  const supabase = getServiceRoleClient()

  // 1) Rafraîchir le maydai_score du modèle (non bloquant pour le score des use cases).
  try {
    await recalculateModelMaydaiScores(modelId)
  } catch (error) {
    console.warn(
      `⚠️ Recalcul maydai_score du modèle ${modelId} échoué (cascade use cases poursuivie):`,
      error
    )
  }

  // 2) Récupérer les use cases liés à ce modèle.
  const { data: usecases, error } = await supabase
    .from('usecases')
    .select('id')
    .eq('primary_model_id', modelId)
    .limit(10000)

  if (error) {
    throw new Error(
      `Impossible de récupérer les use cases du modèle ${modelId}: ${error.message}`
    )
  }

  const ids = (usecases ?? []).map((u: { id: string }) => u.id)
  return recalculateUseCaseScoresByIds(supabase, ids, { model_id: modelId })
}

/**
 * Recalcule une liste de use cases (service-role), avec isolation d'erreur et
 * traitement par lots. Les use cases sans réponses sont comptés comme « skipped ».
 */
async function recalculateUseCaseScoresByIds(
  supabase: SupabaseClient,
  ids: string[],
  extra?: { model_id?: string }
): Promise<BulkRecalcSummary> {
  const summary: BulkRecalcSummary = {
    ...(extra?.model_id ? { model_id: extra.model_id } : {}),
    processed_count: 0,
    success_count: 0,
    skipped_count: 0,
    error_count: 0,
    errors: [],
  }

  for (let i = 0; i < ids.length; i += CASCADE_BATCH_SIZE) {
    const batch = ids.slice(i, i + CASCADE_BATCH_SIZE)
    await Promise.all(
      batch.map(async (usecaseId) => {
        summary.processed_count++
        try {
          await calculateAndPersistUseCaseScore({
            client: supabase,
            usecaseId,
            actorUserId: null,
            recordHistory: false,
          })
          summary.success_count++
        } catch (err) {
          // Use case sans réponses exploitables => skip non fatal.
          if (err instanceof UseCaseScoreError && err.noInput) {
            summary.skipped_count++
            return
          }
          summary.error_count++
          summary.errors.push({
            usecase_id: usecaseId,
            error: err instanceof Error ? err.message : 'Erreur inconnue',
          })
        }
      })
    )
  }

  return summary
}

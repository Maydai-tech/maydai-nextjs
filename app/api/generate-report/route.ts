import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { transformToOpenAIFormatComplete } from '@/lib/openai-data-transformer'
import { openAIClient } from '@/lib/openai-client'
import { extractNextStepsFromReport, validateNextStepsData, logExtractionResults } from '@/lib/nextsteps-parser'
import { errorMonitor, createErrorReport, createPerformanceMetrics } from '@/lib/error-monitor'
import {
  deriveRiskLevelFromResponses,
  normalizeEvaluationRisqueForImpossibleClassification,
  normalizeEvaluationRisqueInReportText,
  riskLevelCodeToReportLabel,
  type RiskLevelCode,
} from '@/lib/risk-level'
import { dbResponsesToQuestionnaireAnswers } from '@/lib/scoring-v2-server'
import { resolveQualificationOutcomeV3 } from '@/lib/qualification-v3-decision'
import { computeSlotStatuses, enforceStatusPrefix, SLOT_KEYS } from '@/lib/slot-statuses'
import {
  QUESTIONNAIRE_VERSION_V2,
  QUESTIONNAIRE_VERSION_V3,
  normalizeQuestionnaireVersion,
} from '@/lib/questionnaire-version'
import type { QuestionnaireParcoursMeta } from '@/lib/openai-data-transformer'

// Fonction de retry automatique pour la génération d'analyse avec timeout
async function generateAnalysisWithRetry(transformedData: any, usecaseId: string, maxRetries: number = 3): Promise<string> {
  let lastError: Error | null = null
  const timeoutMs = 60000 // 60 secondes de timeout par tentative

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Créer un timeout pour cette tentative
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout après ${timeoutMs}ms`)), timeoutMs)
      })

      // Exécuter la génération avec timeout
      const analysisPromise = openAIClient.generateComplianceAnalysisComplete(transformedData)
      const analysis = await Promise.race([analysisPromise, timeoutPromise])

      return analysis

    } catch (error) {
      lastError = error as Error
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isTimeout = errorMessage.includes('Timeout')

      // Enregistrer l'erreur dans le monitoring
      errorMonitor.logError(createErrorReport(
        usecaseId,
        isTimeout ? 'timeout' : 'openai',
        errorMessage,
        attempt,
        maxRetries,
        {
          transformedDataValid: !!transformedData.usecase_context_fields?.cas_usage?.id,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined
        }
      ))

      if (attempt === maxRetries) {
        throw new Error(`Échec de génération après ${maxRetries} tentatives: ${errorMessage}`)
      }

      // Attendre avant la prochaine tentative (backoff exponentiel)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10 secondes
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Erreur inconnue lors de la génération d\'analyse')
}

// GET: Récupérer un rapport existant
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const usecase_id = searchParams.get('usecase_id')

    if (!usecase_id) {
      return NextResponse.json({ error: 'usecase_id is required' }, { status: 400 })
    }

    // ===== AUTHENTIFICATION =====
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Token d\'authentification manquant' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    // Vérifier la validité du token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Récupérer le use case avec le rapport
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('id, name, report_summary, report_generated_at')
      .eq('id', usecase_id)
      .single()

    if (usecaseError || !usecase) {
      return NextResponse.json({ error: 'Usecase not found' }, { status: 404 })
    }

    if (!usecase.report_summary) {
      return NextResponse.json({
        error: 'No report found for this use case',
        has_report: false
      }, { status: 404 })
    }

    return NextResponse.json({
      report: usecase.report_summary,
      generated_at: usecase.report_generated_at,
      usecase_id: usecase.id,
      usecase_name: usecase.name,
      has_report: true
    })

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération du rapport',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}

// POST: Générer un rapport d'analyse IA pour un use case
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch (parseError) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { usecase_id } = body

    if (!usecase_id) {
      return NextResponse.json({ error: 'usecase_id is required' }, { status: 400 })
    }

    // ===== AUTHENTIFICATION =====
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Token d\'authentification manquant' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    // Vérifier la validité du token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Récupérer les informations complètes du use case avec l'entreprise
    const { data: usecase, error: usecaseError } = await supabase
    .from('usecases')
    .select(`
      id, name, description, deployment_date, status, risk_level, ai_category,
      system_type, responsible_service, deployment_countries, company_status,
      technology_partner, llm_model_version, primary_model_id,
      score_base, score_model, score_final, is_eliminated, elimination_reason,
      questionnaire_version, bpgv_variant, active_question_codes, ors_exit, classification_status,
      companies(name, industry, city, country)
    `)
    .eq('id', usecase_id)
    .single()

    if (usecaseError || !usecase) {
      return NextResponse.json({ error: 'Usecase not found' }, { status: 404 })
    }

    const questionnaireVersion = normalizeQuestionnaireVersion(
      (usecase as { questionnaire_version?: number | null }).questionnaire_version
    )
    if (
      (questionnaireVersion === QUESTIONNAIRE_VERSION_V2 ||
        questionnaireVersion === QUESTIONNAIRE_VERSION_V3) &&
      String(usecase.status || '').toLowerCase() === 'completed' &&
      usecase.score_final == null
    ) {
      return NextResponse.json(
        {
          error:
            'Cas V2/V3 marqué complété sans score final : recalcul ou complétion requise avant génération du rapport.',
          code: 'V2_SCORE_MISSING',
        },
        { status: 409 }
      )
    }

    // Récupérer TOUTES les réponses du questionnaire (pas seulement 2 questions)
    const { data: responses, error: responseError } = await supabase
    .from('usecase_responses')
    .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values, answered_by')
    .eq('usecase_id', usecase_id)

    if (responseError) {
      return NextResponse.json({ error: 'Failed to fetch questionnaire responses' }, { status: 500 })
    }

    let authoritativeRiskCode: RiskLevelCode | null
    let classificationStatusUpdate: string | null = null

    if (questionnaireVersion === QUESTIONNAIRE_VERSION_V3) {
      const answers = dbResponsesToQuestionnaireAnswers(responses || [])
      const v3Out = resolveQualificationOutcomeV3(
        answers,
        (usecase as { system_type?: string | null }).system_type
      )
      if (v3Out.classification_status === 'impossible') {
        return NextResponse.json(
          {
            error:
              'Classification réglementaire impossible : les réponses « Je ne sais pas » sur un pivot critique empêchent de conclure un niveau de risque fiable. Corrigez le questionnaire avant de générer le rapport.',
            code: 'CLASSIFICATION_IMPOSSIBLE',
          },
          { status: 409 }
        )
      }
      authoritativeRiskCode = v3Out.risk_level ?? 'minimal'
      classificationStatusUpdate = 'qualified'
    } else {
      authoritativeRiskCode = deriveRiskLevelFromResponses(responses || [])
    }

    const { error: riskLevelUpdateError } = await supabase
      .from('usecases')
      .update({
        risk_level: authoritativeRiskCode,
        ...(questionnaireVersion === QUESTIONNAIRE_VERSION_V3
          ? { classification_status: classificationStatusUpdate }
          : {}),
      })
      .eq('id', usecase_id)

    if (riskLevelUpdateError) {
      console.error('[generate-report] Échec mise à jour usecases.risk_level:', riskLevelUpdateError)
      return NextResponse.json(
        {
          error: 'Failed to persist recalculated risk level',
          details: riskLevelUpdateError.message,
        },
        { status: 500 }
      )
    }

    const usecaseWithAuthoritativeRisk = {
      ...usecase,
      risk_level: authoritativeRiskCode,
    }

    // Extraire les informations d'entreprise
    const company = Array.isArray(usecase.companies) ? usecase.companies[0] : usecase.companies
    const companyName = company?.name || 'MaydAI'
    const companyIndustry = company?.industry
    const companyCity = company?.city
    const companyCountry = company?.country

    // Récupérer les informations du modèle séparément si primary_model_id est défini
    let model: { id: string; model_name: string; model_provider: string; model_type: string; version: string } | null = null
    if (usecase.primary_model_id) {
      const { data: modelData } = await supabase
        .from('compl_ai_models')
        .select('id, model_name, model_provider, model_type, version')
        .eq('id', usecase.primary_model_id)
        .single()
      model = modelData
    }

    // Extraire le profil du répondant
    const respondentEmail = responses?.[0]?.answered_by || 'Non disponible'

    const activeCodesRaw = (usecase as { active_question_codes?: unknown }).active_question_codes
    const activeQuestionCodes = Array.isArray(activeCodesRaw)
      ? activeCodesRaw.filter((c): c is string => typeof c === 'string')
      : []

    const slotStatuses = computeSlotStatuses(responses || [], {
      questionnaireVersion: questionnaireVersion,
      activeQuestionCodes,
    })
    console.log(`[generate-report] Slot statuses (code) pour ${usecase_id}:`, slotStatuses)

    const questionnaireParcours: QuestionnaireParcoursMeta | null =
      questionnaireVersion === QUESTIONNAIRE_VERSION_V2 ||
      questionnaireVersion === QUESTIONNAIRE_VERSION_V3
        ? {
            questionnaire_version: questionnaireVersion,
            bpgv_variant:
              (usecase as { bpgv_variant?: string | null }).bpgv_variant ?? null,
            ors_exit: (usecase as { ors_exit?: string | null }).ors_exit ?? null,
            active_question_codes: activeQuestionCodes,
          }
        : null

    const transformedData = transformToOpenAIFormatComplete(
      usecaseWithAuthoritativeRisk as any,
      company,
      model,
      responses || [],
      respondentEmail,
      questionnaireParcours
    )
    transformedData.slot_statuses = slotStatuses
    if (questionnaireParcours) {
      transformedData.questionnaire_parcours = questionnaireParcours
    }

    // Valider les données transformées (validation simplifiée pour le nouveau format)
    if (!transformedData.usecase_context_fields?.cas_usage?.id) {
      // Enregistrer l'erreur de validation
      errorMonitor.logError(createErrorReport(
        usecase_id,
        'validation',
        'Données insuffisantes pour l\'analyse OpenAI',
        1,
        1,
        {
          has_responses: (responses?.length || 0) > 0,
          has_company: !!company,
          has_model: !!model,
          transformed_data_valid: !!transformedData.usecase_context_fields?.cas_usage?.id,
          transformedDataStructure: transformedData.usecase_context_fields
        }
      ))

      return NextResponse.json({
        error: 'Données insuffisantes pour l\'analyse. Veuillez compléter le questionnaire d\'abord.',
        requires_questionnaire: true,
        debug_info: {
          has_responses: (responses?.length || 0) > 0,
          has_company: !!company,
          has_model: !!model,
          transformed_data_valid: !!transformedData.usecase_context_fields?.cas_usage?.id
        }
      }, { status: 400 })
    }

    // Générer l'analyse avec OpenAI (nouveau format complet) avec retry automatique
    const startTime = Date.now()
    let analysis: string
    let success = false
    let attempt = 1

    try {
      analysis = await generateAnalysisWithRetry(transformedData, usecase_id)
      success = true
    } catch (error) {
      throw error
    }

    const reportClassificationImpossible =
      String((usecase as { classification_status?: string | null }).classification_status) ===
      'impossible'

    const normalizedReport = reportClassificationImpossible
      ? normalizeEvaluationRisqueForImpossibleClassification(analysis)
      : normalizeEvaluationRisqueInReportText(analysis, authoritativeRiskCode)

    if (normalizedReport.corrected) {
      const expected = reportClassificationImpossible
        ? '(libellé qualification impossible)'
        : riskLevelCodeToReportLabel(authoritativeRiskCode)
      console.warn(
        `[generate-report] Écart evaluation_risque.niveau (usecase_id=${usecase_id}): modèle="${normalizedReport.previousNiveau ?? '(vide)'}" → corrigé en "${expected}"`
      )
    }
    analysis = normalizedReport.report

    const processingTime = Date.now() - startTime

    // Enregistrer les métriques de performance
    errorMonitor.logPerformance(createPerformanceMetrics(
      usecase_id,
      processingTime,
      success,
      attempt,
      analysis.length
    ))

    // Sauvegarder le rapport dans la base de données avec retry
    let saveError = null

    for (let saveAttempt = 1; saveAttempt <= 3; saveAttempt++) {
      try {
        const { error } = await supabase
          .from('usecases')
          .update({
            report_summary: analysis,
            report_generated_at: new Date().toISOString()
          })
          .eq('id', usecase_id)

        if (!error) {
          break
        }

        saveError = error

        if (saveAttempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (err) {
        saveError = err
        if (saveAttempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    if (saveError) {
      const errorMessage = saveError instanceof Error ? saveError.message : String(saveError)
      errorMonitor.logError(createErrorReport(
        usecase_id,
        'database',
        `Échec sauvegarde rapport: ${errorMessage}`,
        1,
        1,
        { saveError: errorMessage }
      ))

      return NextResponse.json({
        error: 'Failed to save report to database',
        details: errorMessage
      }, { status: 500 })
    }

    // Extraire les prochaines étapes structurées du rapport
    const extractedNextSteps = extractNextStepsFromReport(analysis)

    // Post-correction : forcer les préfixes OUI/NON/Information insuffisante
    // d'après les statuts calculés par le code (filet de sécurité si le LLM désobéit)
    for (const key of SLOT_KEYS) {
      const expected = slotStatuses[key]
      const raw = extractedNextSteps[key]
      const corrected = enforceStatusPrefix(raw, expected)
      if (raw !== corrected) {
        console.warn(
          `[generate-report] Post-correction ${key}: LLM="${raw?.substring(0, 40)}" → forcé="${corrected.substring(0, 40)}"`
        )
      }
      extractedNextSteps[key] = corrected
    }

    // Ajouter l'usecase_id et les métadonnées aux données extraites
    // IMPORTANT: cette structure doit rester compatible avec validateNextStepsData(...)
    const baseNextStepsData: Parameters<typeof validateNextStepsData>[0] = {
      ...extractedNextSteps,
      usecase_id: usecase_id,
      model_version: model?.version || 'openai-gpt-4',
      processing_time_ms: processingTime,
    }

    const isUnacceptable = authoritativeRiskCode === 'unacceptable'

    // Cas particulier : risque inacceptable
    // - On sauvegarde seulement les champs interdit_1..3 (et on garde les sections narratives)
    // - On force quick_win_*, priorite_*, action_* à NULL pour ne pas afficher de plan d'action
    const nextStepsData = isUnacceptable
      ? {
          ...baseNextStepsData,
          quick_win_1: null,
          quick_win_2: null,
          quick_win_3: null,
          priorite_1: null,
          priorite_2: null,
          priorite_3: null,
          action_1: null,
          action_2: null,
          action_3: null,
        }
      : baseNextStepsData

    // Valider les données extraites (validation stricte : 9 actions + pas de doublons)
    // Sauf pour le cas "unacceptable" où les 9 slots sont volontairement null.
    const validation = isUnacceptable
      ? { isValid: true, missingFields: [], warnings: [], hasDuplicates: false, duplicateDetails: [] }
      : validateNextStepsData(baseNextStepsData)

    logExtractionResults(analysis, nextStepsData, validation)

    let nextStepsSaved = false
    let nextStepsError = null
    let nextStepsStatus: 'saved' | 'parse_failed' | 'save_error' = 'parse_failed'

    if (validation.isValid) {
      try {
        const { error: nextStepsSaveError } = await supabase
          .from('usecase_nextsteps')
          .upsert(nextStepsData, {
            onConflict: 'usecase_id',
            ignoreDuplicates: false
          })

        if (nextStepsSaveError) {
          nextStepsError = nextStepsSaveError.message
          nextStepsStatus = 'save_error'
        } else {
          nextStepsSaved = true
          nextStepsStatus = 'saved'
        }
      } catch (error) {
        nextStepsError = error instanceof Error ? error.message : 'Erreur inconnue'
        nextStepsStatus = 'save_error'
      }
    } else {
      // Données corrompues — on ne les écrit PAS en base
      const reason = validation.hasDuplicates
        ? `Doublons détectés: ${validation.duplicateDetails.join('; ')}`
        : `Actions manquantes: ${validation.missingFields.join(', ')}`

      console.error(`[generate-report] PARSE_FAILED pour ${usecase_id}: ${reason}`)

      nextStepsError = `Extraction incomplète ou corrompue — données non sauvegardées. ${reason}`
      nextStepsStatus = 'parse_failed'
    }

    return NextResponse.json({
      report: analysis,
      success: true,
      timestamp: new Date().toISOString(),
      usecase_id: usecase.id,
      usecase_name: usecase.name,
      saved_to_db: true,
      next_steps_status: nextStepsStatus,
      next_steps_extracted: validation.isValid,
      next_steps_saved: nextStepsSaved,
      next_steps_validation: {
        isValid: validation.isValid,
        warnings: validation.warnings,
        missingFields: validation.missingFields,
        hasDuplicates: validation.hasDuplicates,
        duplicateDetails: validation.duplicateDetails
      },
      next_steps_error: nextStepsError,
      processing_time_ms: processingTime
    })

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erreur lors de la génération du rapport IA',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}

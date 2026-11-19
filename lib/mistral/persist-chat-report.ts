import type { SupabaseClient } from '@supabase/supabase-js'
import {
  extractNextStepsFromReport,
  logExtractionResults,
  sanitizeNextStepsQuasiDuplicateTexts,
  validateNextStepsData,
} from '@/lib/nextsteps-parser'
import { normalizeEvaluationRisqueInReportText, type RiskLevelCode } from '@/lib/risk-level'

export type PersistChatReportResult = {
  next_steps_status: 'saved' | 'parse_failed' | 'save_error'
  next_steps_saved: boolean
  next_steps_error: string | null
}

export async function persistChatReport(
  supabase: SupabaseClient,
  options: {
    usecaseId: string
    reportJson: string
    authoritativeRiskCode: RiskLevelCode
    processingTimeMs: number
  }
): Promise<PersistChatReportResult> {
  const normalized = normalizeEvaluationRisqueInReportText(
    options.reportJson,
    options.authoritativeRiskCode
  )
  const analysis = normalized.report

  let saveError: unknown = null
  for (let saveAttempt = 1; saveAttempt <= 3; saveAttempt++) {
    const { error } = await supabase
      .from('usecases')
      .update({
        report_summary: analysis,
        report_generated_at: new Date().toISOString(),
      })
      .eq('id', options.usecaseId)

    if (!error) {
      saveError = null
      break
    }
    saveError = error
    if (saveAttempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  if (saveError) {
    const message =
      saveError instanceof Error
        ? saveError.message
        : typeof saveError === 'object' && saveError && 'message' in saveError
          ? String((saveError as { message: unknown }).message)
          : String(saveError)
    throw new Error(`Échec sauvegarde rapport: ${message}`)
  }

  const extractedNextSteps = sanitizeNextStepsQuasiDuplicateTexts(
    extractNextStepsFromReport(analysis)
  )
  const baseNextStepsData: Parameters<typeof validateNextStepsData>[0] = {
    ...extractedNextSteps,
    usecase_id: options.usecaseId,
    model_version: 'mistral-report-agent',
    processing_time_ms: options.processingTimeMs,
  }

  const isUnacceptable = options.authoritativeRiskCode === 'unacceptable'
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

  const validation = isUnacceptable
    ? { isValid: true, missingFields: [], warnings: [], hasDuplicates: false, duplicateDetails: [] }
    : validateNextStepsData(baseNextStepsData)

  logExtractionResults(analysis, nextStepsData, validation)

  if (!validation.isValid) {
    const reason = validation.hasDuplicates
      ? `Doublons détectés: ${validation.duplicateDetails.join('; ')}`
      : `Actions manquantes: ${validation.missingFields.join(', ')}`
    return {
      next_steps_status: 'parse_failed',
      next_steps_saved: false,
      next_steps_error: `Extraction incomplète ou corrompue — données non sauvegardées. ${reason}`,
    }
  }

  const { error: nextStepsSaveError } = await supabase.from('usecase_nextsteps').upsert(nextStepsData, {
    onConflict: 'usecase_id',
    ignoreDuplicates: false,
  })

  if (nextStepsSaveError) {
    return {
      next_steps_status: 'save_error',
      next_steps_saved: false,
      next_steps_error: nextStepsSaveError.message,
    }
  }

  return {
    next_steps_status: 'saved',
    next_steps_saved: true,
    next_steps_error: null,
  }
}

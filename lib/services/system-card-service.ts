import { getServiceRoleClient } from '@/lib/maydai-calculator'
import { syncTodoActionToResponse } from '@/lib/todo-action-sync'
import { calculateAndPersistUseCaseScore } from '@/lib/usecase-score-service'
import type { DocStatus } from '@/lib/validations/dossier-doc-type'
import {
  SystemCardPillarCodeSchema,
  SystemCardPillarSchema,
  resolveDocTypeFromPillarCode,
  type SystemCardPillar,
} from '@/lib/validations/system-card'

export type DossierPillarStatus = Extract<DocStatus, 'incomplete' | 'complete'>

/**
 * Statut dossier à partir des deux flags 50/50.
 * L’enum Postgres `doc_status` n’a pas `partially_completed` :
 * 50 % reste `incomplete`, l’état partiel est porté par les flags.
 */
export function resolveDossierStatusFromPillarFlags(
  maydaiPrefillApplied: boolean,
  userCompletionApplied: boolean
): DossierPillarStatus {
  return maydaiPrefillApplied && userCompletionApplied ? 'complete' : 'incomplete'
}

const PILLAR_SELECT = `
  id,
  system_card_id,
  pillar_code,
  pillar_title,
  sections_covered,
  summary,
  key_points,
  ai_act_compliance,
  recommendations,
  llm_system_cards!inner(model_identifier)
`

const PILLAR_CODE_ORDER: SystemCardPillar['pillar_code'][] = [
  'doc_technique',
  'data_governance',
  'prompts_guardrails',
  'risk_management',
  'surveillance_plan',
]

/**
 * Récupère la fiche d'audit d'un pilier selon l'identifiant du modèle LLM.
 */
export async function getSystemCardPillar(
  modelIdentifier: string,
  pillarCode: string
): Promise<SystemCardPillar | null> {
  const parsedCode = SystemCardPillarCodeSchema.safeParse(pillarCode)
  if (!parsedCode.success || !modelIdentifier.trim()) {
    return null
  }

  try {
    const supabase = getServiceRoleClient()
    const { data, error } = await supabase
      .from('llm_system_card_pillars')
      .select(PILLAR_SELECT)
      .eq('llm_system_cards.model_identifier', modelIdentifier)
      .eq('pillar_code', parsedCode.data)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    const parsed = SystemCardPillarSchema.safeParse(data)
    if (!parsed.success) {
      console.error('[SystemCardService] Zod validation error:', parsed.error)
      return null
    }

    return parsed.data
  } catch (error) {
    console.error('[SystemCardService] Unexpected fetch error:', error)
    return null
  }
}

/**
 * Tous les piliers d'une System Card, ordonnés pour le rapport PDF.
 */
export async function getSystemCardPillarsByModel(
  modelIdentifier: string
): Promise<SystemCardPillar[]> {
  if (!modelIdentifier.trim()) return []

  try {
    const supabase = getServiceRoleClient()
    const { data, error } = await supabase
      .from('llm_system_card_pillars')
      .select(PILLAR_SELECT)
      .eq('llm_system_cards.model_identifier', modelIdentifier)

    if (error || !Array.isArray(data)) {
      return []
    }

    const pillars = data.flatMap((row) => {
      const parsed = SystemCardPillarSchema.safeParse(row)
      return parsed.success ? [parsed.data] : []
    })

    return pillars.sort(
      (a, b) => PILLAR_CODE_ORDER.indexOf(a.pillar_code) - PILLAR_CODE_ORDER.indexOf(b.pillar_code)
    )
  } catch (error) {
    console.error('[SystemCardService] Unexpected fetch error:', error)
    return []
  }
}

export type DossierPillarScoreChange = {
  previousScore: number | null
  newScore: number | null
  pointsGained: number
  reason: string
}

/**
 * Applique la validation de l'analyse MaydAI (50 % des points)
 * ou des compléments client (50 % des points).
 */
export async function updateDossierPillarCompletion(params: {
  usecaseId: string
  dossierId: string
  pillarCode: string
  applyMaydaiPrefill?: boolean
  applyUserCompletion?: boolean
  pillarId?: string
}): Promise<{
  success: boolean
  newStatus: DossierPillarStatus
  scoreChange: DossierPillarScoreChange
}> {
  const { usecaseId, dossierId, pillarCode, applyMaydaiPrefill, applyUserCompletion, pillarId } =
    params

  const docType = resolveDocTypeFromPillarCode(pillarCode)
  if (!docType) {
    throw new Error(`Pilier inconnu: ${pillarCode}`)
  }

  try {
    const supabase = getServiceRoleClient()

    const { data: existingDoc, error: existingError } = await supabase
      .from('dossier_documents')
      .select('system_card_pillar_id, maydai_prefill_applied, user_completion_applied')
      .eq('dossier_id', dossierId)
      .eq('doc_type', docType)
      .maybeSingle()

    if (existingError) {
      throw new Error(existingError.message)
    }

    const isPrefillDone = applyMaydaiPrefill ?? existingDoc?.maydai_prefill_applied ?? false
    const isUserDone = applyUserCompletion ?? existingDoc?.user_completion_applied ?? false
    const status = resolveDossierStatusFromPillarFlags(Boolean(isPrefillDone), Boolean(isUserDone))

    const payload = {
      dossier_id: dossierId,
      doc_type: docType,
      system_card_pillar_id: pillarId || existingDoc?.system_card_pillar_id || null,
      maydai_prefill_applied: Boolean(isPrefillDone),
      user_completion_applied: Boolean(isUserDone),
      status,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await supabase
      .from('dossier_documents')
      .upsert(payload, { onConflict: 'dossier_id,doc_type' })

    if (upsertError) {
      throw new Error(`DB Error: ${upsertError.message}`)
    }

    if (status === 'complete') {
      try {
        await syncTodoActionToResponse(supabase, usecaseId, docType, 'system-card')
      } catch (syncError) {
        console.error('[SystemCardService] syncTodoActionToResponse failed:', syncError)
      }
    }

    const scoreResult = await calculateAndPersistUseCaseScore({
      client: supabase,
      usecaseId,
      actorUserId: null,
    })

    const newScore = scoreResult.finalResult?.scores?.score_final ?? null
    const previousScore = scoreResult.previousScore ?? null
    const pointsGained =
      typeof newScore === 'number' && previousScore !== null
        ? Math.round((newScore - previousScore) * 10) / 10
        : 0

    return {
      success: true,
      newStatus: status,
      scoreChange: {
        previousScore,
        newScore,
        pointsGained,
        reason: applyMaydaiPrefill
          ? 'Analyse MaydAI validee'
          : 'Complements entreprise valides',
      },
    }
  } catch (error) {
    console.error('[SystemCardService] Error updating pillar completion:', error)
    const message =
      error instanceof Error ? error.message : 'Impossible de mettre à jour le statut du pilier'
    throw new Error(message)
  }
}

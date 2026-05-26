import type { SupabaseClient } from '@supabase/supabase-js'

const LOG_PREFIX = '[LeadFunnel]'

/** Étapes du tunnel (séquentielles, sans régression). */
export const LEAD_FUNNEL_STAGE = {
  NEW: 0,
  SIGNED_UP: 1,
  REGISTRY: 2,
  USE_CASE: 3,
  FINISHED: 4,
  PAID: 5,
} as const

export type LeadFunnelStage =
  (typeof LEAD_FUNNEL_STAGE)[keyof typeof LEAD_FUNNEL_STAGE]

const MIN_STAGE = LEAD_FUNNEL_STAGE.NEW
const MAX_STAGE = LEAD_FUNNEL_STAGE.PAID

type LeadFunnelRow = {
  id: string
  funnel_stage: number | null
  email: string | null
}

export type UpdateLeadFunnelStageResult =
  | {
      ok: true
      updated: true
      leadIds: string[]
      previousStages: number[]
      targetStage: number
    }
  | {
      ok: true
      updated: false
      leadIds: string[]
      reason: 'already_at_or_beyond_target' | 'no_lead_found'
      targetStage: number
    }
  | { ok: false; error: string; targetStage: number }

function log(message: string, data?: Record<string, unknown>) {
  if (data && Object.keys(data).length > 0) {
    console.log(`${LOG_PREFIX} ${message}`, data)
  } else {
    console.log(`${LOG_PREFIX} ${message}`)
  }
}

function normalizeStage(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function isValidTargetStage(targetStage: number): boolean {
  return (
    Number.isInteger(targetStage) &&
    targetStage >= MIN_STAGE &&
    targetStage <= MAX_STAGE
  )
}

async function resolveUserEmail(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (error) {
    log('Impossible de résoudre l’email auth', { userId, error: error.message })
    return null
  }
  const email = data.user?.email?.trim().toLowerCase()
  return email && email.length > 0 ? email : null
}

/**
 * Recherche les leads d’un utilisateur : d’abord par `converted_to_user_id`,
 * puis par email auth si la FK n’est pas encore renseignée sur le lead.
 */
async function findLeadsForUser(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<{ leads: LeadFunnelRow[]; lookup: 'user_id' | 'email' | 'none' }> {
  const { data: byUserId, error: byUserError } = await supabaseAdmin
    .from('leads')
    .select('id, funnel_stage, email')
    .eq('converted_to_user_id', userId)

  if (byUserError) {
    throw new Error(
      `SELECT leads par converted_to_user_id: ${byUserError.message}`
    )
  }

  const fromUserId = (byUserId ?? []) as LeadFunnelRow[]
  if (fromUserId.length > 0) {
    return { leads: fromUserId, lookup: 'user_id' }
  }

  const email = await resolveUserEmail(supabaseAdmin, userId)
  if (!email) {
    return { leads: [], lookup: 'none' }
  }

  const { data: byEmail, error: byEmailError } = await supabaseAdmin
    .from('leads')
    .select('id, funnel_stage, email')
    .eq('email', email)
    .is('converted_to_user_id', null)

  if (byEmailError) {
    throw new Error(`SELECT leads par email: ${byEmailError.message}`)
  }

  const fromEmail = (byEmail ?? []) as LeadFunnelRow[]
  return {
    leads: fromEmail,
    lookup: fromEmail.length > 0 ? 'email' : 'none',
  }
}

/**
 * Avance le `funnel_stage` des leads liés à un utilisateur sans jamais régresser.
 * Client **service role** requis (RLS + lecture `auth.admin`).
 */
export async function updateLeadFunnelStage(
  userId: string,
  targetStage: number,
  supabaseAdmin: SupabaseClient
): Promise<UpdateLeadFunnelStageResult> {
  const trimmedUserId = userId?.trim()
  if (!trimmedUserId) {
    const error = 'userId est obligatoire'
    console.warn(`${LOG_PREFIX} ${error}`)
    return { ok: false, error, targetStage }
  }

  if (!isValidTargetStage(targetStage)) {
    const error = `targetStage invalide (attendu entier ${MIN_STAGE}–${MAX_STAGE})`
    console.warn(`${LOG_PREFIX} ${error}`, { userId: trimmedUserId, targetStage })
    return { ok: false, error, targetStage }
  }

  try {
    const { leads, lookup } = await findLeadsForUser(supabaseAdmin, trimmedUserId)

    if (leads.length === 0) {
      log('Aucun lead trouvé — ignoré', {
        userId: trimmedUserId,
        targetStage,
        lookup,
      })
      return {
        ok: true,
        updated: false,
        leadIds: [],
        reason: 'no_lead_found',
        targetStage,
      }
    }

    const leadIds: string[] = []
    const previousStages: number[] = []
    let anyUpdated = false

    for (const lead of leads) {
      const currentStage = normalizeStage(lead.funnel_stage)

      if (currentStage >= targetStage) {
        log('Étape déjà atteinte — ignoré', {
          userId: trimmedUserId,
          leadId: lead.id,
          currentStage,
          targetStage,
          lookup,
        })
        leadIds.push(lead.id)
        previousStages.push(currentStage)
        continue
      }

      const { error: updateError } = await supabaseAdmin
        .from('leads')
        .update({ funnel_stage: targetStage })
        .eq('id', lead.id)

      if (updateError) {
        throw new Error(
          `UPDATE lead ${lead.id} funnel_stage: ${updateError.message}`
        )
      }

      anyUpdated = true
      leadIds.push(lead.id)
      previousStages.push(currentStage)

      log('Updated user to stage', {
        userId: trimmedUserId,
        leadId: lead.id,
        previousStage: currentStage,
        targetStage,
        lookup,
      })
    }

    if (!anyUpdated) {
      return {
        ok: true,
        updated: false,
        leadIds,
        reason: 'already_at_or_beyond_target',
        targetStage,
      }
    }

    return {
      ok: true,
      updated: true,
      leadIds,
      previousStages,
      targetStage,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`${LOG_PREFIX} Erreur`, { userId: trimmedUserId, targetStage, message })
    return { ok: false, error: message, targetStage }
  }
}

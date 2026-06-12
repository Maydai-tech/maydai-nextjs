/**
 * Shadow test production — P0.2 (sync asymétrique + metadata original_value).
 *
 * Usage (prod) :
 *   npx tsx --env-file=.env.prod.local scripts/prod-sanity-check.ts
 *
 * Prérequis : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Migration : 20260613000000_add_metadata_to_responses.sql appliquée en prod.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  reverseTodoActionResponse,
  syncTodoActionToResponse,
} from '../lib/todo-action-sync'
import { QUESTIONNAIRE_VERSION_V3 } from '../lib/questionnaire-version'

const SANITY_USECASE_NAME = '[SANITY CHECK] PROD Rollout P0.2'
const SANITY_COMPANY_PREFIX = '[SANITY CHECK] PROD P0.2'
const SANITY_USER_EMAIL = 'prod-sanity-check@maydai.io'
const TODO_ACTION = 'technical_documentation'

const QUESTION_ROLE = 'E4.N7.Q1'
const ROLE_VALUE = 'E4.N7.Q1.B'

const QUESTION_TARGET = 'E5.N9.Q4'
const NEGATIVE_VALUE = 'E5.N9.Q4.B'
const POSITIVE_VALUE = 'E5.N9.Q4.A'

const COLORS = {
  success: '\x1b[32m',
  sync: '\x1b[33m',
  seed: '\x1b[34m',
  cleanup: '\x1b[36m',
  error: '\x1b[31m',
  reset: '\x1b[0m',
} as const

function logSuccess(message: string, data?: unknown) {
  const prefix = `${COLORS.success}[✓ SUCCESS]${COLORS.reset}`
  if (data !== undefined) console.log(prefix, message, data)
  else console.log(prefix, message)
}

function logSync(message: string, data?: unknown) {
  const prefix = `${COLORS.sync}[⏳ SYNC]${COLORS.reset}`
  if (data !== undefined) console.log(prefix, message, data)
  else console.log(prefix, message)
}

function logSeed(message: string, data?: unknown) {
  const prefix = `${COLORS.seed}[🌱 SEED]${COLORS.reset}`
  if (data !== undefined) console.log(prefix, message, data)
  else console.log(prefix, message)
}

function logCleanup(message: string, data?: unknown) {
  const prefix = `${COLORS.cleanup}[🧹 CLEANUP]${COLORS.reset}`
  if (data !== undefined) console.log(prefix, message, data)
  else console.log(prefix, message)
}

function logError(message: string, data?: unknown) {
  const prefix = `${COLORS.error}[✗ ERROR]${COLORS.reset}`
  if (data !== undefined) console.error(prefix, message, data)
  else console.error(prefix, message)
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    logError(`Variable d'environnement manquante : ${name}`)
    process.exit(1)
  }
  return value
}

function isEmptyMetadata(metadata: unknown): boolean {
  if (metadata == null) return false
  if (typeof metadata !== 'object' || Array.isArray(metadata)) return false
  return Object.keys(metadata as Record<string, unknown>).length === 0
}

function extractOriginalValue(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as Record<string, unknown>).original_value
  return typeof value === 'string' && value.length > 0 ? value : null
}

async function fetchTargetResponse(admin: SupabaseClient, usecaseId: string) {
  const { data, error } = await admin
    .from('usecase_responses')
    .select('single_value, metadata')
    .eq('usecase_id', usecaseId)
    .eq('question_code', QUESTION_TARGET)
    .maybeSingle()

  if (error) {
    throw new Error(`SELECT usecase_responses (${QUESTION_TARGET}) : ${error.message}`)
  }
  return data
}

async function cleanupSanityEntities(
  admin: SupabaseClient,
  usecaseId: string | null,
  companyId: string | null
) {
  if (!usecaseId) {
    logCleanup('Aucun usecase à supprimer (seed non abouti).')
    if (companyId) {
      const { error } = await admin.from('companies').delete().eq('id', companyId)
      if (error) logCleanup(`Échec suppression company ${companyId} : ${error.message}`)
      else logCleanup(`Company temporaire supprimée : ${companyId}`)
    }
    return
  }

  logCleanup(`Suppression des entités de test pour usecase ${usecaseId}…`)

  const { error: responsesError } = await admin
    .from('usecase_responses')
    .delete()
    .eq('usecase_id', usecaseId)
  if (responsesError) {
    logCleanup(`usecase_responses : ${responsesError.message}`)
  } else {
    logCleanup('usecase_responses supprimées.')
  }

  const { data: dossierRows, error: dossiersFetchError } = await admin
    .from('dossiers')
    .select('id')
    .eq('usecase_id', usecaseId)

  if (dossiersFetchError) {
    logCleanup(`Lecture dossiers : ${dossiersFetchError.message}`)
  } else {
    const dossierIds = (dossierRows ?? []).map((row) => row.id as string).filter(Boolean)
    if (dossierIds.length > 0) {
      const { error: docsError } = await admin
        .from('dossier_documents')
        .delete()
        .in('dossier_id', dossierIds)
      if (docsError) {
        logCleanup(`dossier_documents : ${docsError.message}`)
      } else {
        logCleanup(`dossier_documents supprimés (${dossierIds.length} dossier(s)).`)
      }

      const { error: dossiersError } = await admin.from('dossiers').delete().eq('usecase_id', usecaseId)
      if (dossiersError) {
        logCleanup(`dossiers : ${dossiersError.message}`)
      } else {
        logCleanup('dossiers supprimés.')
      }
    } else {
      logCleanup('Aucun dossier_documents à supprimer.')
    }
  }

  const { error: usecaseError } = await admin.from('usecases').delete().eq('id', usecaseId)
  if (usecaseError) {
    logCleanup(`usecases : ${usecaseError.message}`)
  } else {
    logCleanup('usecase supprimé.')
  }

  if (companyId) {
    const { error: companyError } = await admin.from('companies').delete().eq('id', companyId)
    if (companyError) {
      logCleanup(`companies : ${companyError.message}`)
    } else {
      logCleanup(`company temporaire supprimée : ${companyId}`)
    }
  }
}

async function main() {
  logSeed('Initialisation client Supabase (Service Role — bypass RLS)…')
  const admin = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let usecaseId: string | null = null
  let companyId: string | null = null

  try {
    // ─── Phase 1 — Seeding ───────────────────────────────────────────────────
    logSeed('Phase 1 — création company + usecase + réponses pivot…')

    const { data: company, error: companyError } = await admin
      .from('companies')
      .insert({ name: `${SANITY_COMPANY_PREFIX} ${Date.now()}`, maydai_as_registry: false })
      .select('id')
      .single()

    if (companyError || !company?.id) {
      throw new Error(`Insertion company : ${companyError?.message ?? 'id absent'}`)
    }
    companyId = company.id
    logSeed(`Company créée : ${companyId}`)

    const nowIso = new Date().toISOString()
    const { data: usecase, error: usecaseError } = await admin
      .from('usecases')
      .insert({
        company_id: companyId,
        name: SANITY_USECASE_NAME,
        deployment_phase: 'en_projet',
        path_mode: 'long',
        questionnaire_version: QUESTIONNAIRE_VERSION_V3,
        checklist_gov_enterprise: [],
        checklist_gov_usecase: [],
      })
      .select('id')
      .single()

    if (usecaseError || !usecase?.id) {
      throw new Error(`Insertion usecase : ${usecaseError?.message ?? 'id absent'}`)
    }
    usecaseId = usecase.id
    logSeed(`Usecase créé : ${usecaseId}`)

    const seedRows = [
      {
        usecase_id: usecaseId,
        question_code: QUESTION_ROLE,
        single_value: ROLE_VALUE,
        answered_by: SANITY_USER_EMAIL,
        answered_at: nowIso,
        metadata: {},
      },
      {
        usecase_id: usecaseId,
        question_code: QUESTION_TARGET,
        single_value: NEGATIVE_VALUE,
        answered_by: SANITY_USER_EMAIL,
        answered_at: nowIso,
        metadata: {},
      },
    ]

    const { error: responsesInsertError } = await admin.from('usecase_responses').insert(seedRows)
    if (responsesInsertError) {
      throw new Error(`Insertion usecase_responses : ${responsesInsertError.message}`)
    }

    logSuccess('Phase 1 terminée — réponses seedées', {
      [QUESTION_ROLE]: ROLE_VALUE,
      [QUESTION_TARGET]: NEGATIVE_VALUE,
    })

    // ─── Phase 2 — Sync (écrasement + metadata) ──────────────────────────────
    logSync(`Phase 2 — syncTodoActionToResponse('${TODO_ACTION}')…`)
    const syncResult = await syncTodoActionToResponse(
      admin,
      usecaseId,
      TODO_ACTION,
      SANITY_USER_EMAIL
    )
    logSync('Résultat sync', syncResult)

    const afterSync = await fetchTargetResponse(admin, usecaseId)
    if (!afterSync) {
      throw new Error(`Phase 2 : aucune ligne ${QUESTION_TARGET} après sync.`)
    }

    const originalAfterSync = extractOriginalValue(afterSync.metadata)
    if (afterSync.single_value !== POSITIVE_VALUE) {
      throw new Error(
        `Phase 2 : single_value attendu ${POSITIVE_VALUE}, reçu ${afterSync.single_value ?? 'null'}`
      )
    }
    if (originalAfterSync !== NEGATIVE_VALUE) {
      throw new Error(
        `Phase 2 : metadata.original_value attendu ${NEGATIVE_VALUE}, reçu ${originalAfterSync ?? 'null'}`
      )
    }

    logSuccess('Phase 2 validée — écrasement OUI + original_value préservé', {
      single_value: afterSync.single_value,
      metadata: afterSync.metadata,
    })

    // ─── Phase 3 — Reverse (reset asymétrique) ───────────────────────────────
    logSync(`Phase 3 — reverseTodoActionResponse('${TODO_ACTION}')…`)
    const reverseResult = await reverseTodoActionResponse(
      admin,
      usecaseId,
      TODO_ACTION,
      SANITY_USER_EMAIL
    )
    logSync('Résultat reverse', reverseResult)

    const afterReverse = await fetchTargetResponse(admin, usecaseId)
    if (!afterReverse) {
      throw new Error(`Phase 3 : aucune ligne ${QUESTION_TARGET} après reverse.`)
    }

    if (afterReverse.single_value !== NEGATIVE_VALUE) {
      throw new Error(
        `Phase 3 : single_value attendu ${NEGATIVE_VALUE}, reçu ${afterReverse.single_value ?? 'null'}`
      )
    }
    if (!isEmptyMetadata(afterReverse.metadata)) {
      throw new Error(
        `Phase 3 : metadata attendu {}, reçu ${JSON.stringify(afterReverse.metadata)}`
      )
    }

    logSuccess('Phase 3 validée — restauration Non + metadata vidée', {
      single_value: afterReverse.single_value,
      metadata: afterReverse.metadata,
    })

    console.log('')
    logSuccess(
      'Sanity check P0.2 PROD — toutes les assertions sont valides. Plateforme mathématiquement prouvée.'
    )
  } finally {
    console.log('')
    logCleanup('Phase 4 — nettoyage destructif (try/finally)…')
    await cleanupSanityEntities(admin, usecaseId, companyId)
    logCleanup('Nettoyage terminé.')
  }
}

main().catch((error: unknown) => {
  logError('Sanity check interrompu', error)
  process.exit(1)
})

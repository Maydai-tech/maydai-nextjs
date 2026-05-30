import { test, expect } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAdminClient } from '../_helpers/supabase-admin'
import { seedV2Usecase, cleanupTestData, type V2TestData } from '../_helpers/v2-test-data'

/**
 * Impact modèle COMPL-AI sur le barème V3 : association via API (PUT /api/usecases/[id]),
 * pas d’appel Google/OpenAI — le calcul lit uniquement `compl_ai_evaluations` en base.
 *
 * Note produit : la colonne `score_base` persiste le questionnaire seul ; la pondération
 * modèle va dans `score_model` et le barème combiné dans `score_final`.
 * L’API n’expose pas PATCH sur ce handler : on utilise PUT avec `{ primary_model_id }`.
 */

const V3_STANDARD_CHECKLIST_GOV_USECASE = [
  'E4.N7.Q1.B',
  'E4.N7.Q1.2.A',
  'E4.N7.Q3.E',
  'E4.N7.Q3.1.E',
  'E4.N7.Q2.1.E',
  'E4.N7.Q2.G',
  'E4.N8.Q9.B',
  'E4.N8.Q9.1.B',
  'E4.N8.Q11.0.B',
  'E4.N8.Q10.A',
  'E4.N8.Q12.B',
  'E6.N10.Q1.B',
  'E6.N10.Q3.C',
] as const

const V3_STANDARD_CHECKLIST_GOV_ENTERPRISE = [
  'E5.N9.Q5.A',
  'E5.N9.Q6.B',
  'E5.N9.Q1.A',
  'E5.N9.Q7.B',
  'E5.N9.Q4.A',
  'E5.N9.Q8.B',
  'E5.N9.Q9.B',
  'E5.N9.Q3.B',
] as const

/** UUID historique E2E (Gemini) — présent si la base est alignée avec les seeds COMPL-AI. */
const LEGACY_E2E_GEMINI_MODEL_ID = 'c4ebe815-b69b-4da2-b366-20dce7349782'

/** Résout un UUID `compl_ai_models` avec des scores COMPL-AI (cible type google / gemini-1.5-pro). */
async function resolveComplAiModelIdForE2e(admin: SupabaseClient): Promise<string | null> {
  const fromEnv = process.env.E2E_COMPL_AI_MODEL_ID?.trim()
  if (fromEnv) {
    const { data: ok } = await admin.from('compl_ai_models').select('id').eq('id', fromEnv).maybeSingle()
    if (ok?.id) return ok.id
  }

  async function hasEvaluations(modelId: string): Promise<boolean> {
    const { count, error } = await admin
      .from('compl_ai_evaluations')
      .select('id', { count: 'exact', head: true })
      .eq('model_id', modelId)
      .not('score', 'is', null)
    if (error) return false
    return (count ?? 0) > 0
  }

  const { data: legacy } = await admin
    .from('compl_ai_models')
    .select('id')
    .eq('id', LEGACY_E2E_GEMINI_MODEL_ID)
    .maybeSingle()
  if (legacy?.id && (await hasEvaluations(legacy.id))) return legacy.id

  const { data: byName } = await admin
    .from('compl_ai_models')
    .select('id, model_name, model_provider')
    .ilike('model_name', '%gemini%1.5%pro%')
    .limit(25)

  const preferred = (byName ?? []).filter((row) => (row.model_provider ?? '').toLowerCase().includes('google'))
  for (const row of preferred.length > 0 ? preferred : byName ?? []) {
    if (await hasEvaluations(row.id)) return row.id
  }

  const { data: anyWithScores } = await admin
    .from('compl_ai_evaluations')
    .select('model_id')
    .not('score', 'is', null)
    .limit(1)
    .maybeSingle()

  return anyWithScores?.model_id ?? null
}

test.describe.skip('Scoring V3 — association modèle COMPL-AI', () => {
  test('persiste primary_model_id via API et intègre le modèle au calcul (score_model / score_final) @API @Scoring', async ({
    request,
  }) => {
    const supabaseAdmin = getAdminClient()
    const modelId = await resolveComplAiModelIdForE2e(supabaseAdmin)
    test.skip(!modelId, 'Aucun modèle COMPL-AI avec évaluations en base (seed admin ou E2E_COMPL_AI_MODEL_ID).')

    let testData: V2TestData | null = null

    try {
      testData = await seedV2Usecase(supabaseAdmin, 'score-ai-model')

      const { error: v3Err } = await supabaseAdmin
        .from('usecases')
        .update({
          questionnaire_version: 3,
          path_mode: 'long',
        })
        .eq('id', testData.usecaseId)

      expect(v3Err).toBeNull()

      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: testData.email,
        password: 'TestPassword123!',
      })

      expect(authError).toBeNull()
      const jwtToken = authData.session?.access_token
      expect(jwtToken).toBeTruthy()

      const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
      const authHeaders = {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      }

      const resChecklists = await request.post(`${baseUrl}/api/usecases/${testData.usecaseId}/responses`, {
        headers: authHeaders,
        data: {
          checklist_gov_enterprise: [...V3_STANDARD_CHECKLIST_GOV_ENTERPRISE],
          checklist_gov_usecase: [...V3_STANDARD_CHECKLIST_GOV_USECASE],
        },
      })
      expect(resChecklists.ok(), await resChecklists.text()).toBe(true)

      for (const [code, value] of [
        ['E7.N11.Q1', 'E7.N11.Q1.B'],
        ['E7.N11.Q2', 'E7.N11.Q2.B'],
      ] as const) {
        const r = await request.post(`${baseUrl}/api/usecases/${testData.usecaseId}/responses`, {
          headers: authHeaders,
          data: { question_code: code, response_value: value },
        })
        expect(r.ok(), await r.text()).toBe(true)
      }

      const resNoModel = await request.post(`${baseUrl}/api/usecases/${testData.usecaseId}/calculate-score`, {
        headers: authHeaders,
        data: { path_mode: 'long' },
      })
      expect(resNoModel.ok(), await resNoModel.text()).toBe(true)

      const { data: beforeRow } = await supabaseAdmin
        .from('usecases')
        .select('score_base, score_model, score_final, primary_model_id')
        .eq('id', testData.usecaseId)
        .single()

      expect(beforeRow?.primary_model_id).toBeNull()
      expect(beforeRow?.score_model).toBeNull()

      const putRes = await request.put(`${baseUrl}/api/usecases/${testData.usecaseId}`, {
        headers: authHeaders,
        data: { primary_model_id: modelId },
      })
      expect(putRes.ok(), await putRes.text()).toBe(true)
      const putBody = (await putRes.json()) as { primary_model_id?: string }
      expect(putBody.primary_model_id).toBe(modelId)

      const resWithModel = await request.post(`${baseUrl}/api/usecases/${testData.usecaseId}/calculate-score`, {
        headers: authHeaders,
        data: { path_mode: 'long' },
      })
      expect(resWithModel.ok(), await resWithModel.text()).toBe(true)

      const { data: afterRow, error: afterErr } = await supabaseAdmin
        .from('usecases')
        .select('is_eliminated, score_base, score_model, score_final, primary_model_id')
        .eq('id', testData.usecaseId)
        .single()

      expect(afterErr).toBeNull()
      expect(afterRow?.is_eliminated).toBe(false)
      expect(afterRow?.primary_model_id).toBe(modelId)

      expect(afterRow?.score_base).not.toBeNull()
      expect(Number(afterRow?.score_base)).toBeGreaterThan(0)

      expect(afterRow?.score_model).not.toBeNull()
      expect(Number(afterRow?.score_model)).toBeGreaterThan(0)

      expect(afterRow?.score_final).not.toBeNull()
      expect(Number(afterRow?.score_final)).not.toBe(0)

      expect(Number(afterRow?.score_final)).not.toBe(Number(beforeRow?.score_final))
    } finally {
      if (testData) {
        await cleanupTestData(getAdminClient(), testData)
      }
    }
  })
})

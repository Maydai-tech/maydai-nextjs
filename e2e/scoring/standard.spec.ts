import { test, expect } from '@playwright/test'
import { getAdminClient } from '../_helpers/supabase-admin'
import { seedV2Usecase, cleanupTestData, type V2TestData } from '../_helpers/v2-test-data'

/**
 * Parcours V3 long cohérent avec {@link app/usecases/[id]/utils/questionnaire-v3-graph.ts} :
 * rôle déployeur (E4.N7.Q1.B → Q1.2), sorties ORS « aucune » (Q3.E, Q3.1.E, Q2.1.E),
 * Annexe III « aucun domaine » (Q2.G), branche N8 simplifiée (Q11.0.B → Q10 → Q12),
 * gouvernance E5 / transparence E6 via checklists, fin E7 en POST classique.
 *
 * Les blocs E4/E5/E6 ne sont plus persistés en `usecase_responses` : uniquement
 * `checklist_gov_enterprise` / `checklist_gov_usecase` via POST /responses.
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

test.describe.skip('Moteur de calcul — cas standard V3 (non éliminatoire)', { tag: ['@prod'] }, () => {
  test('doit produire score_base > 0 et is_eliminated false via API @API @Scoring', async ({
    request,
  }) => {
    const supabaseAdmin = getAdminClient()
    let testData: V2TestData | null = null

    try {
      testData = await seedV2Usecase(supabaseAdmin, 'score-calculation-api')

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

      const resE7q1 = await request.post(`${baseUrl}/api/usecases/${testData.usecaseId}/responses`, {
        headers: authHeaders,
        data: {
          question_code: 'E7.N11.Q1',
          response_value: 'E7.N11.Q1.B',
        },
      })
      expect(resE7q1.ok(), await resE7q1.text()).toBe(true)

      const resE7q2 = await request.post(`${baseUrl}/api/usecases/${testData.usecaseId}/responses`, {
        headers: authHeaders,
        data: {
          question_code: 'E7.N11.Q2',
          response_value: 'E7.N11.Q2.B',
        },
      })
      expect(resE7q2.ok(), await resE7q2.text()).toBe(true)

      const resScore = await request.post(`${baseUrl}/api/usecases/${testData.usecaseId}/calculate-score`, {
        headers: authHeaders,
        data: { path_mode: 'long' },
      })
      expect(resScore.ok(), await resScore.text()).toBe(true)

      const { data: dbUsecase, error: dbError } = await supabaseAdmin
        .from('usecases')
        .select('is_eliminated, score_base')
        .eq('id', testData.usecaseId)
        .single()

      expect(dbError).toBeNull()
      expect(dbUsecase?.is_eliminated).toBe(false)
      expect(dbUsecase?.score_base).toBeDefined()
      expect(Number(dbUsecase?.score_base)).toBeGreaterThan(0)
    } finally {
      if (testData) {
        await cleanupTestData(getAdminClient(), testData)
      }
    }
  })
})

import { test, expect } from '@playwright/test'
import { getAdminClient } from './_helpers/supabase-admin'
import { seedV2Usecase, cleanupTestData, type V2TestData } from './_helpers/v2-test-data'

/**
 * Élimination : option E4.N7.Q2.1.A sur la question E4.N7.Q2.1.
 * Prérequis V2 : sans réponses pour E4.N7.Q1 → … → E4.N7.Q2, la question E4.N7.Q2.1
 * n’entre pas dans `scoringActiveQuestionCodes` (graphe ORS) — on insère donc le chemin minimal.
 */

test.describe('Moteur de calcul - Élimination AI Act', () => {
  test('doit bloquer le score et marquer is_eliminated à true si pratique interdite @API @Scoring', async ({
    request,
  }) => {
    const supabaseAdmin = getAdminClient()
    let testData: V2TestData | null = null

    try {
      testData = await seedV2Usecase(supabaseAdmin, 'elimination-test')

      const answeredAt = new Date().toISOString()
      const { email, usecaseId } = testData

      const { error: insertError } = await supabaseAdmin.from('usecase_responses').insert([
        {
          usecase_id: usecaseId,
          question_code: 'E4.N7.Q1',
          single_value: 'E4.N7.Q1.A',
          answered_by: email,
          answered_at: answeredAt,
        },
        {
          usecase_id: usecaseId,
          question_code: 'E4.N7.Q1.1',
          single_value: 'E4.N7.Q1.1.A',
          answered_by: email,
          answered_at: answeredAt,
        },
        {
          usecase_id: usecaseId,
          question_code: 'E4.N7.Q2',
          multiple_codes: ['E4.N7.Q2.G'],
          multiple_labels: ['E4.N7.Q2.G'],
          answered_by: email,
          answered_at: answeredAt,
        },
        {
          usecase_id: usecaseId,
          question_code: 'E4.N7.Q2.1',
          multiple_codes: ['E4.N7.Q2.1.A'],
          multiple_labels: ['E4.N7.Q2.1.A'],
          answered_by: email,
          answered_at: answeredAt,
        },
      ])

      expect(insertError).toBeNull()

      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: testData.email,
        password: 'TestPassword123!',
      })

      expect(authError).toBeNull()
      const jwtToken = authData.session?.access_token
      expect(jwtToken).toBeTruthy()

      const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
      const response = await request.post(`${baseUrl}/api/usecases/${usecaseId}/calculate-score`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        data: { path_mode: 'long' },
      })

      expect(response.ok()).toBe(true)

      const { data: dbUsecase, error: dbError } = await supabaseAdmin
        .from('usecases')
        .select('is_eliminated, score_base, elimination_reason')
        .eq('id', usecaseId)
        .single()

      expect(dbError).toBeNull()

      expect(dbUsecase?.is_eliminated).toBe(true)
      expect(dbUsecase?.score_base).toBe(0)

      console.log(`✅ Test AI Act passé. Motif d'élimination détecté : ${dbUsecase?.elimination_reason}`)
    } finally {
      if (testData) {
        await cleanupTestData(getAdminClient(), testData)
      }
    }
  })
})

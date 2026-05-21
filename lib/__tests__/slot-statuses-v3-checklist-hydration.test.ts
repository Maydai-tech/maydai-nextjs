import { mergeChecklistIntoDbResponseRows } from '@/lib/merge-checklist-into-user-responses'
import { computeSlotStatuses } from '@/lib/slot-statuses'
import {
  mergeShortPathPacksIntoResponses,
  transformToOpenAIFormatComplete,
} from '@/lib/openai-data-transformer'
import { QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'

/** Repro cas réel `8ec18dfb-2dd4-46c5-a009-949f3fda770a` — réponses E5 dans checklist, pas dans le graphe ORS. */
const CHECKLIST_ENTERPRISE = [
  'E5.N9.Q5.A',
  'E5.N9.Q7.B',
  'E5.N9.Q1.B',
  'E5.N9.Q3.B',
  'E5.N9.Q4.B',
  'E5.N9.Q6.A',
  'E5.N9.Q8.A',
  'E5.N9.Q9.A',
  'E4.N8.Q12.A',
]

describe('slot-statuses — V3 checklist E5/E6 hors active_question_codes ORS', () => {
  /** Données MCP Supabase — usecase `8ec18dfb-2dd4-46c5-a009-949f3fda770a` */
  const DB_RESPONSES = [
    { question_code: 'E7.N11.Q1', single_value: 'E7.N11.Q1.A' },
    { question_code: 'E7.N11.Q2', single_value: 'E7.N11.Q2.A' },
    { question_code: 'V3_SHORT_ENTREPRISE', multiple_codes: ['E5.N9.Q7.B'] },
    { question_code: 'V3_SHORT_SOCIAL_ENV', multiple_codes: [] as string[] },
    { question_code: 'V3_SHORT_TRANSPARENCE', multiple_codes: ['E6.N10.Q3.C'] },
    { question_code: 'V3_SHORT_USAGE', multiple_codes: ['E5.N9.Q3.A'] },
  ]
  const PERSISTED = new Set(DB_RESPONSES.map((r) => r.question_code))

  test('quick_win_1 (registre) et quick_win_3 (instructions) → OUI après fusion checklist', () => {
    const unified = mergeChecklistIntoDbResponseRows([], CHECKLIST_ENTERPRISE, [])
    const statuses = computeSlotStatuses(unified, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      activeQuestionCodes: ['E4.N7.Q1'],
      persistedQuestionCodes: new Set(),
    })
    expect(statuses.quick_win_1).toBe('OUI')
    expect(statuses.quick_win_3).toBe('OUI')
  })

  test('transformToOpenAIFormatComplete conserve user_response E5 malgré active_question_codes réduit', () => {
    const unified = mergeChecklistIntoDbResponseRows([], CHECKLIST_ENTERPRISE, [])
    const out = transformToOpenAIFormatComplete(
      {
        id: '8ec18dfb-2dd4-46c5-a009-949f3fda770a',
        name: 'Assistant SAV',
        status: 'completed',
        risk_level: 'minimal',
      },
      { name: 'C', industry: 'i', city: 'x', country: 'FR' },
      null,
      unified,
      'user@test.com',
      {
        questionnaire_version: QUESTIONNAIRE_VERSION_V3,
        bpgv_variant: 'minimal',
        ors_exit: null,
        active_question_codes: ['E4.N7.Q1'],
        persisted_question_codes: [],
      }
    )
    expect(out.questionnaire_questions['E5.N9.Q7']?.user_response?.single_value).toBe('E5.N9.Q7.B')
    expect(out.questionnaire_questions['E5.N9.Q3']?.user_response?.single_value).toBe('E5.N9.Q3.B')
    expect(out.questionnaire_questions['E5.N9.Q7']?.hors_parcours_questionnaire_v2).toBe(false)
  })

  test('données MCP réelles : packs V3_SHORT + checklist → OUI registre et instructions', () => {
    const unified = mergeChecklistIntoDbResponseRows(DB_RESPONSES, CHECKLIST_ENTERPRISE, [
      'E6.N10.Q1.A',
      'E6.N10.Q2.A',
      'E6.N10.Q3.C',
      'E7.N11.Q1.A',
    ])
    const slotReady = mergeShortPathPacksIntoResponses(unified)
    const statuses = computeSlotStatuses(slotReady, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      activeQuestionCodes: ['E4.N7.Q1'],
      persistedQuestionCodes: PERSISTED,
    })
    expect(statuses.quick_win_1).toBe('OUI')
    expect(statuses.quick_win_3).toBe('OUI')
  })

  test('packs V3_SHORT seuls (sans checklist) : E5.N9.Q3.A tag → OUI instructions', () => {
    const slotReady = mergeShortPathPacksIntoResponses(DB_RESPONSES)
    expect(slotReady.some((r) => r.question_code === 'E5.N9.Q7')).toBe(true)
    expect(slotReady.some((r) => r.question_code === 'E5.N9.Q3')).toBe(true)
    const statuses = computeSlotStatuses(slotReady, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      activeQuestionCodes: ['E4.N7.Q1'],
      persistedQuestionCodes: PERSISTED,
    })
    expect(statuses.quick_win_1).toBe('OUI')
    expect(statuses.quick_win_3).toBe('OUI')
  })
})

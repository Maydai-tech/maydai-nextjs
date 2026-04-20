import { buildV3ScoringContextFromDbResponses } from '@/lib/scoring-v3-server'
import { QUESTIONNAIRE_VERSION_V2, QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'

describe('buildV3ScoringContextFromDbResponses', () => {
  it('retourne null si ce n’est pas la version 3 (non-régression V2)', () => {
    expect(buildV3ScoringContextFromDbResponses(QUESTIONNAIRE_VERSION_V2, [], null)).toBeNull()
    expect(buildV3ScoringContextFromDbResponses(1, [], null)).toBeNull()
  })

  it('V3 sans réponses : chemin actif réduit à la première question', () => {
    const ctx = buildV3ScoringContextFromDbResponses(QUESTIONNAIRE_VERSION_V3, [], null)
    expect(ctx).not.toBeNull()
    expect(ctx!.active_question_codes).toEqual(['E4.N7.Q1'])
    expect(ctx!.bpgv_variant).toBeNull()
    expect(ctx!.ors_exit).toBeNull()
  })

  it('V3 : scoringActiveQuestionCodes est inclus dans le chemin actif', () => {
    const ctx = buildV3ScoringContextFromDbResponses(
      QUESTIONNAIRE_VERSION_V3,
      [{ question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B' }],
      null
    )
    expect(ctx).not.toBeNull()
    expect(ctx!.active_question_codes[0]).toBe('E4.N7.Q1')
    expect(ctx!.scoringActiveQuestionCodes.has('E4.N7.Q1')).toBe(true)
  })

  it('V3 pathMode court : inclut dans scoringActiveQuestionCodes les E4 présents dans answers même hors chemin actif (malus N8 non ignorés)', () => {
    const rows = [
      { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B' },
      { question_code: 'E4.N7.Q1.2', single_value: 'E4.N7.Q1.2.A' },
      { question_code: 'E4.N7.Q3', multiple_codes: ['E4.N7.Q3.E'] },
      { question_code: 'E4.N7.Q3.1', multiple_codes: ['E4.N7.Q3.1.A'] },
      { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.A' },
      { question_code: 'V3_SHORT_ENTREPRISE', multiple_codes: ['E5.N9.Q1.A'] },
    ]
    const ctx = buildV3ScoringContextFromDbResponses(QUESTIONNAIRE_VERSION_V3, rows as never[], null, 'short')
    expect(ctx).not.toBeNull()
    expect(ctx!.active_question_codes).not.toContain('E4.N8.Q9')
    expect(ctx!.scoringActiveQuestionCodes.has('E4.N8.Q9')).toBe(true)
  })

  it('V3 pathMode short : le chemin actif s’arrête après le bloc ORS, mais E5.N9.* persisté est inclus au périmètre score (checklists / fantômes)', () => {
    const rows = [
      { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B' },
      { question_code: 'E4.N7.Q1.2', single_value: 'E4.N7.Q1.2.A' },
      { question_code: 'E4.N7.Q3', multiple_codes: ['E4.N7.Q3.E'] },
      { question_code: 'E4.N7.Q3.1', multiple_codes: ['E4.N7.Q3.1.E'] },
      { question_code: 'E4.N7.Q2.1', multiple_codes: ['E4.N7.Q2.1.E'] },
      { question_code: 'E4.N7.Q2', multiple_codes: ['E4.N7.Q2.G'] },
      { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.B' },
      { question_code: 'E4.N8.Q9.1', single_value: 'E4.N8.Q9.1.B' },
      { question_code: 'E4.N8.Q11.0', single_value: 'E4.N8.Q11.0.B' },
      { question_code: 'E4.N8.Q10', single_value: 'E4.N8.Q10.A' },
      { question_code: 'E5.N9.Q1', single_value: 'E5.N9.Q1.A' },
    ]
    const ctx = buildV3ScoringContextFromDbResponses(QUESTIONNAIRE_VERSION_V3, rows as never[], null, 'short')
    expect(ctx).not.toBeNull()
    expect(ctx!.active_question_codes).not.toContain('E5.N9.Q1')
    expect(ctx!.active_question_codes).toContain('E4.N8.Q10')
    expect(ctx!.scoringActiveQuestionCodes.has('E5.N9.Q1')).toBe(true)
  })

  it.skip('V3 pathMode short : inclut E6.N10.Q1 / Q2 dans scoringActiveQuestionCodes si présents en base (dérivés du pack transparence)', () => {
    const rows = [
      { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B' },
      { question_code: 'E4.N7.Q1.2', single_value: 'E4.N7.Q1.2.A' },
      { question_code: 'E4.N7.Q3', multiple_codes: ['E4.N7.Q3.E'] },
      { question_code: 'E4.N7.Q3.1', multiple_codes: ['E4.N7.Q3.1.E'] },
      { question_code: 'E4.N7.Q2.1', multiple_codes: ['E4.N7.Q2.1.E'] },
      { question_code: 'E4.N7.Q2', multiple_codes: ['E4.N7.Q2.G'] },
      { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.B' },
      { question_code: 'E4.N8.Q9.1', single_value: 'E4.N8.Q9.1.B' },
      { question_code: 'E4.N8.Q11.0', single_value: 'E4.N8.Q11.0.B' },
      { question_code: 'E4.N8.Q10', single_value: 'E4.N8.Q10.A' },
      {
        question_code: 'V3_SHORT_TRANSPARENCE',
        multiple_codes: [
          'E6.N10.TRANSPARENCY_PACK.INTERACTION',
          'E6.N10.TRANSPARENCY_PACK.CONTENT',
        ],
      },
      { question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.A' },
      { question_code: 'E6.N10.Q2', single_value: 'E6.N10.Q2.A' },
    ]
    const ctx = buildV3ScoringContextFromDbResponses(QUESTIONNAIRE_VERSION_V3, rows as never[], null, 'short')
    expect(ctx).not.toBeNull()
    expect(ctx!.scoringActiveQuestionCodes.has('E6.N10.Q1')).toBe(true)
    expect(ctx!.scoringActiveQuestionCodes.has('E6.N10.Q2')).toBe(true)
    expect(ctx!.categoryMaxScores.transparency).toBeGreaterThan(0)
  })
})

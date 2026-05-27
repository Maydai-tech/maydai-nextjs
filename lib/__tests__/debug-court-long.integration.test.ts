/**
 * Intégration court → long : POST (checklists + dépliage) puis GET (merge).
 * Reproduit le scénario utilisateur sans navigateur.
 */

import {
  assertLongKeysPopulated,
  logFormattedAnswersSnapshot,
  REQUIRED_LONG_KEYS_AFTER_MERGE,
  scoreShortPath,
  simulateGetResponsesAfterMerge,
  simulateHumanOversightValidation,
  simulateShortPathSavePipeline,
  shortPathPivotRows,
} from '@/lib/debug-court-long-pipeline'
import { mergeChecklistIntoDbResponseRows } from '@/lib/merge-checklist-into-user-responses'
import { dbResponsesToQuestionnaireAnswers } from '@/lib/scoring-v2-server'

describe('debug court → long (intégration pipeline)', () => {
  test('checklists + merge GET peuplent E4.N7.Q1, E5.N9.Q1, E6.N10.Q1', () => {
    const { usecaseResponses, checklists } = simulateShortPathSavePipeline(shortPathPivotRows())

    expect(checklists.checklist_gov_usecase).toEqual(
      expect.arrayContaining(['E4.N7.Q1.B'])
    )
    expect(checklists.checklist_gov_enterprise).toEqual(
      expect.arrayContaining(['E5.N9.Q1.A', 'E5.N9.Q7.B'])
    )

    const { formattedAnswers } = simulateGetResponsesAfterMerge(usecaseResponses, checklists)
    logFormattedAnswersSnapshot('formattedAnswers après merge (mode short)', formattedAnswers)

    assertLongKeysPopulated(formattedAnswers)
    expect(formattedAnswers['E4.N7.Q1']).toBe('E4.N7.Q1.B')
    expect(formattedAnswers['E5.N9.Q1']).toBe('E5.N9.Q1.A')
    expect(formattedAnswers['E5.N9.Q3']).toBe('E5.N9.Q3.B')
    expect(formattedAnswers['E6.N10.Q1']).toBe('E6.N10.Q1.B')
  })

  test('ligne usecase_responses vide E4.N7.Q1 ne bloque plus l’hydratation checklist', () => {
    const { checklists } = simulateShortPathSavePipeline(shortPathPivotRows())
    const staleRows = [
      { question_code: 'E4.N7.Q1', single_value: null, multiple_codes: null },
      { question_code: 'V3_SHORT_ENTREPRISE', single_value: null, multiple_codes: ['E5.N9.Q7.B'] },
    ]
    const { formattedAnswers } = simulateGetResponsesAfterMerge(staleRows, checklists)
    expect(formattedAnswers['E4.N7.Q1']).toBe('E4.N7.Q1.B')
  })

  test('bascule long : mêmes clés longues peuplées après merge', () => {
    const saved = simulateShortPathSavePipeline(shortPathPivotRows())
    const afterShort = simulateGetResponsesAfterMerge(saved.usecaseResponses, saved.checklists)
    assertLongKeysPopulated(afterShort.formattedAnswers)

    const afterHuman = simulateHumanOversightValidation(saved.fullMergedAnswers)
    const checklistsLong = {
      checklist_gov_enterprise: [
        ...new Set([
          ...saved.checklists.checklist_gov_enterprise.filter((c) => !c.startsWith('E5.N9.Q8')),
          'E5.N9.Q8.B',
        ]),
      ],
      checklist_gov_usecase: saved.checklists.checklist_gov_usecase,
    }
    const mergedLong = mergeChecklistIntoDbResponseRows(
      saved.usecaseResponses,
      checklistsLong.checklist_gov_enterprise,
      checklistsLong.checklist_gov_usecase
    )
    const formattedLong = dbResponsesToQuestionnaireAnswers(mergedLong)
    logFormattedAnswersSnapshot('formattedAnswers mode long (après merge)', formattedLong)

    for (const key of REQUIRED_LONG_KEYS_AFTER_MERGE) {
      expect(formattedLong[key]).toBeTruthy()
    }
    expect(formattedLong['E5.N9.Q8']).toBe('E5.N9.Q8.B')
    expect(afterHuman['E5.N9.Q8']).toBe('E5.N9.Q8.B')
  })

  test('score augmente après validation contrôle humain (E5.N9.Q8)', () => {
    const saved = simulateShortPathSavePipeline(shortPathPivotRows(), {
      usage: ['E5.N9.Q3.A', 'E5.N9.Q4.A', 'E5.N9.Q6.B', 'E5.N9.Q8.A', 'E5.N9.Q9.B'],
    })
    const beforeMerge = simulateGetResponsesAfterMerge(saved.usecaseResponses, saved.checklists)
    const scoreBefore = scoreShortPath(beforeMerge.mergedRows, 'short')

    const afterHuman = simulateHumanOversightValidation(saved.fullMergedAnswers)
    const checklistsAfter = {
      ...saved.checklists,
      checklist_gov_enterprise: [
        ...saved.checklists.checklist_gov_enterprise.filter((c) => c !== 'E5.N9.Q8.A'),
        'E5.N9.Q8.B',
      ],
    }
    const afterMerge = simulateGetResponsesAfterMerge(saved.usecaseResponses, checklistsAfter)
    const scoreAfter = scoreShortPath(afterMerge.mergedRows, 'short')

     
    console.log('score_base avant/après contrôle humain:', scoreBefore.scoreBase, '→', scoreAfter.scoreBase)

    expect(scoreAfter.scoreBase).toBeGreaterThan(scoreBefore.scoreBase)
    expect(scoreAfter.scoreBase).toBeGreaterThanOrEqual(38)
  })
})

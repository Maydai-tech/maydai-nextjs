#!/usr/bin/env npx ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node"}'
/**
 * Script local : prouve le pipeline court → long (dépliage + merge GET).
 * Usage : npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/debug-court-long.ts
 * Ou : npm test -- debug-court-long.integration.test.ts
 */

import {
  assertLongKeysPopulated,
  logFormattedAnswersSnapshot,
  scoreShortPath,
  simulateGetResponsesAfterMerge,
  simulateHumanOversightValidation,
  simulateShortPathSavePipeline,
  shortPathPivotRows,
} from '../lib/debug-court-long-pipeline'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error('ASSERTION FAILED:', message)
    process.exit(1)
  }
}

async function main(): Promise<void> {
  console.log('🔬 debug-court-long — pipeline court → long\n')

  const saved = simulateShortPathSavePipeline(shortPathPivotRows())
  console.log('checklist_gov_enterprise:', saved.checklists.checklist_gov_enterprise)
  console.log('checklist_gov_usecase (extrait):', saved.checklists.checklist_gov_usecase.slice(0, 8), '...')

  const getShort = simulateGetResponsesAfterMerge(saved.usecaseResponses, saved.checklists)
  logFormattedAnswersSnapshot('GET merge (short)', getShort.formattedAnswers)

  try {
    assertLongKeysPopulated(getShort.formattedAnswers)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  assert(getShort.formattedAnswers['E4.N7.Q1'] === 'E4.N7.Q1.B', 'E4.N7.Q1 doit être E4.N7.Q1.B')
  assert(getShort.formattedAnswers['E5.N9.Q1'] === 'E5.N9.Q1.A', 'E5.N9.Q1 doit être E5.N9.Q1.A')
  assert(getShort.formattedAnswers['E6.N10.Q1'] === 'E6.N10.Q1.B', 'E6.N10.Q1 doit être E6.N10.Q1.B')

  const scoreBefore = scoreShortPath(getShort.mergedRows, 'short')
  const afterHuman = simulateHumanOversightValidation({
    ...saved.fullMergedAnswers,
    'E5.N9.Q8': 'E5.N9.Q8.A',
  })
  const checklistsHuman = {
    checklist_gov_enterprise: [
      ...saved.checklists.checklist_gov_enterprise.filter((c) => c !== 'E5.N9.Q8.B'),
      'E5.N9.Q8.B',
    ],
    checklist_gov_usecase: saved.checklists.checklist_gov_usecase,
  }
  const getLong = simulateGetResponsesAfterMerge(saved.usecaseResponses, checklistsHuman)
  const scoreAfter = scoreShortPath(getLong.mergedRows, 'long')

  logFormattedAnswersSnapshot('GET merge (long)', getLong.formattedAnswers)
  assertLongKeysPopulated(getLong.formattedAnswers)

  console.log('\nscore_base:', scoreBefore.scoreBase, '→', scoreAfter.scoreBase)
  assert(scoreAfter.scoreBase >= scoreBefore.scoreBase, 'Le score doit augmenter ou rester stable')
  assert(scoreAfter.scoreBase >= 38, `score_base attendu >= 38, reçu ${scoreAfter.scoreBase}`)

  console.log('\n✅ Toutes les assertions passent — mapping + merge OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

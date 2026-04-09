import { loadQuestions } from '@/app/usecases/[id]/utils/questions-loader'
import { RISK_CATEGORIES } from '@/app/usecases/[id]/utils/risk-categories'

function mapCategoryFromJson(jsonCategoryId: string): string {
  if (jsonCategoryId === 'human_oversight') return 'human_agency'
  return jsonCategoryId
}

/**
 * Max par catégorie (points perdables) en ne considérant qu’un sous-ensemble de questions (scoring V2).
 */
export function calculateMaxCategoryScoresForActiveQuestionCodes(
  activeQuestionCodes: Set<string>
): Record<string, number> {
  const questions = loadQuestions()
  const maxScores: Record<string, number> = {}

  Object.keys(RISK_CATEGORIES).forEach(categoryId => {
    maxScores[categoryId] = 0
  })

  Object.values(questions).forEach(question => {
    if (!activeQuestionCodes.has(question.id)) return

    if (question.type === 'radio' || question.type === 'conditional') {
      const categoryMaxImpacts: Record<string, number> = {}

      question.options.forEach(option => {
        if (option.category_impacts) {
          Object.entries(option.category_impacts).forEach(([jsonCategoryId, impact]) => {
            if (impact < 0) {
              const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
              if (maxScores[mappedCategoryId] !== undefined) {
                const absImpact = Math.abs(impact)
                categoryMaxImpacts[mappedCategoryId] = Math.max(
                  categoryMaxImpacts[mappedCategoryId] || 0,
                  absImpact
                )
              }
            }
          })
        }
      })

      Object.entries(categoryMaxImpacts).forEach(([categoryId, maxImpact]) => {
        maxScores[categoryId] += maxImpact
      })
    } else if (question.type === 'checkbox' || question.type === 'tags') {
      const isAnyMode = question.impact_mode === 'any'

      if (isAnyMode) {
        const categoryMaxImpacts: Record<string, number> = {}
        question.options.forEach(option => {
          if (option.category_impacts) {
            Object.entries(option.category_impacts).forEach(([jsonCategoryId, impact]) => {
              if (impact < 0) {
                const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
                if (maxScores[mappedCategoryId] !== undefined) {
                  const absImpact = Math.abs(impact)
                  categoryMaxImpacts[mappedCategoryId] = Math.max(
                    categoryMaxImpacts[mappedCategoryId] || 0,
                    absImpact
                  )
                }
              }
            })
          }
        })
        Object.entries(categoryMaxImpacts).forEach(([categoryId, maxImpact]) => {
          maxScores[categoryId] += maxImpact
        })
      } else {
        question.options.forEach(option => {
          if (option.category_impacts) {
            Object.entries(option.category_impacts).forEach(([jsonCategoryId, impact]) => {
              if (impact < 0) {
                const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
                if (maxScores[mappedCategoryId] !== undefined) {
                  maxScores[mappedCategoryId] += Math.abs(impact)
                }
              }
            })
          }
        })
      }
    }
  })

  return maxScores
}

/** Toutes les questions (équivalent historique V1). */
export function calculateMaxCategoryScoresForAllQuestions(): Record<string, number> {
  const questions = loadQuestions()
  return calculateMaxCategoryScoresForActiveQuestionCodes(new Set(Object.keys(questions)))
}

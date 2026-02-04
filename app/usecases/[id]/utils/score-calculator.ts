import { loadQuestions } from '../utils/questions-loader'
import { UseCaseScore, ScoreBreakdown, CategoryScore } from '../types/usecase'
import { RISK_CATEGORIES } from './risk-categories'
import { getUseCaseComplAiBonus, getMaydAiScoresByPrinciple } from './compl-ai-scoring'
import type { SupabaseClient } from '@supabase/supabase-js'

const BASE_SCORE = 90
const COMPL_AI_WEIGHT = 2.5           // Multiplicateur COMPL-AI (20 × 2.5 = 50 points max)
const MAX_WITH_COMPL_AI = 150         // Diviseur avec COMPL-AI (90 questionnaire + 50 COMPL-AI)
const MAX_WITHOUT_COMPL_AI = 90       // Max sans COMPL-AI (questionnaire seul)
const MAX_SCORE_PERCENTAGE = 100      // Score final affiché sur 100 avec COMPL-AI

// Constantes pour le calcul "Risque Cas d'Usage" (reverse engineering)
const BASE_GLOBALE_POINTS = 189.8       // Total des points max de toutes les catégories
const BASE_RISQUE_USE_CASE = 125        // Points max pour la catégorie "Risque Cas d'Usage"
const SIX_PRINCIPLES_IDS = [
  'human_agency',
  'technical_robustness',
  'privacy_data',
  'transparency',
  'diversity_fairness',
  'social_environmental'
] as const

/**
 * Calcule le score "Risque Cas d'Usage" par reverse engineering.
 * Le score global est la vérité terrain ; on déduit les points de risque pour que
 * (Points RiskUseCase + Points des 6 Principes) / BASE_GLOBALE_POINTS == Score Global %
 */
function calculateRiskUseCaseByReverseEngineering(
  globalScorePercent: number,
  categoryScores: CategoryScore[]
): { points: number; percentage: number; max_points: number } {
  const targetPoints = BASE_GLOBALE_POINTS * globalScorePercent
  const principlesPoints = categoryScores
    .filter(cat => SIX_PRINCIPLES_IDS.includes(cat.category_id as typeof SIX_PRINCIPLES_IDS[number]))
    .reduce((sum, cat) => sum + cat.score, 0)
  const riskUseCasePoints = targetPoints - principlesPoints
  const riskUseCasePercentRaw = riskUseCasePoints / BASE_RISQUE_USE_CASE
  const riskUseCasePercentClamped = Math.max(0, Math.min(1, riskUseCasePercentRaw))
  const riskUseCasePercentage = Math.round(riskUseCasePercentClamped * 10000) / 100
  const riskUseCasePointsClamped = Math.max(0, Math.min(BASE_RISQUE_USE_CASE, riskUseCasePoints))
  return {
    points: Math.round(riskUseCasePointsClamped * 100) / 100,
    percentage: riskUseCasePercentage,
    max_points: BASE_RISQUE_USE_CASE
  }
}

// Fonction de mapping des catégories du JSON vers les IDs de risk-categories.ts
function mapCategoryFromJson(jsonCategoryId: string): string {
  // Seule différence : human_oversight (JSON) → human_agency (risk-categories)
  if (jsonCategoryId === 'human_oversight') {
    return 'human_agency'
  }
  return jsonCategoryId
}

// Calcul des scores maximum par catégorie basé sur TOUTES les questions du JSON
function calculateMaxCategoryScoresFromAllQuestions(): Record<string, number> {
  const questions = loadQuestions()
  const maxScores: Record<string, number> = {}
  
  // Initialiser toutes les catégories à 0
  Object.keys(RISK_CATEGORIES).forEach(categoryId => {
    maxScores[categoryId] = 0
  })
  
  // Parcourir toutes les questions pour trouver les impacts maximum
  Object.values(questions).forEach(question => {
    // Pour les questions radio/conditional : seule UNE option peut être sélectionnée
    if (question.type === 'radio' || question.type === 'conditional') {
      const categoryMaxImpacts: Record<string, number> = {}
      
      question.options.forEach(option => {
        if (option.category_impacts) {
          Object.entries(option.category_impacts).forEach(([jsonCategoryId, impact]) => {
            if (impact < 0) { // Seuls les impacts négatifs comptent pour le maximum
              const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
              if (maxScores[mappedCategoryId] !== undefined) {
                // Prendre le maximum des impacts négatifs pour cette catégorie dans cette question
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
      
      // Ajouter le maximum de chaque catégorie pour cette question
      Object.entries(categoryMaxImpacts).forEach(([categoryId, maxImpact]) => {
        maxScores[categoryId] += maxImpact
      })
    }
    // Pour les questions checkbox/tags
    else if (question.type === 'checkbox' || question.type === 'tags') {
      const isAnyMode = question.impact_mode === 'any'

      if (isAnyMode) {
        // Mode "any" : prendre le max par catégorie (comme radio)
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
        // Mode cumulatif : TOUTES les options peuvent être sélectionnées
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

// Constante des scores maximum par catégorie (calculée une seule fois)
const CATEGORY_MAX_SCORES = calculateMaxCategoryScoresFromAllQuestions()

// Interface pour les impacts d'une réponse
interface AnswerImpacts {
  score_impact: number
  category_impacts?: Record<string, number>
}

// Interface pour les impacts d'une réponse (étendue avec is_eliminatory)
interface AnswerImpactsExtended extends AnswerImpacts {
  is_eliminatory?: boolean
}

// Fonction utilitaire pour obtenir les impacts d'une réponse depuis le JSON
function getAnswerImpactsFromJSON(questionCode: string, answerCode: string): AnswerImpactsExtended {
  const questions = loadQuestions()
  const question = questions[questionCode]
  if (!question) return { score_impact: 0 }
  
  const option = question.options.find(opt => opt.code === answerCode)
  return {
    score_impact: option?.score_impact || 0,
    category_impacts: option?.category_impacts || {},
    is_eliminatory: option?.is_eliminatory || false
  }
}

// Fonction pour calculer les points possibles et gagnés par catégorie pour une question
function calculateQuestionCategoryPoints(questionCode: string, response: any, questions: Record<string, any>) {
  const question = questions[questionCode]
  if (!question) return { possiblePoints: {}, earnedPoints: {} }
  
  const categoryPointsData: Record<string, { possible: number, earned: number }> = {}
  
  // Calculer les points selon le type de question
  if (question.type === 'radio' && response.single_value) {
    // Pour radio : prendre le MAXIMUM des impacts négatifs par catégorie (même logique que calculateMaxCategoryScoresFromAllQuestions)
    const categoryMaxImpacts: Record<string, number> = {}
    
    question.options.forEach((option: any) => {
      if (option.category_impacts) {
        Object.entries(option.category_impacts).forEach(([jsonCategoryId, impact]: [string, any]) => {
          if (impact < 0) {
            const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
            const absImpact = Math.abs(impact)
            categoryMaxImpacts[mappedCategoryId] = Math.max(
              categoryMaxImpacts[mappedCategoryId] || 0,
              absImpact
            )
          }
        })
      }
    })
    
    // Initialiser les points possibles avec les maximums calculés
    Object.entries(categoryMaxImpacts).forEach(([categoryId, maxImpact]) => {
      categoryPointsData[categoryId] = { possible: maxImpact, earned: 0 }
    })
    
    // Ensuite calculer les points gagnés
    const selectedOption = question.options.find((opt: any) => opt.code === response.single_value)
    if (selectedOption?.category_impacts) {
      Object.entries(selectedOption.category_impacts).forEach(([jsonCategoryId, impact]: [string, any]) => {
        const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
        if (categoryPointsData[mappedCategoryId]) {
          categoryPointsData[mappedCategoryId].earned = impact >= 0 ? categoryPointsData[mappedCategoryId].possible : 0
        }
      })
    } else {
      // Aucun impact = tous les points sont gagnés
      Object.keys(categoryPointsData).forEach(categoryId => {
        categoryPointsData[categoryId].earned = categoryPointsData[categoryId].possible
      })
    }
  }
  else if ((question.type === 'checkbox' || question.type === 'tags') && response.multiple_codes) {
    const selectedCodes = response.multiple_codes || []
    const isAnyMode = question.impact_mode === 'any'

    if (isAnyMode) {
      // Mode "any" : prendre le max par catégorie, perdu si AU MOINS UNE option impactante sélectionnée
      const categoryMaxImpacts: Record<string, number> = {}
      let hasSelectedImpactingOption = false

      question.options.forEach((option: any) => {
        const isSelected = selectedCodes.includes(option.code)
        if (option.category_impacts) {
          Object.entries(option.category_impacts).forEach(([jsonCategoryId, impact]: [string, any]) => {
            if (impact < 0) {
              const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
              const absImpact = Math.abs(impact)
              categoryMaxImpacts[mappedCategoryId] = Math.max(
                categoryMaxImpacts[mappedCategoryId] || 0,
                absImpact
              )
              if (isSelected) {
                hasSelectedImpactingOption = true
              }
            }
          })
        }
      })

      Object.entries(categoryMaxImpacts).forEach(([categoryId, maxImpact]) => {
        categoryPointsData[categoryId] = {
          possible: maxImpact,
          earned: hasSelectedImpactingOption ? 0 : maxImpact
        }
      })
    } else {
      // Mode cumulatif : une seule boucle pour calculer à la fois les points possibles ET gagnés
      question.options.forEach((option: any) => {
        const isSelected = selectedCodes.includes(option.code)

        if (option.category_impacts) {
          Object.entries(option.category_impacts).forEach(([jsonCategoryId, impact]: [string, any]) => {
            if (impact < 0) {
              const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
              if (!categoryPointsData[mappedCategoryId]) {
                categoryPointsData[mappedCategoryId] = { possible: 0, earned: 0 }
              }
              // Points possibles
              categoryPointsData[mappedCategoryId].possible += Math.abs(impact)

              // Points gagnés si l'option négative n'est PAS sélectionnée
              if (!isSelected) {
                categoryPointsData[mappedCategoryId].earned += Math.abs(impact)
              }
            }
          })
        }
      })
    }
  }
  else if (question.type === 'conditional') {
    // Pour conditional : même logique que radio - prendre le MAXIMUM des impacts négatifs par catégorie
    // Fallback: utiliser single_value si conditional_main est absent (données legacy)
    const selectedCode = response.conditional_main || response.single_value
    if (selectedCode) {
      const categoryMaxImpacts: Record<string, number> = {}

      question.options.forEach((option: any) => {
        if (option.category_impacts) {
          Object.entries(option.category_impacts).forEach(([jsonCategoryId, impact]: [string, any]) => {
            if (impact < 0) {
              const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
              const absImpact = Math.abs(impact)
              categoryMaxImpacts[mappedCategoryId] = Math.max(
                categoryMaxImpacts[mappedCategoryId] || 0,
                absImpact
              )
            }
          })
        }
      })

      // Initialiser les points possibles avec les maximums calculés
      Object.entries(categoryMaxImpacts).forEach(([categoryId, maxImpact]) => {
        categoryPointsData[categoryId] = { possible: maxImpact, earned: 0 }
      })

      const selectedOption = question.options.find((opt: any) => opt.code === selectedCode)
      if (selectedOption?.category_impacts) {
        Object.entries(selectedOption.category_impacts).forEach(([jsonCategoryId, impact]: [string, any]) => {
          const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
          if (categoryPointsData[mappedCategoryId]) {
            categoryPointsData[mappedCategoryId].earned = impact >= 0 ? categoryPointsData[mappedCategoryId].possible : 0
          }
        })
      } else {
        Object.keys(categoryPointsData).forEach(categoryId => {
          categoryPointsData[categoryId].earned = categoryPointsData[categoryId].possible
        })
      }
    }
  }
  
  const possiblePoints: Record<string, number> = {}
  const earnedPoints: Record<string, number> = {}
  
  Object.entries(categoryPointsData).forEach(([categoryId, data]) => {
    possiblePoints[categoryId] = data.possible
    earnedPoints[categoryId] = data.earned
  })
  
  return { possiblePoints, earnedPoints }
}

export async function calculateScore(usecaseId: string, responses: any[], supabaseClient?: SupabaseClient): Promise<UseCaseScore> {
  try {
    // console.log('Starting score calculation for usecase:', usecaseId)
    // console.log('Number of responses to process:', responses?.length || 0)
    
    if (!responses) {
      responses = []
    }
    
    let currentScore = BASE_SCORE
    const breakdown: ScoreBreakdown[] = []
    let isEliminated = false
    
    // Charger les questions une seule fois
    const questions = loadQuestions()

    // PREMIÈRE PASSE : Détecter les réponses éliminatoires
    for (const response of responses) {
      const question = questions[response.question_code]
      if (!question) continue

      // Vérifier selon le type de réponse
      if (question.type === 'radio' && response.single_value) {
        const impacts = getAnswerImpactsFromJSON(response.question_code, response.single_value)
        if (impacts.is_eliminatory) {
          isEliminated = true
          break
        }
      } else if ((question.type === 'checkbox' || question.type === 'tags') && response.multiple_codes) {
        for (const code of response.multiple_codes) {
          const impacts = getAnswerImpactsFromJSON(response.question_code, code)
          if (impacts.is_eliminatory) {
            isEliminated = true
            break
          }
        }
        if (isEliminated) break
      } else if (question.type === 'conditional' && response.conditional_main) {
        const impacts = getAnswerImpactsFromJSON(response.question_code, response.conditional_main)
        if (impacts.is_eliminatory) {
          isEliminated = true
          break
        }
      }
    }
    
    // Initialiser les compteurs par catégorie avec la logique points perdus
    const categoryData: Record<string, { 
      lostPoints: number,          // Points perdus par les réponses malus
      questionsImpacted: Set<string>
    }> = {}
    

    Object.keys(RISK_CATEGORIES).forEach(categoryId => {
      categoryData[categoryId] = { 
        lostPoints: 0,
        questionsImpacted: new Set()
      }
    })

    // DEUXIÈME PASSE : Calculer les scores normalement (même si éliminé, pour le breakdown)
    for (const response of responses) {
      // console.log('Processing response for question:', response.question_code)
      
      const question = questions[response.question_code]
      if (!question) {
        // console.log('Question not found for code:', response.question_code)
        continue
      }

      let questionImpact = 0
      let reasoning = ''
      const categoryImpactsForQuestion: Record<string, number> = {}

      // Calculer l'impact selon le type de réponse avec la nouvelle structure Array
      if (question.type === 'radio') {
        // Réponse unique stockée dans single_value
        const answerCode = response.single_value
        if (answerCode) {
          const impacts = getAnswerImpactsFromJSON(response.question_code, answerCode)
          questionImpact = impacts.score_impact
          
          // Appliquer les impacts par catégorie avec mapping
          if (impacts.category_impacts) {
            Object.entries(impacts.category_impacts).forEach(([jsonCategoryId, impact]) => {
              const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
              categoryImpactsForQuestion[mappedCategoryId] = impact
            })
          }
          
          reasoning = `${answerCode}: ${questionImpact} points`
        }
      } 
      else if (question.type === 'checkbox' || question.type === 'tags') {
        // Réponses multiples stockées dans multiple_codes
        const answerCodes = response.multiple_codes || []

        const impacts: string[] = []
        let totalImpact = 0

        // Mode "any" : appliquer l'impact une seule fois si au moins une option impactante est sélectionnée
        const isAnyMode = question.impact_mode === 'any'

        if (isAnyMode) {
          // Trouver l'impact le plus négatif parmi les options sélectionnées
          let minScoreImpact = 0
          const categoryMinImpacts: Record<string, number> = {}

          for (const code of answerCodes) {
            const answerImpacts = getAnswerImpactsFromJSON(response.question_code, code)
            if (answerImpacts.score_impact < minScoreImpact) {
              minScoreImpact = answerImpacts.score_impact
            }
            if (answerImpacts.category_impacts) {
              Object.entries(answerImpacts.category_impacts).forEach(([jsonCategoryId, impact]) => {
                const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
                // Garder l'impact le plus négatif par catégorie
                if (!categoryMinImpacts[mappedCategoryId] || impact < categoryMinImpacts[mappedCategoryId]) {
                  categoryMinImpacts[mappedCategoryId] = impact
                }
              })
            }
          }

          questionImpact = minScoreImpact
          Object.assign(categoryImpactsForQuestion, categoryMinImpacts)

          if (minScoreImpact !== 0 || Object.keys(categoryMinImpacts).length > 0) {
            impacts.push(`${answerCodes.join(', ')}: ${minScoreImpact} points (mode any)`)
          }
          reasoning = impacts.length > 0 ?
            `${impacts.join(', ')}` :
            'Aucun impact'
        } else {
          // Mode cumulatif (comportement par défaut)
          for (const code of answerCodes) {
            const answerImpacts = getAnswerImpactsFromJSON(response.question_code, code)
            if (answerImpacts.score_impact !== 0) {
              impacts.push(`${code}: ${answerImpacts.score_impact}`)
              totalImpact += answerImpacts.score_impact
            }

            // Cumuler les impacts par catégorie avec mapping
            if (answerImpacts.category_impacts) {
              Object.entries(answerImpacts.category_impacts).forEach(([jsonCategoryId, impact]) => {
                const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
                categoryImpactsForQuestion[mappedCategoryId] = (categoryImpactsForQuestion[mappedCategoryId] || 0) + impact
              })
            }
          }

          questionImpact = totalImpact
          reasoning = impacts.length > 0 ?
            `${impacts.join(', ')} → Impact total: ${totalImpact} points (cumul)` :
            'Aucun impact'
        }
      }
      else if (question.type === 'conditional') {
        // Réponse conditionnelle stockée dans conditional_main, conditional_keys, conditional_values
        // Fallback: utiliser single_value si conditional_main est absent (données legacy)
        const selectedCode = response.conditional_main || response.single_value
        if (selectedCode) {
          const impacts = getAnswerImpactsFromJSON(response.question_code, selectedCode)
          questionImpact = impacts.score_impact

          // Appliquer les impacts par catégorie avec mapping
          if (impacts.category_impacts) {
            Object.entries(impacts.category_impacts).forEach(([jsonCategoryId, impact]) => {
              const mappedCategoryId = mapCategoryFromJson(jsonCategoryId)
              categoryImpactsForQuestion[mappedCategoryId] = impact
            })
          }

          reasoning = `${selectedCode}: ${questionImpact} points`
        }
      }

      // Ajouter l'impact au score total
      currentScore += questionImpact
      
      // Calculer directement les points perdus par catégorie
      Object.entries(categoryImpactsForQuestion).forEach(([categoryId, impact]) => {
        if (categoryData[categoryId] && impact < 0) {
          categoryData[categoryId].lostPoints += Math.abs(impact)
          categoryData[categoryId].questionsImpacted.add(response.question_code)
        }
      })
      
      // Ajouter au breakdown si impact non nul (global ou par catégorie)
      if (questionImpact !== 0 || Object.keys(categoryImpactsForQuestion).length > 0) {
        // Créer une valeur de réponse formatée selon le type
        let answerValue: any = null
        if (response.single_value) {
          answerValue = response.single_value
        } else if (response.multiple_codes) {
          answerValue = response.multiple_codes
        } else if (response.conditional_main) {
          answerValue = {
            selected: response.conditional_main,
            conditionalValues: response.conditional_keys && response.conditional_values 
              ? response.conditional_keys.reduce((acc: Record<string, string>, key: string, index: number) => {
                  acc[key] = response.conditional_values[index] || ''
                  return acc
                }, {})
              : {}
          }
        }
        
        // Déterminer les catégories impactées pour le breakdown
        const impactedCategories = Object.keys(categoryImpactsForQuestion).join(', ') || 'score_global'
        
        // Créer les impacts de catégorie pour le breakdown (conserver l'ancienne structure)
        const categoryImpactsForBreakdown: Record<string, number> = {}
        Object.entries(categoryImpactsForQuestion).forEach(([categoryId, impact]) => {
          categoryImpactsForBreakdown[categoryId] = impact
        })
        
        breakdown.push({
          question_id: response.question_code,
          question_text: question.question,
          answer_value: answerValue,
          score_impact: questionImpact,
          reasoning,
          risk_category: impactedCategories,
          category_impacts: categoryImpactsForBreakdown
        })
      }
    }

    // S'assurer que le score ne descend pas en dessous de 0
    currentScore = Math.max(0, currentScore)

    // Si éliminé, forcer le score à zéro
    if (isEliminated) {
      currentScore = 0
    }

    // Calculer le score COMPL-AI et récupérer les scores MaydAI par principe
    let complAiBonus = 0
    let complAiScore: number | null = null
    let complAiRawScore: number | null = null  // Score brut COMPL-AI (0-20)
    let modelInfo: { id: string; name: string; provider: string } | null = null
    let maydaiScoresByPrinciple: Record<string, number> = {}
    let maxScore = MAX_WITHOUT_COMPL_AI  // Par défaut, max = 90 (questionnaire seul)

    if (!isEliminated) {
      const complAiData = await getUseCaseComplAiBonus(usecaseId, supabaseClient)

      complAiBonus = complAiData.bonus
      complAiScore = complAiData.complAiScore
      modelInfo = complAiData.modelInfo

      // Récupérer les scores MaydAI par principe si un modèle est associé
      if (modelInfo?.id) {
        maydaiScoresByPrinciple = await getMaydAiScoresByPrinciple(modelInfo.id, supabaseClient)
      }

      // Calculer le score final selon la présence de COMPL-AI
      if (complAiScore !== null && modelInfo) {
        // AVEC COMPL-AI : formule (Questionnaire + COMPL-AI × 2.5) / 150 × 100
        complAiRawScore = complAiScore * 20  // Convertir % (0-1) en score brut (0-20)
        const weightedScore = currentScore + (complAiRawScore * COMPL_AI_WEIGHT)
        currentScore = Math.round((weightedScore / MAX_WITH_COMPL_AI) * 1000) / 10
        maxScore = MAX_SCORE_PERCENTAGE  // Le résultat est sur 100

        // Ajouter l'explication au breakdown
        breakdown.push({
          question_id: 'compl_ai_bonus',
          question_text: `Score COMPL-AI (${modelInfo.name} - ${modelInfo.provider})`,
          answer_value: `Score COMPL-AI: ${complAiRawScore.toFixed(2)}/20 (${Math.round(complAiScore * 100)}%)`,
          score_impact: complAiRawScore * COMPL_AI_WEIGHT,
          reasoning: `Contribution COMPL-AI: ${complAiRawScore.toFixed(2)} × ${COMPL_AI_WEIGHT} = ${(complAiRawScore * COMPL_AI_WEIGHT).toFixed(1)} points`,
          risk_category: 'compl_ai_conformity',
          category_impacts: {}
        })
      }
      // SANS COMPL-AI : score questionnaire seul (currentScore reste inchangé, max = 90)
    }

    // Calculer les scores par catégorie avec les constantes pré-calculées
    const categoryScores: CategoryScore[] = Object.entries(RISK_CATEGORIES).map(([categoryId, category]) => {
      const data = categoryData[categoryId]
      
      // Calculer le score questionnaire : maximum - points perdus
      let maxQuestionnaireScore = CATEGORY_MAX_SCORES[categoryId] || 0
      let questionnaireScore = Math.max(0, maxQuestionnaireScore - data.lostPoints)
      let maydaiScore = 0
      let maxMaydaiScore = 0
      
      // Vérifier si ce principe a un score MaydAI
      if (maydaiScoresByPrinciple[categoryId]) {
        maydaiScore = maydaiScoresByPrinciple[categoryId]
        maxMaydaiScore = 4 // Chaque principe MaydAI vaut max 4 points (20 total / 5 principes)
      }

      // Calcul final : questionnaire + MaydAI
      const totalScore = questionnaireScore + maydaiScore
      const totalMaxScore = maxQuestionnaireScore + maxMaydaiScore

      // Si aucune question n'impacte cette catégorie et pas de score MaydAI, score parfait (100%)
      const percentage = totalMaxScore > 0 ? 
        Math.round((totalScore / totalMaxScore) * 100) : 100
      
      return {
        category_id: categoryId,
        category_name: category.shortName,
        score: totalScore,
        max_score: totalMaxScore,
        percentage: percentage,
        question_count: data.questionsImpacted.size, // Nombre de questions qui ont impacté cette catégorie
        color: category.color,
        icon: category.icon || ''
      }
    })

    // console.log('Final score calculated:', currentScore, '/', BASE_SCORE)
    // console.log('Breakdown entries:', breakdown.length)
    // console.log('Category scores:', categoryScores.length)

    // Calcul du "Risque Cas d'Usage" par reverse engineering (pour affichage uniquement)
    const globalScorePercent = maxScore > 0 ? currentScore / maxScore : 0
    const riskUseCaseResult = calculateRiskUseCaseByReverseEngineering(
      globalScorePercent,
      categoryScores
    )

    return {
      usecase_id: usecaseId,
      score: currentScore,
      max_score: maxScore,
      score_breakdown: breakdown,
      category_scores: categoryScores,
      calculated_at: new Date().toISOString(),
      version: 1,
      is_eliminated: isEliminated,
      compl_ai_bonus: complAiRawScore !== null ? complAiRawScore * COMPL_AI_WEIGHT : 0,
      compl_ai_score: complAiScore,
      model_info: modelInfo,
      risk_use_case: riskUseCaseResult
    }
  } catch (error) {
    console.error('Error in calculateScore:', error)
    // En cas d'erreur, retourner un score par défaut
    return {
      usecase_id: usecaseId,
      score: BASE_SCORE,
      max_score: MAX_WITHOUT_COMPL_AI,
      score_breakdown: [],
      category_scores: [],
      calculated_at: new Date().toISOString(),
      version: 1,
      is_eliminated: false,
      compl_ai_bonus: 0,
      compl_ai_score: null,
      model_info: null,
      risk_use_case: {
        points: 0,
        percentage: 0,
        max_points: BASE_RISQUE_USE_CASE
      }
    }
  }
} 
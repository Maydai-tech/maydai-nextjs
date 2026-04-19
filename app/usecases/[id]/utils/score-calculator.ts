import { loadQuestions } from '../utils/questions-loader'
import { UseCaseScore, ScoreBreakdown, CategoryScore } from '../types/usecase'
import { RISK_CATEGORIES } from './risk-categories'
import { getUseCaseComplAiBonus, getMaydAiScoresByPrinciple } from './compl-ai-scoring'
import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateMaxCategoryScoresForAllQuestions } from '@/lib/score-category-max'
import { mergeChecklistIntoDbResponseRows } from '@/lib/merge-checklist-into-user-responses'
import { buildV2ScoringContextFromDbResponses } from '@/lib/scoring-v2-server'
import { buildV3ScoringContextFromDbResponses } from '@/lib/scoring-v3-server'
import {
  QUESTIONNAIRE_VERSION_V1,
  QUESTIONNAIRE_VERSION_V2,
  QUESTIONNAIRE_VERSION_V3,
  type QuestionnaireVersion,
  normalizeQuestionnaireVersion
} from '@/lib/questionnaire-version'

/** Plafond MaydAI par principe (barème 5×4) — appliqué uniquement si le principe a une entrée dans `compl_ai_maydai_scores`. */
const MAYDAI_MAX_SCORE_PER_COMPL_AI_PRINCIPLE = 4

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
  categoryScores: CategoryScore[],
  questionnaireVersion: QuestionnaireVersion
): { points: number; percentage: number; max_points: number } {
  if (
    questionnaireVersion === QUESTIONNAIRE_VERSION_V2 ||
    questionnaireVersion === QUESTIONNAIRE_VERSION_V3
  ) {
    const principleCats = categoryScores.filter(
      cat =>
        SIX_PRINCIPLES_IDS.includes(cat.category_id as (typeof SIX_PRINCIPLES_IDS)[number]) &&
        cat.max_score > 0
    )
    const dynamicPrinciplesMax = principleCats.reduce((s, c) => s + c.max_score, 0)
    if (dynamicPrinciplesMax <= 0) {
      return { points: 0, percentage: 0, max_points: BASE_RISQUE_USE_CASE }
    }
    const dynamicBase = dynamicPrinciplesMax + BASE_RISQUE_USE_CASE
    const targetPoints = dynamicBase * globalScorePercent
    const principlesPoints = principleCats.reduce((sum, cat) => sum + cat.score, 0)
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

// Constante des scores maximum par catégorie — questionnaire V1 (toutes les questions)
const CATEGORY_MAX_SCORES = calculateMaxCategoryScoresForAllQuestions()

export type CalculateScoreOptions = {
  questionnaireVersion?: number | null
  /** V3 : aligné sur usecases.system_type pour le graphe actif */
  systemType?: string | null
  /** V3 : sous-ensemble actif court vs long (scoring + métadonnées actives). */
  questionnairePathMode?: 'long' | 'short'
  /** Colonnes `usecases.checklist_gov_*` (codes d’options) — fusion avec `usecase_responses`. */
  checklistGovEnterprise?: string[] | null
  checklistGovUsecase?: string[] | null
}

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

export async function calculateScore(
  usecaseId: string,
  responses: any[],
  supabaseClient?: SupabaseClient,
  options?: CalculateScoreOptions
): Promise<UseCaseScore> {
  try {
    // console.log('Starting score calculation for usecase:', usecaseId)
    // console.log('Number of responses to process:', responses?.length || 0)
    
    if (!responses) {
      responses = []
    }

    const mergedResponses = mergeChecklistIntoDbResponseRows(
      responses,
      options?.checklistGovEnterprise ?? null,
      options?.checklistGovUsecase ?? null
    )

    const questionnaireVersion = normalizeQuestionnaireVersion(options?.questionnaireVersion)
    const v2Context =
      questionnaireVersion === QUESTIONNAIRE_VERSION_V2
        ? buildV2ScoringContextFromDbResponses(QUESTIONNAIRE_VERSION_V2, mergedResponses)
        : null
    const v3Context =
      questionnaireVersion === QUESTIONNAIRE_VERSION_V3
        ? buildV3ScoringContextFromDbResponses(
            QUESTIONNAIRE_VERSION_V3,
            mergedResponses,
            options?.systemType ?? null,
            options?.questionnairePathMode ?? 'long'
          )
        : null
    const pathContext = v3Context ?? v2Context
    const responsesForScoring = pathContext
      ? mergedResponses.filter(r => pathContext.scoringActiveQuestionCodes.has(r.question_code))
      : mergedResponses
    const categoryMaxScores = pathContext?.categoryMaxScores ?? CATEGORY_MAX_SCORES
    
    let currentScore = BASE_SCORE
    const breakdown: ScoreBreakdown[] = []
    let isEliminated = false
    
    // Charger les questions une seule fois
    const questions = loadQuestions()

    // PREMIÈRE PASSE : Détecter les réponses éliminatoires (périmètre V1 = tout, V2 = questions actives répondues)
    for (const response of responsesForScoring) {
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
    for (const response of responsesForScoring) {
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
    /** Catégories pour lesquelles `compl_ai_maydai_scores` retourne au moins une ligne mappée (pas de plafond MaydAI artificiel sinon). */
    let maydaiCategoryIdsFromDb: Set<string> | null = null
    let maxScore = MAX_WITHOUT_COMPL_AI  // Par défaut, max = 90 (questionnaire seul)

    if (!isEliminated) {
      const complAiData = await getUseCaseComplAiBonus(usecaseId, supabaseClient)

      complAiBonus = complAiData.bonus
      complAiScore = complAiData.complAiScore
      modelInfo = complAiData.modelInfo

      // Récupérer les scores MaydAI par principe si un modèle est associé (clés = signal DB réel uniquement)
      if (modelInfo?.id) {
        const rawMaydaiByPrinciple = await getMaydAiScoresByPrinciple(modelInfo.id, supabaseClient)
        maydaiScoresByPrinciple = { ...rawMaydaiByPrinciple }
        maydaiCategoryIdsFromDb = new Set(Object.keys(rawMaydaiByPrinciple))
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

    // Calculer les scores par catégorie (V1 : max sur tout le JSON ; V2 : max sur sous-ensemble actif)
    const categoryScores: CategoryScore[] = Object.entries(RISK_CATEGORIES).map(([categoryId, category]) => {
      const data = categoryData[categoryId]
      
      // Calculer le score questionnaire : maximum - points perdus
      let maxQuestionnaireScore = categoryMaxScores[categoryId] || 0
      let questionnaireScore = Math.max(0, maxQuestionnaireScore - data.lostPoints)
      let maydaiScore = 0
      let maxMaydaiScore = 0

      // MaydAI : plafond et numérateur seulement si la vue SQL a une entrée pour ce principe (évite 0 % « 0/4 » sans signal)
      if (maydaiCategoryIdsFromDb?.has(categoryId)) {
        maydaiScore = maydaiScoresByPrinciple[categoryId] ?? 0
        maxMaydaiScore = MAYDAI_MAX_SCORE_PER_COMPL_AI_PRINCIPLE
      }

      // Calcul final : questionnaire + MaydAI
      const totalScore = questionnaireScore + maydaiScore
      const totalMaxScore = maxQuestionnaireScore + maxMaydaiScore

      const isV2NotEvaluated =
        (questionnaireVersion === QUESTIONNAIRE_VERSION_V2 ||
          questionnaireVersion === QUESTIONNAIRE_VERSION_V3) &&
        maxQuestionnaireScore === 0 &&
        maxMaydaiScore === 0

      // V1 : aucune question sur la catégorie = 100 % historique. V2 : non évalué → 0 % (comportement historique). V3 : neutre 100 % (évite faux 0 % sans signal MaydAI / axe absent).
      const percentage = isV2NotEvaluated
        ? questionnaireVersion === QUESTIONNAIRE_VERSION_V3
          ? 100
          : 0
        : totalMaxScore > 0
          ? Math.round((totalScore / totalMaxScore) * 100)
          : 100
      
      return {
        category_id: categoryId,
        category_name: category.shortName,
        score: isV2NotEvaluated ? 0 : totalScore,
        max_score: isV2NotEvaluated ? 0 : totalMaxScore,
        percentage,
        question_count: data.questionsImpacted.size, // Nombre de questions qui ont impacté cette catégorie
        color: category.color,
        icon: category.icon || '',
        ...(isV2NotEvaluated ? { evaluation_status: 'not_evaluated' as const } : {})
      }
    })

    // console.log('Final score calculated:', currentScore, '/', BASE_SCORE)
    // console.log('Breakdown entries:', breakdown.length)
    // console.log('Category scores:', categoryScores.length)

    // Calcul du "Risque Cas d'Usage" par reverse engineering (pour affichage uniquement)
    const globalScorePercent = maxScore > 0 ? currentScore / maxScore : 0
    const riskUseCaseResult = calculateRiskUseCaseByReverseEngineering(
      globalScorePercent,
      categoryScores,
      questionnaireVersion
    )

    // --- SONDAGE FORENSIC (audit conformité Human Agency / Social & Environmental) ---
    const scoringSet = pathContext?.scoringActiveQuestionCodes
    const scoringCodesList = scoringSet ? [...scoringSet].sort() : null
    const scoringE5 = scoringCodesList?.filter((c) => c.startsWith('E5.')) ?? []
    const scoringE6 = scoringCodesList?.filter((c) => c.startsWith('E6.')) ?? []
    const scoringNonE5E6 =
      scoringCodesList?.filter((c) => !c.startsWith('E5.') && !c.startsWith('E6.')) ?? []
    const auditTargets = ['human_agency', 'social_environmental'] as const
    const forensicCategoryAudit: Record<
      string,
      {
        categoryMaxScore: number
        lostPoints: number
        triggering_question_codes: string[]
        maydaiScoreByPrinciple: number | null
      }
    > = {}
    for (const cat of auditTargets) {
      forensicCategoryAudit[cat] = {
        categoryMaxScore: categoryMaxScores[cat] ?? 0,
        lostPoints: categoryData[cat]?.lostPoints ?? 0,
        triggering_question_codes: [...(categoryData[cat]?.questionsImpacted ?? new Set())].sort(),
        maydaiScoreByPrinciple:
          maydaiCategoryIdsFromDb?.has(cat) === true ? (maydaiScoresByPrinciple[cat] ?? null) : null,
      }
    }
    console.log(
      JSON.stringify(
        {
          forensic_audit: 'calculateScore_principle_trace',
          usecase_id: usecaseId,
          questionnaire_version: questionnaireVersion,
          questionnaire_path_mode: options?.questionnairePathMode ?? null,
          denominator_context: {
            categoryMaxScores_human_agency: forensicCategoryAudit.human_agency.categoryMaxScore,
            categoryMaxScores_social_environmental:
              forensicCategoryAudit.social_environmental.categoryMaxScore,
            note:
              'categoryMaxScores provient de calculateMaxCategoryScoresForActiveQuestionCodes(scoringActiveQuestionCodes) ; les questions E5/E6 incluses dans scoringActiveQuestionCodes contribuent au dénominateur.',
            scoringActiveQuestionCodes_total_count: scoringSet?.size ?? null,
            scoringActiveQuestionCodes_E5_count: scoringE5.length,
            scoringActiveQuestionCodes_E6_count: scoringE6.length,
            scoringActiveQuestionCodes_non_E5_E6_count: scoringNonE5E6.length,
            scoringActiveQuestionCodes_E5_sample: scoringE5.slice(0, 20),
            scoringActiveQuestionCodes_E6_sample: scoringE6.slice(0, 20),
          },
          numerator_losses: {
            human_agency_lostPoints: forensicCategoryAudit.human_agency.lostPoints,
            social_environmental_lostPoints: forensicCategoryAudit.social_environmental.lostPoints,
          },
          response_trace_negative_category_impacts: {
            human_agency_question_codes_with_negative_impact:
              forensicCategoryAudit.human_agency.triggering_question_codes,
            social_environmental_question_codes_with_negative_impact:
              forensicCategoryAudit.social_environmental.triggering_question_codes,
          },
          llm_bonus_maydai_by_principle: {
            human_agency: forensicCategoryAudit.human_agency.maydaiScoreByPrinciple,
            social_environmental: forensicCategoryAudit.social_environmental.maydaiScoreByPrinciple,
            model_id: modelInfo?.id ?? null,
          },
        },
        null,
        2
      )
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
      risk_use_case: riskUseCaseResult,
      ...(v3Context
        ? {
            questionnaire_version: QUESTIONNAIRE_VERSION_V3,
            bpgv_variant: v3Context.bpgv_variant,
            ors_exit: v3Context.ors_exit,
            active_question_codes: v3Context.active_question_codes
          }
        : v2Context
          ? {
              questionnaire_version: QUESTIONNAIRE_VERSION_V2,
              bpgv_variant: v2Context.bpgv_variant,
              ors_exit: v2Context.ors_exit,
              active_question_codes: v2Context.active_question_codes
            }
          : { questionnaire_version: questionnaireVersion })
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
      },
      questionnaire_version: QUESTIONNAIRE_VERSION_V1
    }
  }
} 
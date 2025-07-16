import { loadQuestions } from '../utils/questions-loader'
import { UseCaseScore, ScoreBreakdown, CategoryScore } from '../types/usecase'
import { RISK_CATEGORIES } from './risk-categories'

const BASE_SCORE = 100

// Interface pour les impacts d'une réponse
interface AnswerImpacts {
  score_impact: number
  category_impacts?: Record<string, number>
}

// Fonction utilitaire pour obtenir les impacts d'une réponse depuis le JSON
function getAnswerImpactsFromJSON(questionCode: string, answerCode: string): AnswerImpacts {
  const questions = loadQuestions()
  const question = questions[questionCode]
  if (!question) return { score_impact: 0 }
  
  const option = question.options.find(opt => opt.code === answerCode)
  return {
    score_impact: option?.score_impact || 0,
    category_impacts: option?.category_impacts || {}
  }
}

export function calculateScore(usecaseId: string, responses: any[]): UseCaseScore {
  try {
    // console.log('Starting score calculation for usecase:', usecaseId)
    // console.log('Number of responses to process:', responses?.length || 0)
    
    if (!responses) {
      responses = []
    }
    
    let currentScore = BASE_SCORE
    const breakdown: ScoreBreakdown[] = []
    
    // Initialiser les compteurs par catégorie
    const categoryData: Record<string, { 
      totalImpact: number, 
      questionCount: number,
      impactedQuestions: Set<string>
    }> = {}
    
    Object.keys(RISK_CATEGORIES).forEach(categoryId => {
      categoryData[categoryId] = { 
        totalImpact: 0, 
        questionCount: 0,
        impactedQuestions: new Set()
      }
    })

    // Charger les questions une seule fois
    const questions = loadQuestions()

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
          
          // Appliquer les impacts par catégorie
          if (impacts.category_impacts) {
            Object.entries(impacts.category_impacts).forEach(([categoryId, impact]) => {
              categoryImpactsForQuestion[categoryId] = impact
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
        
        // Pour les questions multiples, CUMULER tous les impacts
        for (const code of answerCodes) {
          const answerImpacts = getAnswerImpactsFromJSON(response.question_code, code)
          if (answerImpacts.score_impact !== 0) {
            impacts.push(`${code}: ${answerImpacts.score_impact}`)
            totalImpact += answerImpacts.score_impact
          }
          
          // Cumuler les impacts par catégorie
          if (answerImpacts.category_impacts) {
            Object.entries(answerImpacts.category_impacts).forEach(([categoryId, impact]) => {
              categoryImpactsForQuestion[categoryId] = (categoryImpactsForQuestion[categoryId] || 0) + impact
            })
          }
        }
        
        questionImpact = totalImpact
        reasoning = impacts.length > 0 ? 
          `${impacts.join(', ')} → Impact total: ${totalImpact} points (cumul)` : 
          'Aucun impact'
      }
      else if (question.type === 'conditional' && response.conditional_main) {
        // Réponse conditionnelle stockée dans conditional_main, conditional_keys, conditional_values
        const selectedCode = response.conditional_main
        const impacts = getAnswerImpactsFromJSON(response.question_code, selectedCode)
        questionImpact = impacts.score_impact
        
        // Appliquer les impacts par catégorie
        if (impacts.category_impacts) {
          Object.entries(impacts.category_impacts).forEach(([categoryId, impact]) => {
            categoryImpactsForQuestion[categoryId] = impact
          })
        }
        
        reasoning = `${selectedCode}: ${questionImpact} points`
      }

      // Ajouter l'impact au score total
      currentScore += questionImpact
      
      // Appliquer les impacts aux catégories concernées
      Object.entries(categoryImpactsForQuestion).forEach(([categoryId, impact]) => {
        if (categoryData[categoryId]) {
          categoryData[categoryId].totalImpact += impact
          categoryData[categoryId].impactedQuestions.add(response.question_code)
          // console.log(`Applied impact ${impact} to category ${categoryId} for question ${response.question_code}`)
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
        
        breakdown.push({
          question_id: response.question_code,
          question_text: question.question,
          answer_value: answerValue,
          score_impact: questionImpact,
          reasoning,
          risk_category: impactedCategories,
          category_impacts: categoryImpactsForQuestion
        })
      }
    }

    // S'assurer que le score ne descend pas en dessous de 0
    currentScore = Math.max(0, currentScore)

    // Calculer les scores par catégorie - toutes les catégories sont indépendantes avec le même score de base
    const categoryScores: CategoryScore[] = Object.entries(RISK_CATEGORIES).map(([categoryId, category]) => {
      const data = categoryData[categoryId]
      const baseScore = BASE_SCORE // Toutes les catégories ont le même score de base de 100
      const adjustedScore = Math.max(0, baseScore + data.totalImpact)
      
      return {
        category_id: categoryId,
        category_name: category.shortName,
        score: adjustedScore,
        max_score: baseScore,
        percentage: Math.round((adjustedScore / baseScore) * 100),
        question_count: data.impactedQuestions.size, // Nombre de questions qui ont impacté cette catégorie
        color: category.color,
        icon: category.icon
      }
    })

    // console.log('Final score calculated:', currentScore, '/', BASE_SCORE)
    // console.log('Breakdown entries:', breakdown.length)
    // console.log('Category scores:', categoryScores.length)

    return {
      usecase_id: usecaseId,
      score: currentScore,
      max_score: BASE_SCORE,
      score_breakdown: breakdown,
      category_scores: categoryScores,
      calculated_at: new Date().toISOString(),
      version: 1
    }
  } catch (error) {
    console.error('Error in calculateScore:', error)
    // En cas d'erreur, retourner un score par défaut
    return {
      usecase_id: usecaseId,
      score: BASE_SCORE,
      max_score: BASE_SCORE,
      score_breakdown: [],
      category_scores: [],
      calculated_at: new Date().toISOString(),
      version: 1
    }
  }
} 
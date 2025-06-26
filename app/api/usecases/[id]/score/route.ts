import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { QUESTIONS } from '../../../../usecases/[id]/data/questions'
import { QUESTION_CODE_MAPPING, QUESTION_SCORING_CONFIG, getAnswerImpact } from '../../../../usecases/[id]/utils/scoring-config'
import { UseCaseScore, ScoreBreakdown, CategoryScore } from '../../../../usecases/[id]/types/usecase'
import { RISK_CATEGORIES, QUESTION_RISK_CATEGORY_MAPPING } from '../../../../usecases/[id]/utils/risk-categories'

// Variables d'environnement vérifiées dans chaque fonction pour éviter les erreurs de build

const BASE_SCORE = 100

function calculateScore(usecaseId: string, responses: any[]): UseCaseScore {
  try {
    console.log('Starting score calculation for usecase:', usecaseId)
    console.log('Number of responses to process:', responses.length)
    
    let currentScore = BASE_SCORE
    const breakdown: ScoreBreakdown[] = []
    
    // Initialiser les compteurs par catégorie
    const categoryData: Record<string, { 
      totalImpact: number, 
      questionCount: number, 
      maxPossibleScore: number 
    }> = {}
    
    Object.keys(RISK_CATEGORIES).forEach(categoryId => {
      categoryData[categoryId] = { 
        totalImpact: 0, 
        questionCount: 0, 
        maxPossibleScore: 0 
      }
    })

    for (const response of responses) {
      console.log('Processing response for question:', response.question_code)
      
      const question = QUESTIONS[response.question_code]
      if (!question) {
        console.log('Question not found for code:', response.question_code)
        continue
      }

      let questionImpact = 0
      let reasoning = ''

      // Calculer l'impact selon le type de réponse avec la nouvelle structure Array
      if (question.type === 'radio') {
        // Réponse unique stockée dans single_value
        const answerCode = response.single_value
        if (answerCode) {
          questionImpact = getAnswerImpact(response.question_code, answerCode)
          reasoning = `${answerCode}: ${questionImpact} points`
        }
      } 
      else if (question.type === 'checkbox' || question.type === 'tags') {
        // Réponses multiples stockées dans multiple_codes
        const answerCodes = response.multiple_codes || []
        
        const impacts: string[] = []
        
        for (const code of answerCodes) {
          const impact = getAnswerImpact(response.question_code, code)
          questionImpact += impact
          if (impact !== 0) {
            impacts.push(`${code}: ${impact}`)
          }
        }
        reasoning = impacts.length > 0 ? impacts.join(', ') : 'Aucun impact'
      }
      else if (question.type === 'conditional' && response.conditional_main) {
        // Réponse conditionnelle stockée dans conditional_main, conditional_keys, conditional_values
        const selectedCode = response.conditional_main
        questionImpact = getAnswerImpact(response.question_code, selectedCode)
        reasoning = `${selectedCode}: ${questionImpact} points`
        
        // Bonus si des détails sont fournis pour les réponses positives
        if (selectedCode.includes('.B') && questionImpact >= 0 && response.conditional_keys && response.conditional_values) {
          const hasDetails = response.conditional_values.some((v: string) => v && v.trim().length > 0)
          if (hasDetails) {
            const bonus = 2
            questionImpact += bonus
            reasoning += ` (+${bonus} détails fournis)`
          }
        }
      }

      // Ajouter l'impact au score total
      currentScore += questionImpact
      
      // Identifier la catégorie de risque
      const riskCategoryId = QUESTION_RISK_CATEGORY_MAPPING[response.question_code]
      
      // Ajouter au breakdown si impact non nul
      if (questionImpact !== 0) {
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
        
        breakdown.push({
          question_id: response.question_code,
          question_text: question.question,
          answer_value: answerValue,
          score_impact: questionImpact,
          reasoning,
          risk_category: riskCategoryId
        })
        
        // Mettre à jour les données de catégorie
        if (riskCategoryId && categoryData[riskCategoryId]) {
          categoryData[riskCategoryId].totalImpact += questionImpact
          categoryData[riskCategoryId].questionCount += 1
          // Calculer le score max possible pour cette question (impact positif max)
          categoryData[riskCategoryId].maxPossibleScore += Math.max(0, Math.abs(questionImpact))
        }
      }
    }

    // S'assurer que le score ne descend pas en dessous de 0
    currentScore = Math.max(0, currentScore)

    // Calculer les scores par catégorie
    const categoryScores: CategoryScore[] = Object.entries(RISK_CATEGORIES).map(([categoryId, category]) => {
      const data = categoryData[categoryId]
      const baseScore = BASE_SCORE * category.weight
      const adjustedScore = Math.max(0, baseScore + data.totalImpact)
      
      return {
        category_id: categoryId,
        category_name: category.shortName,
        score: adjustedScore,
        max_score: baseScore,
        percentage: Math.round((adjustedScore / baseScore) * 100),
        question_count: data.questionCount,
        color: category.color,
        icon: category.icon
      }
    })

    console.log('Final score calculated:', currentScore, '/', BASE_SCORE)
    console.log('Breakdown entries:', breakdown.length)
    console.log('Category scores:', categoryScores.length)

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

async function saveScore(supabase: any, scoreData: UseCaseScore) {
  try {
    // Vérifier s'il existe déjà un score pour ce usecase
    const { data: existingScore, error: fetchError } = await supabase
      .from('usecase_scores')
      .select('id, version')
      .eq('usecase_id', scoreData.usecase_id)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.warn('Warning: Could not fetch existing score, table may not exist:', fetchError)
      // Si la table n'existe pas, retourner le score sans le sauvegarder
      return { ...scoreData, id: 'temp-' + Date.now(), version: 1 }
    }

    // Déterminer la version
    const version = existingScore ? existingScore.version + 1 : 1

    // Insérer le nouveau score
    const { data, error } = await supabase
      .from('usecase_scores')
      .insert({
        ...scoreData,
        version
      })
      .select()
      .single()

    if (error) {
      console.warn('Warning: Could not save score to database:', error)
      // Si on ne peut pas sauvegarder, retourner le score calculé avec un ID temporaire
      return { ...scoreData, id: 'temp-' + Date.now(), version }
    }
    
    return data
  } catch (error) {
    console.warn('Warning: Error in saveScore function:', error)
    // En cas d'erreur, retourner le score calculé sans le sauvegarder
    return { ...scoreData, id: 'temp-' + Date.now(), version: 1 }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== STARTING SCORE API CALL ===')
    
    // Vérifier les variables d'environnement
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Variables d\'environnement Supabase manquantes' },
        { status: 500 }
      )
    }
    
    const authHeader = request.headers.get('authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.log('No authorization header')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    
    console.log('Supabase client created')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    console.log('User auth result:', { user: !!user, error: !!authError })
    
    if (authError || !user) {
      console.log('Auth error:', authError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: usecaseId } = await params
    console.log('UseCase ID:', usecaseId)

    // Vérifier l'accès au use case
    console.log('Fetching usecase data...')
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('company_id')
      .eq('id', usecaseId)
      .single()

    if (usecaseError) {
      console.log('UseCase error:', usecaseError)
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    console.log('Fetching user profile...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || profile.company_id !== usecase.company_id) {
      console.log('Profile error or access denied:', profileError, 'profile company:', profile?.company_id, 'usecase company:', usecase.company_id)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Récupérer les réponses
    console.log('Fetching responses...')
    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
      .eq('usecase_id', usecaseId)

    if (responsesError) {
      console.log('Responses error:', responsesError)
      return NextResponse.json({ error: 'Error fetching responses' }, { status: 500 })
    }

    console.log('Found', responses?.length || 0, 'responses')

    // Calculer le score
    console.log('Calculating score...')
    const scoreData = calculateScore(usecaseId, responses || [])
    console.log('Score calculated:', scoreData.score, '/', scoreData.max_score)

    // Sauvegarder le score calculé
    console.log('Saving score...')
    const savedScore = await saveScore(supabase, scoreData)
    console.log('Score saved with ID:', savedScore.id)

    // S'assurer que les category_scores sont présents (rétrocompatibilité)
    if (!savedScore.category_scores || savedScore.category_scores.length === 0) {
      console.log('Adding category scores for backward compatibility')
      savedScore.category_scores = scoreData.category_scores
    }

    return NextResponse.json(savedScore)

  } catch (error) {
    console.error('=== ERROR IN SCORE API ===')
    console.error('Error type:', typeof error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('Full error object:', error)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      type: typeof error
    }, { status: 500 })
  }
}

// POST pour recalculer et sauvegarder le score
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return GET(request, { params }) // Même logique que GET pour le test
} 
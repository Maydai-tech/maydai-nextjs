import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import questionsData from '@/app/usecases/[id]/data/questions-with-scores.json'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

type RiskLevel = 'unacceptable' | 'high' | 'limited' | 'minimal'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: usecaseId } = await params

    // Vérifier que l'utilisateur a accès à ce use case
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('company_id')
      .eq('id', usecaseId)
      .single()

    if (usecaseError) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    // Check if user has access to this use case via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', usecase.company_id)
      .eq('is_active', true)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Récupérer les réponses du use case
    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('*')
      .eq('usecase_id', usecaseId)

    if (responsesError) {
      return NextResponse.json({ error: 'Error fetching responses' }, { status: 500 })
    }

    if (!responses || responses.length === 0) {
      // Si aucune réponse, retourner minimal par défaut
      return NextResponse.json({ risk_level: 'minimal' })
    }

    // Déterminer le niveau de risque le plus élevé
    let highestRiskLevel: RiskLevel = 'minimal'
    const riskHierarchy: RiskLevel[] = ['minimal', 'limited', 'high', 'unacceptable']

    for (const response of responses) {
      const questionCode = response.question_code
      const question = questionsData[questionCode as keyof typeof questionsData]
      
      if (!question) continue

      let selectedRiskLevel: RiskLevel | undefined

      // Déterminer le niveau de risque basé sur la réponse
      if (response.single_value) {
        // Pour les questions radio ou avec une seule valeur
        const option = question.options?.find((opt: any) => 
          opt.code === response.single_value || opt.label === response.single_value
        )
        
        if (option && 'risk' in option) {
          selectedRiskLevel = option.risk as RiskLevel
        }
        // Ne pas hériter du risque de la question si une option existe mais n'a pas de risque
        // Cela évite les faux positifs avec les options "Aucun de ces cas"
      } else if (response.multiple_codes && Array.isArray(response.multiple_codes)) {
        // Pour les questions multiples, prendre le risque le plus élevé parmi les options sélectionnées
        for (const code of response.multiple_codes) {
          const option = question.options?.find((opt: any) => opt.code === code)
          if (option && 'risk' in option) {
            const optionRisk = option.risk as RiskLevel
            const currentIndex = riskHierarchy.indexOf(selectedRiskLevel || 'minimal')
            const optionIndex = riskHierarchy.indexOf(optionRisk)
            if (optionIndex > currentIndex) {
              selectedRiskLevel = optionRisk
            }
          }
        }
        
        // Ne pas hériter automatiquement du risque de la question
        // Les options sans risque (comme "Aucun de ces cas") doivent rester sans risque
      } else if (response.conditional_main) {
        // Pour les questions conditionnelles
        const option = question.options?.find((opt: any) => 
          opt.code === response.conditional_main || opt.label === response.conditional_main
        )
        
        if (option && 'risk' in option) {
          selectedRiskLevel = option.risk as RiskLevel
        }
        // Ne pas hériter du risque de la question si une option existe mais n'a pas de risque
      }

      // Mettre à jour le niveau de risque le plus élevé
      if (selectedRiskLevel) {
        const currentIndex = riskHierarchy.indexOf(highestRiskLevel)
        const selectedIndex = riskHierarchy.indexOf(selectedRiskLevel)
        
        if (selectedIndex > currentIndex) {
          highestRiskLevel = selectedRiskLevel
        }

        // Si on a trouvé "unacceptable", on peut arrêter la recherche
        if (highestRiskLevel === 'unacceptable') {
          break
        }
      }
    }

    return NextResponse.json({ risk_level: highestRiskLevel })
  } catch (error) {
    console.error('Error in GET /api/use-cases/[id]/risk-level:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { transformToOpenAIFormat, extractTargetResponses, validateOpenAIInput } from '@/lib/openai-data-transformer'
import { openAIClient } from '@/lib/openai-client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create Supabase client with the user's token
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: usecase_id } = await params
    
    if (!usecase_id) {
      return NextResponse.json({ error: 'usecase_id is required' }, { status: 400 })
    }

    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('id, name, checklist_gov_enterprise, checklist_gov_usecase')
      .eq('id', usecase_id)
      .single()

    if (usecaseError || !usecase) {
      return NextResponse.json({ error: 'Usecase not found' }, { status: 404 })
    }

    const { data: responses, error: responseError } = await supabase
      .from('usecase_responses')
      .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
      .eq('usecase_id', usecase_id)
      .eq('question_code', 'E4.N7.Q2')

    if (responseError) {
      console.error('Erreur récupération réponses:', responseError)
      return NextResponse.json({ error: 'Failed to fetch questionnaire responses' }, { status: 500 })
    }

    // Extraire et transformer les réponses
    const targetResponses = extractTargetResponses(responses || [])
    const uc = usecase as {
      checklist_gov_enterprise?: string[] | null
      checklist_gov_usecase?: string[] | null
    }
    const transformedData = transformToOpenAIFormat(
      usecase.id, 
      usecase.name, 
      'Non spécifié', // company_name
      targetResponses,
      undefined,      // company_industry
      undefined,      // company_city
      undefined,      // company_country
      uc.checklist_gov_enterprise ?? null,
      uc.checklist_gov_usecase ?? null
    )

    // Valider les données transformées
    const validation = validateOpenAIInput(transformedData)
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid data for analysis', 
        details: validation.errors 
      }, { status: 400 })
    }

    // Générer le nouveau rapport avec OpenAI
    const report = await openAIClient.generateComplianceAnalysis(transformedData)

    // Mettre à jour le rapport dans la base de données
    const { error: updateError } = await supabase
      .from('usecases')
      .update({
        report_summary: report,
        report_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', usecase_id)

    if (updateError) {
      console.error('Erreur mise à jour rapport:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update report in database',
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      report,
      success: true,
      timestamp: new Date().toISOString(),
      usecase_id: usecase.id,
      usecase_name: usecase.name,
      regenerated: true
    })

  } catch (error) {
    console.error('Erreur régénération rapport IA:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la régénération du rapport IA',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}


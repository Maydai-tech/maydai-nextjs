import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { transformToOpenAIFormat, extractTargetResponses, validateOpenAIInput } from '@/lib/openai-data-transformer'
import { openAIClient } from '@/lib/openai-client'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: usecase_id } = await params
    
    if (!usecase_id) {
      return NextResponse.json({ error: 'usecase_id is required' }, { status: 400 })
    }

    // Récupérer les informations du use case
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('id, name')
      .eq('id', usecase_id)
      .single()

    if (usecaseError || !usecase) {
      return NextResponse.json({ error: 'Usecase not found' }, { status: 404 })
    }

    // Récupérer les réponses du questionnaire pour les questions E4.N7.Q2 et E5.N9.Q7
    const { data: responses, error: responseError } = await supabase
      .from('usecase_responses')
      .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
      .eq('usecase_id', usecase_id)
      .in('question_code', ['E4.N7.Q2', 'E5.N9.Q7'])

    if (responseError) {
      console.error('Erreur récupération réponses:', responseError)
      return NextResponse.json({ error: 'Failed to fetch questionnaire responses' }, { status: 500 })
    }

    if (!responses || responses.length === 0) {
      return NextResponse.json({ 
        error: 'No questionnaire responses found for this use case' 
      }, { status: 404 })
    }

    // Extraire et transformer les réponses
    const targetResponses = extractTargetResponses(responses)
    const transformedData = transformToOpenAIFormat(
      usecase.id, 
      usecase.name, 
      'Non spécifié', // company_name
      targetResponses,
      undefined,      // company_industry
      undefined,      // company_city
      undefined       // company_country
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
        report_generated_at: new Date().toISOString()
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


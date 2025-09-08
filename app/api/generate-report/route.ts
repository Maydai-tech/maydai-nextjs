import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { transformToEnhancedOpenAIFormat, extractAllResponses, validateEnhancedOpenAIInput } from '@/lib/openai-enhanced-transformer'
import { enhancedOpenAIClient } from '@/lib/openai-enhanced-client'

// GET: Récupérer un rapport existant
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const usecase_id = searchParams.get('usecase_id')
    
    if (!usecase_id) {
      return NextResponse.json({ error: 'usecase_id is required' }, { status: 400 })
    }

    // Utiliser le client Supabase configuré
    
    // Récupérer le use case avec le rapport
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('id, name, report_summary, report_generated_at')
      .eq('id', usecase_id)
      .single()

    if (usecaseError || !usecase) {
      return NextResponse.json({ error: 'Usecase not found' }, { status: 404 })
    }

    if (!usecase.report_summary) {
      return NextResponse.json({ 
        error: 'No report found for this use case',
        has_report: false 
      }, { status: 404 })
    }

    return NextResponse.json({
      report: usecase.report_summary,
      generated_at: usecase.report_generated_at,
      usecase_id: usecase.id,
      usecase_name: usecase.name,
      has_report: true
    })

  } catch (error) {
    console.error('Erreur récupération rapport:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération du rapport',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}

// POST: Générer un rapport d'analyse IA pour un use case
export async function POST(req: NextRequest) {
  try {
    const { usecase_id } = await req.json()
    
    if (!usecase_id) {
      return NextResponse.json({ error: 'usecase_id is required' }, { status: 400 })
    }

    // Utiliser le client Supabase configuré
    
    // Récupérer les informations complètes du use case
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select(`
        id, name, description, deployment_date, status, risk_level, ai_category, 
        system_type, responsible_service, deployment_countries, company_status,
        score_base, score_model, score_final, is_eliminated, elimination_reason,
        last_calculation_date, technology_partner, llm_model_version, primary_model_id,
        companies(name, industry, city, country),
        compl_ai_models(id, model_name, model_provider, model_type, version)
      `)
      .eq('id', usecase_id)
      .single()

    if (usecaseError || !usecase) {
      return NextResponse.json({ error: 'Usecase not found' }, { status: 404 })
    }

    // Récupérer toutes les réponses du questionnaire
    const { data: responses, error: responseError } = await supabase
      .from('usecase_responses')
      .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
      .eq('usecase_id', usecase_id)

    if (responseError) {
      console.error('Erreur récupération réponses:', responseError)
      return NextResponse.json({ error: 'Failed to fetch questionnaire responses' }, { status: 500 })
    }

    // Extraire et transformer toutes les réponses
    const allResponses = extractAllResponses(responses || [])
    const transformedData = transformToEnhancedOpenAIFormat(usecase as any, allResponses)

    // Valider les données transformées
    const validation = validateEnhancedOpenAIInput(transformedData)
    if (!validation.isValid) {
      console.log('⚠️ Données insuffisantes pour l\'analyse OpenAI:', validation.errors)
      return NextResponse.json({ 
        error: 'Données insuffisantes pour l\'analyse. Veuillez compléter le questionnaire d\'abord.', 
        details: validation.errors,
        requires_questionnaire: true
      }, { status: 400 })
    }

    // Générer l'analyse avec OpenAI
    const analysis = await enhancedOpenAIClient.generateComplianceAnalysis(transformedData)

    // Sauvegarder le rapport dans la base de données
    const { error: saveError } = await supabase
      .from('usecases')
      .update({ 
        report_summary: analysis,
        report_generated_at: new Date().toISOString()
      })
      .eq('id', usecase_id)

    if (saveError) {
      console.error('Erreur sauvegarde rapport:', saveError)
      return NextResponse.json({ 
        error: 'Failed to save report to database',
        details: saveError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      report: analysis,
      success: true,
      timestamp: new Date().toISOString(),
      usecase_id: usecase.id,
      usecase_name: usecase.name,
      saved_to_db: true
    })

  } catch (error) {
    console.error('Erreur génération rapport IA:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération du rapport IA',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}
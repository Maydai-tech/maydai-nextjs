import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { transformToOpenAIFormatComplete, validateOpenAIInput } from '@/lib/openai-data-transformer'
import { openAIClient } from '@/lib/openai-client'
import { extractNextStepsFromReport, validateNextStepsData, logExtractionResults } from '@/lib/nextsteps-parser'
import { errorMonitor, createErrorReport, createPerformanceMetrics } from '@/lib/error-monitor'

// Fonction de retry automatique pour la génération d'analyse avec timeout
async function generateAnalysisWithRetry(transformedData: any, usecaseId: string, maxRetries: number = 3): Promise<string> {
  let lastError: Error | null = null
  const timeoutMs = 60000 // 60 secondes de timeout par tentative
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentative ${attempt}/${maxRetries} de génération d'analyse pour le cas d'usage ${usecaseId}`)
      console.log(`⏱️  Timeout configuré: ${timeoutMs}ms`)
      
      // Créer un timeout pour cette tentative
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout après ${timeoutMs}ms`)), timeoutMs)
      })
      
      // Exécuter la génération avec timeout
      const analysisPromise = openAIClient.generateComplianceAnalysisComplete(transformedData)
      const analysis = await Promise.race([analysisPromise, timeoutPromise])
      
      if (attempt > 1) {
        console.log(`✅ Succès à la tentative ${attempt} pour le cas d'usage ${usecaseId}`)
      }
      
      return analysis
      
    } catch (error) {
      lastError = error as Error
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isTimeout = errorMessage.includes('Timeout')
      
      // Enregistrer l'erreur dans le monitoring
      errorMonitor.logError(createErrorReport(
        usecaseId,
        isTimeout ? 'timeout' : 'openai',
        errorMessage,
        attempt,
        maxRetries,
        {
          transformedDataValid: !!transformedData.usecase_context_fields?.cas_usage?.id,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined
        }
      ))
      
      console.error(`❌ Échec tentative ${attempt}/${maxRetries} pour le cas d'usage ${usecaseId}:`)
      console.error(`   - Type d'erreur: ${errorMessage}`)
      console.error(`   - Est un timeout: ${isTimeout}`)
      
      if (attempt === maxRetries) {
        console.error(`💥 Toutes les tentatives ont échoué pour le cas d'usage ${usecaseId}`)
        throw new Error(`Échec de génération après ${maxRetries} tentatives: ${errorMessage}`)
      }
      
      // Attendre avant la prochaine tentative (backoff exponentiel)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10 secondes
      console.log(`⏳ Attente de ${delay}ms avant la tentative ${attempt + 1}...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError || new Error('Erreur inconnue lors de la génération d\'analyse')
}

// GET: Récupérer un rapport existant
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const usecase_id = searchParams.get('usecase_id')

    if (!usecase_id) {
      return NextResponse.json({ error: 'usecase_id is required' }, { status: 400 })
    }

    // ===== AUTHENTIFICATION =====
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Token d\'authentification manquant' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    // Vérifier la validité du token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

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
  let body: any
  try {
    body = await req.json()
  } catch (parseError) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { usecase_id } = body

    if (!usecase_id) {
      return NextResponse.json({ error: 'usecase_id is required' }, { status: 400 })
    }

    // ===== AUTHENTIFICATION =====
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Token d\'authentification manquant' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    // Vérifier la validité du token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Récupérer les informations complètes du use case avec l'entreprise et le modèle
    const { data: usecase, error: usecaseError } = await supabase
    .from('usecases')
    .select(`
      id, name, description, deployment_date, status, risk_level, ai_category,
      system_type, responsible_service, deployment_countries, company_status,
      technology_partner, llm_model_version, primary_model_id,
      score_base, score_model, score_final, is_eliminated, elimination_reason,
      companies(name, industry, city, country),
      compl_ai_models(id, model_name, model_provider, model_type, version)
    `)
    .eq('id', usecase_id)
    .single()

    if (usecaseError || !usecase) {
      return NextResponse.json({ error: 'Usecase not found' }, { status: 404 })
    }

    // Récupérer TOUTES les réponses du questionnaire (pas seulement 2 questions)
    const { data: responses, error: responseError } = await supabase
    .from('usecase_responses')
    .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values, answered_by')
    .eq('usecase_id', usecase_id)

    if (responseError) {
      console.error('Erreur récupération réponses:', responseError)
      return NextResponse.json({ error: 'Failed to fetch questionnaire responses' }, { status: 500 })
    }

    // Extraire les informations d'entreprise
    const company = Array.isArray(usecase.companies) ? usecase.companies[0] : usecase.companies
    const companyName = company?.name || 'MaydAI'
    const companyIndustry = company?.industry
    const companyCity = company?.city
    const companyCountry = company?.country

    // Extraire les informations du modèle
    const model = Array.isArray(usecase.compl_ai_models) ? usecase.compl_ai_models[0] : usecase.compl_ai_models
    
    // Extraire le profil du répondant
    const respondentEmail = responses?.[0]?.answered_by || 'Non disponible'
    
    const transformedData = transformToOpenAIFormatComplete(
      usecase as any, // Cast temporaire pour éviter les erreurs de type
      company,
      model,
      responses || [],
      respondentEmail
    )

    // Logs de diagnostic détaillés
    console.log('🔍 DIAGNOSTIC DÉTAILLÉ DES DONNÉES:')
    console.log(`   - ID du cas d'usage: ${usecase_id}`)
    console.log(`   - Nom du cas: ${usecase.name}`)
    console.log(`   - Nombre de réponses: ${responses?.length || 0}`)
    console.log(`   - Entreprise: ${company?.name || 'N/A'}`)
    console.log(`   - Modèle: ${model?.model_name || 'N/A'}`)
    console.log(`   - Email répondant: ${respondentEmail}`)
    console.log(`   - Données transformées valides: ${!!transformedData.usecase_context_fields?.cas_usage?.id}`)

    // Valider les données transformées (validation simplifiée pour le nouveau format)
    if (!transformedData.usecase_context_fields?.cas_usage?.id) {
      console.error('❌ ÉCHEC DE VALIDATION - Données insuffisantes pour l\'analyse OpenAI')
      console.error('🔍 Détails de la validation:')
      console.error(`   - usecase_context_fields: ${!!transformedData.usecase_context_fields}`)
      console.error(`   - cas_usage: ${!!transformedData.usecase_context_fields?.cas_usage}`)
      console.error(`   - cas_usage.id: ${transformedData.usecase_context_fields?.cas_usage?.id || 'MANQUANT'}`)
      console.error(`   - Structure complète:`, JSON.stringify(transformedData.usecase_context_fields, null, 2))
      
      // Enregistrer l'erreur de validation
      errorMonitor.logError(createErrorReport(
        usecase_id,
        'validation',
        'Données insuffisantes pour l\'analyse OpenAI',
        1,
        1,
        {
          has_responses: (responses?.length || 0) > 0,
          has_company: !!company,
          has_model: !!model,
          transformed_data_valid: !!transformedData.usecase_context_fields?.cas_usage?.id,
          transformedDataStructure: transformedData.usecase_context_fields
        }
      ))
      
      return NextResponse.json({ 
        error: 'Données insuffisantes pour l\'analyse. Veuillez compléter le questionnaire d\'abord.', 
        requires_questionnaire: true,
        debug_info: {
          has_responses: (responses?.length || 0) > 0,
          has_company: !!company,
          has_model: !!model,
          transformed_data_valid: !!transformedData.usecase_context_fields?.cas_usage?.id
        }
      }, { status: 400 })
    }

    // Générer l'analyse avec OpenAI (nouveau format complet) avec retry automatique
    const startTime = Date.now()
    let analysis: string
    let success = false
    let attempt = 1
    
    try {
      analysis = await generateAnalysisWithRetry(transformedData, usecase_id)
      success = true
    } catch (error) {
      // L'erreur a déjà été loggée dans generateAnalysisWithRetry
      throw error
    }
    
    const processingTime = Date.now() - startTime
    
    // Enregistrer les métriques de performance
    errorMonitor.logPerformance(createPerformanceMetrics(
      usecase_id,
      processingTime,
      success,
      attempt,
      analysis.length
    ))

    // Sauvegarder le rapport dans la base de données avec retry
    const saveStartTime = Date.now()
    let saveError = null
    
    for (let saveAttempt = 1; saveAttempt <= 3; saveAttempt++) {
      try {
        const { error } = await supabase
          .from('usecases')
          .update({ 
            report_summary: analysis,
            report_generated_at: new Date().toISOString()
          })
          .eq('id', usecase_id)

        if (!error) {
          console.log(`✅ Rapport sauvegardé avec succès (tentative ${saveAttempt})`)
          break
        }
        
        saveError = error
        
        if (saveAttempt < 3) {
          console.log(`⚠️ Échec sauvegarde tentative ${saveAttempt}, retry dans 1s...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
      } catch (err) {
        saveError = err
        if (saveAttempt < 3) {
          console.log(`⚠️ Erreur sauvegarde tentative ${saveAttempt}, retry dans 1s...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    if (saveError) {
      console.error('❌ Échec sauvegarde rapport après 3 tentatives:', saveError)
      
      // Enregistrer l'erreur de base de données
      const errorMessage = saveError instanceof Error ? saveError.message : String(saveError)
      errorMonitor.logError(createErrorReport(
        usecase_id,
        'database',
        `Échec sauvegarde rapport: ${errorMessage}`,
        1,
        1,
        { saveError: errorMessage }
      ))
      
      return NextResponse.json({ 
        error: 'Failed to save report to database',
        details: errorMessage
      }, { status: 500 })
    }
    
    const saveTime = Date.now() - saveStartTime
    console.log(`💾 Sauvegarde terminée en ${saveTime}ms`)

    // 🚀 ÉTAPE 1 : Extraire les prochaines étapes structurées du rapport
    console.log('🔍 Extraction des prochaines étapes depuis le rapport...')
    const extractedNextSteps = extractNextStepsFromReport(analysis)
    
    // Ajouter l'usecase_id et les métadonnées aux données extraites
    const nextStepsData = {
      ...extractedNextSteps,
      usecase_id: usecase_id,
      model_version: model?.version || 'openai-gpt-4',
      processing_time_ms: processingTime
    }

    // Valider les données extraites
    const validation = validateNextStepsData(nextStepsData)
    logExtractionResults(analysis, nextStepsData, validation)

    // Sauvegarder les prochaines étapes structurées dans la table usecase_nextsteps
    let nextStepsSaved = false
    let nextStepsError = null

    if (validation.isValid) {
      try {
        // Utiliser UPSERT pour mettre à jour ou insérer les données
        const { error: nextStepsSaveError } = await supabase
          .from('usecase_nextsteps')
          .upsert(nextStepsData, { 
            onConflict: 'usecase_id',
            ignoreDuplicates: false 
          })

        if (nextStepsSaveError) {
          console.error('❌ Erreur sauvegarde prochaines étapes:', nextStepsSaveError)
          nextStepsError = nextStepsSaveError.message
        } else {
          console.log('✅ Prochaines étapes sauvegardées avec succès')
          nextStepsSaved = true
        }
      } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde des prochaines étapes:', error)
        nextStepsError = error instanceof Error ? error.message : 'Erreur inconnue'
      }
    } else {
      console.warn('⚠️ Données de prochaines étapes non valides, sauvegarde ignorée')
    }

    return NextResponse.json({ 
      report: analysis,
      success: true,
      timestamp: new Date().toISOString(),
      usecase_id: usecase.id,
      usecase_name: usecase.name,
      saved_to_db: true,
      // Informations sur l'extraction des prochaines étapes
      next_steps_extracted: validation.isValid,
      next_steps_saved: nextStepsSaved,
      next_steps_validation: {
        isValid: validation.isValid,
        warnings: validation.warnings,
        missingFields: validation.missingFields
      },
      next_steps_error: nextStepsError,
      processing_time_ms: processingTime
    })

  } catch (error) {
    console.error('========== ERREUR CATCH generate-report ==========')
    console.error('Type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('Message:', error instanceof Error ? error.message : String(error))
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A')
    return NextResponse.json(
      {
        error: 'Erreur lors de la génération du rapport IA',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}
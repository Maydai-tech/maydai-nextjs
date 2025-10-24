import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer, Document } from '@react-pdf/renderer'
import React from 'react'
import { PDFDocument } from '@/app/usecases/[id]/components/pdf/PDFDocument'
import { PDFReportData } from '@/app/usecases/[id]/components/pdf/types'
import { logger, createRequestContext } from '@/lib/secure-logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 DÉBUT génération PDF')
  let resolvedParams: { id: string } | undefined
  let user: any
  try {
    const authHeader = request.headers.get('authorization')
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
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    user = authUser

    // Resolve params
    resolvedParams = await params
    const useCaseId = resolvedParams.id
    console.log('📋 UseCase ID:', useCaseId)

    // Fetch the use case with all related data
    const { data: useCase, error: useCaseError } = await supabase
      .from('usecases')
      .select(`
        *,
        companies(
          id,
          name,
          industry,
          city,
          country
        ),
        compl_ai_models(
          id,
          model_name,
          model_provider,
          model_type,
          version
        )
      `)
      .eq('id', useCaseId)
      .single()

    if (useCaseError) {
      if (useCaseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
      }
      const context = createRequestContext(request)
      logger.error('Failed to fetch use case for PDF generation', useCaseError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error fetching use case' }, { status: 500 })
    }

    // Check if user has access to this use case via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', useCase.company_id)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if use case is completed
    if (useCase.status?.toLowerCase() !== 'completed') {
      return NextResponse.json({ 
        error: 'Use case must be completed to generate PDF report' 
      }, { status: 400 })
    }

    // Use data directly from useCase since separate tables don't exist
    const riskLevelData = {
      risk_level: useCase.risk_level || 'limited',
      justification: 'Classification basée sur les critères de l\'AI Act'
    }

    // Récupérer les réponses pour calculer les category_scores
    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
      .eq('usecase_id', useCaseId)

    if (responsesError) {
      console.error('⚠️ Error fetching responses:', responsesError)
    }

    // Calculer le score complet pour obtenir les category_scores avec gestion d'erreur
    let fullScoreData
    try {
      const { calculateScore } = await import('@/app/usecases/[id]/utils/score-calculator')
      fullScoreData = await calculateScore(useCaseId, responses || [], supabase)
      console.log('✅ Score calculé avec succès:', fullScoreData)
    } catch (scoreError) {
      console.error('⚠️ Erreur lors du calcul du score, utilisation des valeurs par défaut:', scoreError)
      // Valeurs par défaut en cas d'erreur de calcul
      fullScoreData = {
        score: useCase.score_final || 0,
        is_eliminated: false,
        category_scores: []
      }
    }

    const scoreData = {
      score: useCase.score_final || fullScoreData.score || 0,
      is_eliminated: fullScoreData.is_eliminated || false,
      category_scores: fullScoreData.category_scores || []
    }

    // Récupérer les données nextSteps depuis la table usecase_nextsteps
    const { data: nextSteps, error: nextStepsError } = await supabase
      .from('usecase_nextsteps')
      .select('*')
      .eq('usecase_id', useCaseId)
      .single()

    if (nextStepsError) {
      console.error('Error fetching nextSteps:', nextStepsError)
    }

    const nextStepsData = nextSteps || {
      recommendations: 'Voir les recommandations détaillées dans le rapport',
      timeline: 'Mise en œuvre progressive sur 6 mois',
      introduction: '',
      evaluation: '',
      priorite_1: '',
      priorite_2: '',
      priorite_3: '',
      quick_win_1: '',
      quick_win_2: '',
      quick_win_3: '',
      action_1: '',
      action_2: '',
      action_3: ''
    }

    // Use user data directly since profile table structure may have changed
    const profileData = {
      email: user.email,
      first_name: user.user_metadata?.first_name,
      last_name: user.user_metadata?.last_name
    }

    // Sécuriser l'extraction des données relationnelles
    const companyData = Array.isArray(useCase.companies) ? useCase.companies[0] : useCase.companies
    const modelData = Array.isArray(useCase.compl_ai_models) ? useCase.compl_ai_models[0] : useCase.compl_ai_models

    console.log('🏢 Company data:', companyData)
    console.log('🤖 Model data:', modelData)

    // Préparer les données useCase avec les relations sécurisées
    const safeUseCase = {
      ...useCase,
      companies: companyData ? {
        id: companyData.id || '',
        name: companyData.name || 'Entreprise non spécifiée',
        industry: companyData.industry || 'Non spécifié',
        city: companyData.city || 'Non spécifié',
        country: companyData.country || 'Non spécifié'
      } : {
        id: '',
        name: 'Entreprise non spécifiée',
        industry: 'Non spécifié',
        city: 'Non spécifié',
        country: 'Non spécifié'
      },
      compl_ai_models: modelData ? {
        id: modelData.id || '',
        model_name: modelData.model_name || 'Modèle non spécifié',
        model_provider: modelData.model_provider || 'Fournisseur non spécifié',
        model_type: modelData.model_type || 'Type non spécifié',
        version: modelData.version || 'Version non spécifiée'
      } : {
        id: '',
        model_name: 'Modèle non spécifié',
        model_provider: 'Fournisseur non spécifié',
        model_type: 'Type non spécifié',
        version: 'Version non spécifiée'
      }
    }

    // Prepare PDF data
    const pdfData: PDFReportData = {
      useCase: safeUseCase,
      riskLevel: {
        risk_level: riskLevelData.risk_level,
        justification: riskLevelData.justification
      },
      score: {
        score: scoreData.score,
        is_eliminated: scoreData.is_eliminated,
        category_scores: scoreData.category_scores
      },
      nextSteps: nextStepsData,
      profile: {
        email: profileData.email || 'thomas@mayday-consulting.ai',
        first_name: profileData.first_name,
        last_name: profileData.last_name
      },
      generatedDate: new Date().toISOString()
    }

    // Generate PDF
    console.log('🔄 Génération PDF en cours...')
    console.log('📊 Données PDF:', JSON.stringify(pdfData, null, 2))
    console.log('🔍 Vérification des composants PDF...')
    console.log('PDFDocument:', typeof PDFDocument)
    
    let buffer: Buffer
    try {
      console.log('🎨 Début du rendu PDF...')
      // CORRECTION CRITIQUE: Utiliser directement PDFDocument sans double wrapper Document
      // PDFDocument contient déjà un <Document> wrapper, pas besoin d'en ajouter un autre
      const pdfElement = React.createElement(PDFDocument, { data: pdfData })
      buffer = await renderToBuffer(pdfElement as any)
      console.log('✅ PDF généré avec succès, taille:', buffer.length, 'bytes')
    } catch (renderError) {
      console.error('🚨 ERREUR RENDU PDF:', renderError)
      console.error('Stack:', renderError instanceof Error ? renderError.stack : 'Pas de stack')
      console.error('Message:', renderError instanceof Error ? renderError.message : String(renderError))
      
      // Log détaillé des données PDF en cas d'erreur pour debugging
      console.error('📊 Données PDF complètes lors de l\'erreur:')
      console.error(JSON.stringify(pdfData, null, 2))
      
      // Distinguer les types d'erreurs
      if (renderError instanceof Error) {
        if (renderError.message.includes('Document')) {
          console.error('🔍 Erreur liée au composant Document - possible double wrapper')
        } else if (renderError.message.includes('undefined')) {
          console.error('🔍 Erreur liée à des propriétés undefined dans les données')
        } else if (renderError.message.includes('render')) {
          console.error('🔍 Erreur de rendu des composants PDF')
        }
      }
      
      throw renderError
    }
    
    // Generate filename
    const useCaseName = useCase.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'rapport'
    const date = new Date().toISOString().split('T')[0]
    const filename = `rapport-audit-${useCaseName}-${date}.pdf`

    // Log successful generation
    const context = createRequestContext(request)
    logger.info('PDF report generated successfully', { 
      ...context, 
      useCaseId, 
      filename,
      generatedBy: user.email 
    })

    // Return PDF as response
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('PDF generation error', error, context)
    
    // Log détaillé pour debugging
    console.error('🚨 ERREUR PDF DÉTAILLÉE:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'Pas de stack')
    console.error('Message:', error instanceof Error ? error.message : String(error))
    
    // Log du contexte de l'erreur
    console.error('📋 Contexte de l\'erreur:')
    console.error('- UseCase ID:', resolvedParams?.id || 'Non disponible')
    console.error('- User ID:', user?.id || 'Non disponible')
    console.error('- User Email:', user?.email || 'Non disponible')
    
    // Déterminer le type d'erreur pour un message plus précis
    let errorMessage = 'Internal server error during PDF generation'
    let errorDetails = error instanceof Error ? error.message : String(error)
    
    if (error instanceof Error) {
      if (error.message.includes('Document')) {
        errorMessage = 'Erreur de structure du document PDF'
        errorDetails = 'Problème de configuration du composant Document'
      } else if (error.message.includes('render')) {
        errorMessage = 'Erreur de rendu des composants PDF'
        errorDetails = 'Impossible de générer le contenu du PDF'
      } else if (error.message.includes('undefined') || error.message.includes('null')) {
        errorMessage = 'Données manquantes pour la génération PDF'
        errorDetails = 'Certaines données requises ne sont pas disponibles'
      } else if (error.message.includes('score') || error.message.includes('category')) {
        errorMessage = 'Erreur de calcul des scores'
        errorDetails = 'Impossible de calculer les scores de conformité'
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        useCaseId: resolvedParams?.id,
        userId: user?.id,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}

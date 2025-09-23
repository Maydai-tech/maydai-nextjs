import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface CSVRow {
  model_name: string
  model_provider: string
  model_type: string
  version: string
  principle_code: string
  benchmark_code: string
  score: number | null
  score_text: string
  evaluation_date: string
}

interface ImportStats {
  totalRows: number
  modelsCreated: number
  modelsUpdated: number
  evaluationsCreated: number
  evaluationsUpdated: number
  errors: string[]
  warnings: string[]
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token d\'authentification manquant' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Vérifier les droits admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
    }

    // Récupérer les données CSV
    const { csvData, updateMode } = await request.json()
    
    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json({ error: 'Données CSV invalides' }, { status: 400 })
    }

    const stats: ImportStats = {
      totalRows: csvData.length,
      modelsCreated: 0,
      modelsUpdated: 0,
      evaluationsCreated: 0,
      evaluationsUpdated: 0,
      errors: [],
      warnings: []
    }

    // Récupérer tous les principes et benchmarks pour validation
    const { data: principlesData } = await supabase
      .from('compl_ai_principles')
      .select(`
        id,
        code,
        name,
        compl_ai_benchmarks (
          id,
          code,
          name
        )
      `)

    const principleMap = new Map<string, any>()
    const benchmarkMap = new Map<string, any>()
    
    principlesData?.forEach(principle => {
      principleMap.set(principle.code, principle)
      principle.compl_ai_benchmarks?.forEach(benchmark => {
        benchmarkMap.set(benchmark.code, { ...benchmark, principle_id: principle.id })
      })
    })

    // Traiter chaque ligne du CSV
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i]
      const rowNumber = i + 2 // +2 car on compte l'en-tête

      try {
        // Validation des données obligatoires
        if (!row.model_name || !row.principle_code || !row.benchmark_code) {
          stats.errors.push(`Ligne ${rowNumber}: Nom du modèle, code principe et code benchmark sont obligatoires`)
          continue
        }

        // Validation du principe
        const principle = principleMap.get(row.principle_code)
        if (!principle) {
          stats.errors.push(`Ligne ${rowNumber}: Principe '${row.principle_code}' non trouvé`)
          continue
        }

        // Validation du benchmark
        const benchmark = benchmarkMap.get(row.benchmark_code)
        if (!benchmark) {
          stats.errors.push(`Ligne ${rowNumber}: Benchmark '${row.benchmark_code}' non trouvé`)
          continue
        }

        // Validation du score si fourni
        let score: number | null = null
        if (row.score !== null && row.score !== undefined && row.score !== '') {
          score = parseFloat(row.score)
          if (isNaN(score) || score < 0 || score > 1) {
            stats.errors.push(`Ligne ${rowNumber}: Score doit être un nombre entre 0 et 1`)
            continue
          }
        }

        // Gestion du modèle (upsert)
        let modelId: string
        
        // Chercher le modèle existant
        const { data: existingModel } = await supabase
          .from('compl_ai_models')
          .select('id')
          .eq('model_name', row.model_name)
          .single()

        if (existingModel) {
          // Mettre à jour le modèle existant
          const { error: updateError } = await supabase
            .from('compl_ai_models')
            .update({
              model_provider: row.model_provider || null,
              model_type: row.model_type || null,
              version: row.version || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingModel.id)

          if (updateError) {
            stats.errors.push(`Ligne ${rowNumber}: Erreur mise à jour modèle - ${updateError.message}`)
            continue
          }

          modelId = existingModel.id
          stats.modelsUpdated++
        } else {
          // Créer un nouveau modèle
          const { data: newModel, error: insertError } = await supabase
            .from('compl_ai_models')
            .insert({
              model_name: row.model_name,
              model_provider: row.model_provider || null,
              model_type: row.model_type || null,
              version: row.version || null
            })
            .select()
            .single()

          if (insertError) {
            stats.errors.push(`Ligne ${rowNumber}: Erreur création modèle - ${insertError.message}`)
            continue
          }

          modelId = newModel.id
          stats.modelsCreated++
        }

        // Gestion de l'évaluation
        if (score !== null) {
          // Chercher l'évaluation existante
          const { data: existingEvaluation } = await supabase
            .from('compl_ai_evaluations')
            .select('id')
            .eq('model_id', modelId)
            .eq('benchmark_id', benchmark.id)
            .single()

          const evaluationData = {
            model_id: modelId,
            principle_id: principle.id,
            benchmark_id: benchmark.id,
            score: score,
            score_text: row.score_text || `${Math.round(score * 100)}%`,
            evaluation_date: row.evaluation_date || new Date().toISOString().split('T')[0],
            data_source: 'csv-import',
            raw_data: {
              csv_import: true,
              imported_by: user.id,
              import_timestamp: new Date().toISOString(),
              row_number: rowNumber
            }
          }

          if (existingEvaluation) {
            // Mettre à jour l'évaluation existante
            if (updateMode === 'update') {
              const { error: updateError } = await supabase
                .from('compl_ai_evaluations')
                .update(evaluationData)
                .eq('id', existingEvaluation.id)

              if (updateError) {
                stats.errors.push(`Ligne ${rowNumber}: Erreur mise à jour évaluation - ${updateError.message}`)
                continue
              }

              stats.evaluationsUpdated++
            } else {
              stats.warnings.push(`Ligne ${rowNumber}: Évaluation existante ignorée (mode: ${updateMode})`)
            }
          } else {
            // Créer une nouvelle évaluation
            const { error: insertError } = await supabase
              .from('compl_ai_evaluations')
              .insert(evaluationData)

            if (insertError) {
              stats.errors.push(`Ligne ${rowNumber}: Erreur création évaluation - ${insertError.message}`)
              continue
            }

            stats.evaluationsCreated++
          }
        } else {
          stats.warnings.push(`Ligne ${rowNumber}: Aucun score fourni, évaluation ignorée`)
        }

      } catch (error) {
        stats.errors.push(`Ligne ${rowNumber}: Erreur inattendue - ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Import CSV terminé',
      stats
    })

  } catch (error) {
    console.error('Erreur import CSV COMPL-AI:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

// Route pour télécharger le template CSV
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token d\'authentification manquant' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Vérifier les droits admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
    }

    // Récupérer tous les principes et benchmarks pour créer le template
    const { data: principlesData } = await supabase
      .from('compl_ai_principles')
      .select(`
        code,
        name,
        category,
        compl_ai_benchmarks (
          code,
          name
        )
      `)
      .order('code')

    // Créer le template CSV
    const headers = [
      'model_name',
      'model_provider', 
      'model_type',
      'version',
      'principle_code',
      'benchmark_code',
      'score',
      'score_text',
      'evaluation_date'
    ]

    const templateRows = [headers.join(',')]
    
    // Ajouter des exemples pour chaque principe
    principlesData?.forEach(principle => {
      principle.compl_ai_benchmarks?.slice(0, 2).forEach(benchmark => {
        const exampleRow = [
          'exemple-modele-ia',
          'OpenAI',
          'large-language-model',
          '4.0',
          principle.code,
          benchmark.code,
          '0.85',
          '85%',
          new Date().toISOString().split('T')[0]
        ]
        templateRows.push(exampleRow.join(','))
      })
    })

    const csvContent = templateRows.join('\n')
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="compl-ai-import-template.csv"'
      }
    })

  } catch (error) {
    console.error('Erreur génération template CSV:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}



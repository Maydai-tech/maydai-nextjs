import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth } from '@/lib/admin-auth'

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

interface NormalizeScoreResult {
  score: number | null
  isNA: boolean
  error: string | null
}

/**
 * Normalise une valeur de score depuis le CSV
 * Gère les valeurs "N/A", "n/a", "NA", "na" (insensible à la casse) en les convertissant en null
 * @param value - Valeur à normaliser (string, number, null, undefined)
 * @returns Résultat avec score normalisé, flag isNA, et éventuelle erreur
 */
function normalizeScore(value: string | number | null | undefined): NormalizeScoreResult {
  // Cas null ou undefined
  if (value === null || value === undefined) {
    return { score: null, isNA: false, error: null }
  }

  // Cas chaîne vide
  if (typeof value === 'string' && value.trim() === '') {
    return { score: null, isNA: false, error: null }
  }

  // Cas "N/A" (insensible à la casse)
  if (typeof value === 'string') {
    const trimmedValue = value.trim().toLowerCase()
    if (trimmedValue === 'n/a' || trimmedValue === 'na') {
      return { score: null, isNA: true, error: null }
    }
  }

  // Cas nombre valide
  const numValue = typeof value === 'number' ? value : parseFloat(String(value))
  
  if (!isNaN(numValue)) {
    if (numValue >= 0 && numValue <= 1) {
      return { score: numValue, isNA: false, error: null }
    } else {
      return { score: null, isNA: false, error: 'Score doit être un nombre entre 0 et 1' }
    }
  }

  // Cas valeur non numérique invalide (autre que N/A)
  return { score: null, isNA: false, error: 'Score doit être un nombre entre 0 et 1' }
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const authResult = await verifyAdminAuth(request)
    if (authResult.error) {
      return authResult.error
    }

    const currentUser = authResult.user!
    
    // Créer le client Supabase avec la clé de service pour contourner RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

        // Validation et normalisation du score
        const scoreResult = normalizeScore(row.score)
        if (scoreResult.error) {
          stats.errors.push(`Ligne ${rowNumber}: ${scoreResult.error}`)
          continue
        }
        const score: number | null = scoreResult.score

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
        // Chercher l'évaluation existante (récupérer aussi le score existant)
        const { data: existingEvaluation, error: evaluationError } = await supabase
          .from('compl_ai_evaluations')
          .select('id, score')
          .eq('model_id', modelId)
          .eq('benchmark_id', benchmark.id)
          .maybeSingle()

        // Vérifier s'il y a une erreur (avec .maybeSingle(), une erreur signifie un problème réel)
        if (evaluationError) {
          stats.errors.push(`Ligne ${rowNumber}: Erreur lors de la recherche d'évaluation - ${evaluationError.message}`)
          continue
        }

        // Si évaluation existe avec un score non-null et qu'on importe N/A, préserver l'évaluation existante
        if (existingEvaluation && existingEvaluation.score !== null && score === null) {
          stats.warnings.push(`Ligne ${rowNumber}: Évaluation existante avec score, ignorée (import N/A)`)
        } else {
          // Préparer les données de l'évaluation
          const scoreText = score !== null 
            ? (row.score_text || `${Math.round(score * 100)}%`)
            : (row.score_text || 'N/A')

          const evaluationData = {
            model_id: modelId,
            principle_id: principle.id,
            benchmark_id: benchmark.id,
            score: score,
            score_text: scoreText,
            evaluation_date: row.evaluation_date || new Date().toISOString().split('T')[0],
            data_source: 'csv-import',
            raw_data: {
              csv_import: true,
              imported_by: currentUser.id,
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
    // Vérifier l'authentification admin
    const authResult = await verifyAdminAuth(request)
    if (authResult.error) {
      return authResult.error
    }

    // Créer le client Supabase avec la clé de service pour contourner RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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



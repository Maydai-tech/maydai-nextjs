import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth } from '@/lib/admin-auth'
import {
  buildComplAiWideCsv,
  isUuid,
  parseComplAiModelCsvRow,
  summarizeComplAiCsvImport,
  type ComplAiCsvScore,
} from '@/lib/bench-llm/compl-ai-csv'
import { recalculateUseCaseScoresForModel } from '@/lib/usecase-score-service'

// Un import peut toucher plusieurs modèles et déclencher le recalcul de nombreux
// use cases : on autorise une exécution plus longue (recalcul synchrone).
export const maxDuration = 300

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

async function importBenchmarkScore(input: {
  supabase: ReturnType<typeof createClient>
  benchmarkMap: Map<string, { id: string; principle_id: string }>
  modelId: string
  cell: ComplAiCsvScore
  rowNumber: number
  replaceExisting: boolean
  importedBy: string
  stats: ImportStats
}): Promise<boolean> {
  const { supabase, benchmarkMap, modelId, cell, rowNumber, replaceExisting, importedBy, stats } = input
  const benchmark = benchmarkMap.get(cell.benchmark_code)
  if (!benchmark) {
    stats.errors.push(`Ligne ${rowNumber}: Benchmark '${cell.benchmark_code}' non trouvé`)
    return false
  }

  const scoreResult = normalizeScore(cell.score)
  if (scoreResult.error || scoreResult.score === null) {
    stats.errors.push(`Ligne ${rowNumber}, ${cell.benchmark_code}: ${scoreResult.error || 'Score vide'}`)
    return false
  }
  const score = scoreResult.score

  const { data: existingEvaluation, error: evaluationError } = await supabase
    .from('compl_ai_evaluations')
    .select('id, score, evaluation_date')
    .eq('model_id', modelId)
    .eq('benchmark_id', benchmark.id)
    .maybeSingle()

  if (evaluationError) {
    stats.errors.push(`Ligne ${rowNumber}: Erreur lors de la recherche d'évaluation - ${evaluationError.message}`)
    return false
  }

  const evaluationData = {
    model_id: modelId,
    principle_id: benchmark.principle_id,
    benchmark_id: benchmark.id,
    score,
    score_text: cell.score_text || `${Math.round(score * 100)}%`,
    evaluation_date: cell.evaluation_date || existingEvaluation?.evaluation_date || new Date().toISOString().split('T')[0],
    data_source: 'csv-import',
    raw_data: {
      csv_import: true,
      imported_by: importedBy,
      import_timestamp: new Date().toISOString(),
      row_number: rowNumber,
      benchmark_code: cell.benchmark_code,
    },
  }

  if (existingEvaluation) {
    if (!replaceExisting) {
      stats.warnings.push(`Ligne ${rowNumber}: Évaluation ${cell.benchmark_code} existante ignorée`)
      return false
    }
    const { error: updateError } = await supabase
      .from('compl_ai_evaluations')
      .update(evaluationData)
      .eq('id', existingEvaluation.id)
    if (updateError) {
      stats.errors.push(`Ligne ${rowNumber}: Erreur mise à jour évaluation - ${updateError.message}`)
      return false
    }
    stats.evaluationsUpdated++
    return true
  }

  const { error: insertError } = await supabase
    .from('compl_ai_evaluations')
    .insert(evaluationData)
  if (insertError) {
    stats.errors.push(`Ligne ${rowNumber}: Erreur création évaluation - ${insertError.message}`)
    return false
  }
  stats.evaluationsCreated++
  return true
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
    const replaceExisting = updateMode === 'update' || updateMode === true
    
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

    // Modèles dont au moins une évaluation a réellement changé (création/màj) :
    // ils déclencheront un recalcul automatique des scores après l'import.
    const touchedModelIds = new Set<string>()

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

    const benchmarkMap = new Map<string, { id: string; principle_id: string }>()
    const benchmarkCodes: string[] = []
    principlesData?.forEach(principle => {
      principle.compl_ai_benchmarks?.forEach(benchmark => {
        benchmarkCodes.push(benchmark.code)
        benchmarkMap.set(benchmark.code, { id: benchmark.id, principle_id: principle.id })
      })
    })

    // Traiter chaque ligne du CSV : une ligne = un modèle, une colonne = un benchmark.
    for (let i = 0; i < csvData.length; i++) {
      const row = parseComplAiModelCsvRow(csvData[i], benchmarkCodes)
      const rowNumber = i + 2 // +2 car on compte l'en-tête

      try {
        if (!row.model_name) {
          stats.errors.push(`Ligne ${rowNumber}: Nom du modèle obligatoire`)
          continue
        }

        // Gestion du modèle (upsert) : UUID d'export d'abord, sinon nom exact
        let modelId: string
        let existingModel: { id: string } | null = null

        if (row.model_id) {
          const { data } = await supabase
            .from('compl_ai_models')
            .select('id')
            .eq('id', row.model_id)
            .maybeSingle()
          existingModel = data
        }

        if (!existingModel) {
          const { data } = await supabase
            .from('compl_ai_models')
            .select('id')
            .eq('model_name', row.model_name)
            .maybeSingle()
          existingModel = data
        }

        if (existingModel) {
          const modelUpdates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          }
          if (row.model_name && !isUuid(row.model_name)) {
            modelUpdates.model_name = row.model_name
          }
          if (row.model_provider) modelUpdates.model_provider = row.model_provider
          if (row.model_type) modelUpdates.model_type = row.model_type
          if (row.version) modelUpdates.version = row.version
          if (row.lifecycle_status) modelUpdates.lifecycle_status = row.lifecycle_status

          const { error: updateError } = await supabase
            .from('compl_ai_models')
            .update(modelUpdates)
            .eq('id', existingModel.id)

          if (updateError) {
            stats.errors.push(`Ligne ${rowNumber}: Erreur mise à jour modèle - ${updateError.message}`)
            continue
          }

          modelId = existingModel.id
          stats.modelsUpdated++
        } else {
          const insertPayload: Record<string, unknown> = {
            model_name: row.model_name,
            model_provider: row.model_provider || null,
            model_type: row.model_type || null,
            version: row.version || null,
            lifecycle_status: row.lifecycle_status,
          }
          if (row.model_id) insertPayload.id = row.model_id

          const { data: newModel, error: insertError } = await supabase
            .from('compl_ai_models')
            .insert(insertPayload)
            .select()
            .single()

          if (insertError) {
            stats.errors.push(`Ligne ${rowNumber}: Erreur création modèle - ${insertError.message}`)
            continue
          }

          modelId = newModel.id
          stats.modelsCreated++
        }

        for (const cell of row.scores) {
          const saved = await importBenchmarkScore({
            supabase,
            benchmarkMap,
            modelId,
            cell,
            rowNumber,
            replaceExisting,
            importedBy: currentUser.id,
            stats,
          })
          if (saved) touchedModelIds.add(modelId)
        }

      } catch (error) {
        stats.errors.push(`Ligne ${rowNumber}: Erreur inattendue - ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      }
    }

    // Recalcul automatique des scores des use cases impactés par les modèles modifiés.
    // Une erreur de recalcul ne fait pas échouer l'import (les scores modèle sont déjà persistés).
    let usecasesRecalculated = 0
    for (const modelId of touchedModelIds) {
      try {
        const summary = await recalculateUseCaseScoresForModel(modelId)
        usecasesRecalculated += summary.success_count
      } catch (recalcError) {
        const msg = recalcError instanceof Error ? recalcError.message : 'Erreur inconnue'
        stats.warnings.push(`Recalcul automatique des scores échoué pour le modèle ${modelId}: ${msg}`)
      }
    }

    const summary = summarizeComplAiCsvImport(stats)
    return NextResponse.json({
      success: summary.success,
      message: summary.message,
      error: summary.success ? undefined : summary.message,
      stats,
      models_recalculated: touchedModelIds.size,
      usecases_recalculated: usecasesRecalculated
    }, { status: summary.httpStatus })

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
    const benchmarkCodes = [...(principlesData ?? [])]
      .sort((a, b) => a.code.localeCompare(b.code))
      .flatMap((principle) =>
        [...(principle.compl_ai_benchmarks ?? [])].sort((a, b) => a.code.localeCompare(b.code)),
      )
      .map((benchmark) => benchmark.code)

    const csvContent = buildComplAiWideCsv({
      benchmarkCodes,
      models: [
        {
          id: '',
          model_name: 'exemple-modele-ia',
          model_provider: 'OpenAI',
          model_type: 'large-language-model',
          version: '4.0',
          statusLabel: 'Actif',
        },
      ],
      scores: benchmarkCodes[0]
        ? [{ modelId: '', benchmarkCode: benchmarkCodes[0], score: 0.85 }]
        : [],
    })
    
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



/**
 * Script pour régénérer les nextSteps à partir d'un rapport existant
 * Utile pour corriger les cas d'usage où les nextSteps sont vides
 * 
 * Usage: npx tsx scripts/regenerate-nextsteps.ts <usecase_id>
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { extractNextStepsFromReport, validateNextStepsData } from '../lib/nextsteps-parser'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function regenerateNextSteps(usecaseId: string) {
  console.log('🔄 === RÉGÉNÉRATION DES NEXTSTEPS ===\n')
  console.log(`📋 ID: ${usecaseId}\n`)

  // 1. Récupérer le rapport
  console.log('1️⃣ Récupération du rapport...')
  const { data: usecase, error: usecaseError } = await supabase
    .from('usecases')
    .select('id, name, report_summary, report_generated_at, compl_ai_models(version)')
    .eq('id', usecaseId)
    .single()

  if (usecaseError || !usecase) {
    console.error('❌ Erreur lors de la récupération du use case:', usecaseError)
    return
  }

  if (!usecase.report_summary) {
    console.error('❌ Aucun rapport trouvé pour ce cas d\'usage')
    console.error('   → Le rapport doit être généré d\'abord via /api/generate-report')
    return
  }

  console.log(`✅ Rapport trouvé (${usecase.report_summary.length} caractères)\n`)

  // 2. Extraire les nextSteps
  console.log('2️⃣ Extraction des nextSteps...')
  const extractedData = extractNextStepsFromReport(usecase.report_summary)

  if (Object.keys(extractedData).length === 0) {
    console.error('❌ Aucune donnée extraite du rapport')
    console.error('   → Le format du rapport n\'est peut-être pas reconnu')
    return
  }

  console.log(`✅ ${Object.keys(extractedData).length} champs extraits\n`)

  // 3. Préparer les données pour la sauvegarde
  const model = Array.isArray(usecase.compl_ai_models) 
    ? usecase.compl_ai_models[0] 
    : usecase.compl_ai_models

  const nextStepsData = {
    ...extractedData,
    usecase_id: usecaseId,
    model_version: model?.version || 'openai-gpt-4',
    processing_time_ms: 0
  }

  // 4. Valider les données
  console.log('3️⃣ Validation des données...')
  const validation = validateNextStepsData(nextStepsData)

  if (!validation.isValid) {
    console.error('❌ Validation échouée:', validation.missingFields)
    return
  }

  if (validation.warnings.length > 0) {
    console.log('⚠️ Avertissements:', validation.warnings)
  }

  console.log('✅ Validation OK\n')

  // 5. Sauvegarder dans la base de données
  console.log('4️⃣ Sauvegarde dans usecase_nextsteps...')
  const { error: saveError } = await supabase
    .from('usecase_nextsteps')
    .upsert(nextStepsData, {
      onConflict: 'usecase_id',
      ignoreDuplicates: false
    })

  if (saveError) {
    console.error('❌ Erreur lors de la sauvegarde:', saveError)
    return
  }

  console.log('✅ NextSteps sauvegardés avec succès\n')

  // 6. Afficher un résumé
  console.log('📊 === RÉSUMÉ ===\n')
  console.log('Champs sauvegardés:')
  if (nextStepsData.introduction) console.log('  ✅ Introduction')
  if (nextStepsData.evaluation) console.log('  ✅ Évaluation')
  if (nextStepsData.impact) console.log('  ✅ Impact')
  if (nextStepsData.conclusion) console.log('  ✅ Conclusion')
  if (nextStepsData.priorite_1) console.log('  ✅ Priorité 1')
  if (nextStepsData.priorite_2) console.log('  ✅ Priorité 2')
  if (nextStepsData.priorite_3) console.log('  ✅ Priorité 3')
  if (nextStepsData.quick_win_1) console.log('  ✅ Quick win 1')
  if (nextStepsData.quick_win_2) console.log('  ✅ Quick win 2')
  if (nextStepsData.quick_win_3) console.log('  ✅ Quick win 3')
  if (nextStepsData.action_1) console.log('  ✅ Action 1')
  if (nextStepsData.action_2) console.log('  ✅ Action 2')
  if (nextStepsData.action_3) console.log('  ✅ Action 3')

  console.log('\n✅ Régénération terminée avec succès\n')
}

// Point d'entrée
const usecaseId = process.argv[2]

if (!usecaseId) {
  console.error('❌ Usage: npx tsx scripts/regenerate-nextsteps.ts <usecase_id>')
  console.error('   Exemple: npx tsx scripts/regenerate-nextsteps.ts 5f6c216e-6ed5-47d1-a61e-266c5b4fe91e')
  process.exit(1)
}

regenerateNextSteps(usecaseId)
  .then(() => {
    console.log('✅ Script terminé')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur:', error)
    process.exit(1)
  })








































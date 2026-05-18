/**
 * Script pour tester le parser mis à jour avec le cas d'usage problématique
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { extractNextStepsFromReport, validateNextStepsData, logExtractionResults } from '../lib/nextsteps-parser'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testParser(usecaseId: string) {
  console.log('🧪 === TEST DU PARSER MIS À JOUR ===\n')
  console.log(`📋 ID: ${usecaseId}\n`)

  // Récupérer le rapport
  const { data: usecase } = await supabase
    .from('usecases')
    .select('id, name, report_summary')
    .eq('id', usecaseId)
    .single()

  if (!usecase?.report_summary) {
    console.error('❌ Aucun rapport trouvé')
    return
  }

  console.log('📄 Rapport trouvé:', usecase.report_summary.length, 'caractères\n')

  // Tester l'extraction
  console.log('🔍 Extraction des nextSteps...\n')
  const extractedData = extractNextStepsFromReport(usecase.report_summary)

  // Valider les données extraites
  const nextStepsData = {
    ...extractedData,
    usecase_id: usecaseId,
    model_version: 'openai-gpt-4',
    processing_time_ms: 0
  }

  const validation = validateNextStepsData(nextStepsData)
  logExtractionResults(usecase.report_summary, nextStepsData, validation)

  // Afficher les résultats
  console.log('\n📊 === RÉSULTATS DE L\'EXTRACTION ===\n')
  console.log('Champs extraits:', Object.keys(extractedData).length)
  console.log('Validation:', validation.isValid ? '✅ OK' : '❌ ERREUR')
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️ Avertissements:', validation.warnings)
  }

  // Afficher un aperçu des données extraites
  console.log('\n📋 Aperçu des données extraites:')
  if (extractedData.introduction) {
    console.log(`\n✅ Introduction (${extractedData.introduction.length} caractères):`)
    console.log(extractedData.introduction.substring(0, 150) + '...')
  }
  
  if (extractedData.evaluation) {
    console.log(`\n✅ Évaluation (${extractedData.evaluation.length} caractères):`)
    console.log(extractedData.evaluation.substring(0, 150) + '...')
  }

  if (extractedData.priorite_1) {
    console.log(`\n✅ Priorité 1: ${extractedData.priorite_1.substring(0, 100)}...`)
  }
  if (extractedData.priorite_2) {
    console.log(`\n✅ Priorité 2: ${extractedData.priorite_2.substring(0, 100)}...`)
  }
  if (extractedData.priorite_3) {
    console.log(`\n✅ Priorité 3: ${extractedData.priorite_3.substring(0, 100)}...`)
  }

  if (extractedData.quick_win_1) {
    console.log(`\n✅ Quick win 1: ${extractedData.quick_win_1.substring(0, 100)}...`)
  }

  if (extractedData.action_1) {
    console.log(`\n✅ Action 1: ${extractedData.action_1.substring(0, 100)}...`)
  }

  console.log('\n✅ Test terminé\n')
}

const usecaseId = process.argv[2] || '5f6c216e-6ed5-47d1-a61e-266c5b4fe91e'

testParser(usecaseId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur:', error)
    process.exit(1)
  })








































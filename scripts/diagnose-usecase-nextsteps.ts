/**
 * Script de diagnostic pour analyser pourquoi les nextSteps sont vides
 * pour un cas d'usage spécifique
 * 
 * Usage: npx tsx scripts/diagnose-usecase-nextsteps.ts <usecase_id>
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { extractNextStepsFromReport, validateNextStepsData, logExtractionResults } from '../lib/nextsteps-parser'

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function diagnoseUseCase(usecaseId: string) {
  console.log('🔍 === DIAGNOSTIC CAS D\'USAGE ===')
  console.log(`📋 ID: ${usecaseId}\n`)

  // 1. Vérifier les informations de base du use case
  console.log('1️⃣ Vérification des informations de base...')
  const { data: usecase, error: usecaseError } = await supabase
    .from('usecases')
    .select('id, name, status, report_summary, report_generated_at, created_at, updated_at')
    .eq('id', usecaseId)
    .single()

  if (usecaseError) {
    console.error('❌ Erreur lors de la récupération du use case:', usecaseError)
    return
  }

  if (!usecase) {
    console.error('❌ Cas d\'usage non trouvé')
    return
  }

  console.log('✅ Cas d\'usage trouvé:')
  console.log(`   - Nom: ${usecase.name}`)
  console.log(`   - Statut: ${usecase.status}`)
  console.log(`   - Créé le: ${usecase.created_at}`)
  console.log(`   - Mis à jour le: ${usecase.updated_at}`)
  console.log(`   - Rapport généré le: ${usecase.report_generated_at || 'NON GÉNÉRÉ'}`)
  console.log(`   - Rapport présent: ${!!usecase.report_summary}`)
  console.log(`   - Taille du rapport: ${usecase.report_summary?.length || 0} caractères\n`)

  // 2. Vérifier les nextSteps
  console.log('2️⃣ Vérification des nextSteps...')
  const { data: nextSteps, error: nextStepsError } = await supabase
    .from('usecase_nextsteps')
    .select('*')
    .eq('usecase_id', usecaseId)
    .single()

  if (nextStepsError && nextStepsError.code !== 'PGRST116') {
    console.error('❌ Erreur lors de la récupération des nextSteps:', nextStepsError)
  } else if (nextStepsError && nextStepsError.code === 'PGRST116') {
    console.log('⚠️ Aucun enregistrement nextSteps trouvé (code PGRST116)')
  } else if (nextSteps) {
    console.log('✅ Enregistrement nextSteps trouvé:')
    const fields = Object.keys(nextSteps)
    const filledFields = fields.filter(key => nextSteps[key] !== null && nextSteps[key] !== undefined && nextSteps[key] !== '')
    const emptyFields = fields.filter(key => nextSteps[key] === null || nextSteps[key] === undefined || nextSteps[key] === '')
    
    console.log(`   - Champs remplis: ${filledFields.length}/${fields.length}`)
    console.log(`   - Champs vides: ${emptyFields.length}/${fields.length}`)
    
    if (filledFields.length > 0) {
      console.log('   - Champs remplis:', filledFields.join(', '))
    }
    if (emptyFields.length > 0) {
      console.log('   - Champs vides:', emptyFields.join(', '))
    }
  }
  console.log('')

  // 3. Analyser le rapport si présent
  if (usecase.report_summary) {
    console.log('3️⃣ Analyse du rapport...')
    const report = usecase.report_summary
    
    // Vérifier la présence des sections attendues
    const sections = {
      'Introduction contextuelle': /## Introduction contextuelle\s*\n/i,
      'Évaluation du niveau de risque AI Act': /## Évaluation du niveau de risque AI Act\s*\n/i,
      'Les 3 priorités d\'actions réglementaires': /### Les 3 priorités d'actions réglementaires\s*\n/i,
      'Quick wins & actions immédiates recommandées': /### Quick wins & actions immédiates recommandées\s*\n/i,
      'Actions à moyen terme': /### Actions à moyen terme\s*\n/i,
      'Impact attendu': /## Impact attendu\s*\n/i,
      'Conclusion': /## Conclusion\s*\n/i,
    }

    console.log('   Vérification des sections Markdown:')
    const foundSections: string[] = []
    const missingSections: string[] = []

    for (const [sectionName, regex] of Object.entries(sections)) {
      if (regex.test(report)) {
        foundSections.push(sectionName)
        console.log(`   ✅ ${sectionName}`)
      } else {
        missingSections.push(sectionName)
        console.log(`   ❌ ${sectionName}`)
      }
    }

    console.log(`\n   Résumé: ${foundSections.length}/${Object.keys(sections).length} sections trouvées`)

    // Tester l'extraction
    console.log('\n4️⃣ Test de l\'extraction des nextSteps...')
    const extractedData = extractNextStepsFromReport(report)
    
    console.log('   Données extraites:')
    const extractedFields = Object.keys(extractedData).filter(key => extractedData[key as keyof typeof extractedData])
    console.log(`   - Champs extraits: ${extractedFields.length}`)
    
    if (extractedFields.length > 0) {
      console.log('   - Champs:', extractedFields.join(', '))
      
      // Afficher un aperçu des données extraites
      if (extractedData.introduction) {
        console.log(`   - Introduction (${extractedData.introduction.length} caractères): ${extractedData.introduction.substring(0, 100)}...`)
      }
      if (extractedData.priorite_1) {
        console.log(`   - Priorité 1: ${extractedData.priorite_1.substring(0, 100)}...`)
      }
      if (extractedData.quick_win_1) {
        console.log(`   - Quick win 1: ${extractedData.quick_win_1.substring(0, 100)}...`)
      }
    } else {
      console.log('   ⚠️ Aucune donnée extraite!')
    }

    // Valider les données extraites
    const nextStepsData = {
      ...extractedData,
      usecase_id: usecaseId,
      model_version: 'openai-gpt-4',
      processing_time_ms: 0
    }

    const validation = validateNextStepsData(nextStepsData)
    logExtractionResults(report, nextStepsData, validation)

    console.log('\n5️⃣ Analyse détaillée du format du rapport...')
    
    // Vérifier le format des priorités
    const prioritiesMatch = report.match(/### Les 3 priorités d'actions réglementaires\s*\n([\s\S]*?)(?=###|##|$)/i)
    if (prioritiesMatch) {
      const prioritiesSection = prioritiesMatch[1]
      const priorityMatches = prioritiesSection.match(/\*\*([^*]+)\*\*\s*([^\n]+)/g)
      console.log(`   - Section priorités trouvée (${prioritiesSection.length} caractères)`)
      console.log(`   - Patterns trouvés: ${priorityMatches?.length || 0}`)
      if (priorityMatches) {
        priorityMatches.forEach((match: string, index: number) => {
          console.log(`     ${index + 1}. ${match.substring(0, 80)}...`)
        })
      } else {
        console.log('   ⚠️ Aucun pattern **Titre** description trouvé dans les priorités')
        console.log('   - Aperçu de la section:')
        console.log(prioritiesSection.substring(0, 200))
      }
    } else {
      console.log('   ❌ Section priorités non trouvée')
    }

    // Vérifier le format des quick wins
    const quickWinsMatch = report.match(/### Quick wins & actions immédiates recommandées\s*\n([\s\S]*?)(?=###|##|$)/i)
    if (quickWinsMatch) {
      const quickWinsSection = quickWinsMatch[1]
      const quickWinMatches = quickWinsSection.match(/\*\*([^*]+)\*\*\s*([^\n]+)/g)
      console.log(`   - Section quick wins trouvée (${quickWinsSection.length} caractères)`)
      console.log(`   - Patterns trouvés: ${quickWinMatches?.length || 0}`)
      if (quickWinMatches) {
        quickWinMatches.forEach((match: string, index: number) => {
          console.log(`     ${index + 1}. ${match.substring(0, 80)}...`)
        })
      } else {
        console.log('   ⚠️ Aucun pattern **Titre** description trouvé dans les quick wins')
        console.log('   - Aperçu de la section:')
        console.log(quickWinsSection.substring(0, 200))
      }
    } else {
      console.log('   ❌ Section quick wins non trouvée')
    }

    // Vérifier le format des actions à moyen terme
    const actionsMatch = report.match(/### Actions à moyen terme\s*\n([\s\S]*?)(?=###|##|$)/i)
    if (actionsMatch) {
      const actionsSection = actionsMatch[1]
      const actionMatches = actionsSection.match(/\*\*([^*]+)\*\*\s*([^\n]+)/g)
      console.log(`   - Section actions trouvée (${actionsSection.length} caractères)`)
      console.log(`   - Patterns trouvés: ${actionMatches?.length || 0}`)
      if (actionMatches) {
        actionMatches.forEach((match: string, index: number) => {
          console.log(`     ${index + 1}. ${match.substring(0, 80)}...`)
        })
      } else {
        console.log('   ⚠️ Aucun pattern **Titre** description trouvé dans les actions')
        console.log('   - Aperçu de la section:')
        console.log(actionsSection.substring(0, 200))
      }
    } else {
      console.log('   ❌ Section actions non trouvée')
    }

  } else {
    console.log('3️⃣ ⚠️ Aucun rapport trouvé - Le rapport n\'a probablement jamais été généré')
  }

  // 4. Vérifier les réponses du questionnaire
  console.log('\n6️⃣ Vérification des réponses du questionnaire...')
  const { data: responses, error: responsesError } = await supabase
    .from('usecase_responses')
    .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main')
    .eq('usecase_id', usecaseId)

  if (responsesError) {
    console.error('❌ Erreur lors de la récupération des réponses:', responsesError)
  } else {
    console.log(`   - Nombre de réponses: ${responses?.length || 0}`)
    if (responses && responses.length > 0) {
      console.log('   - Questions répondues:')
      responses.forEach(response => {
        const answer = response.single_value || 
                      (response.multiple_labels?.join(', ') || response.multiple_codes?.join(', ')) ||
                      response.conditional_main ||
                      'Aucune réponse'
        console.log(`     - ${response.question_code}: ${answer.substring(0, 60)}`)
      })
    } else {
      console.log('   ⚠️ Aucune réponse trouvée')
    }
  }

  // 5. Résumé et recommandations
  console.log('\n📊 === RÉSUMÉ DU DIAGNOSTIC ===')
  
  if (!usecase.report_summary) {
    console.log('❌ PROBLÈME IDENTIFIÉ: Le rapport n\'a jamais été généré')
    console.log('   → Solution: Générer le rapport via POST /api/generate-report')
  } else if (!nextSteps || Object.values(nextSteps).every(v => v === null || v === '')) {
    console.log('❌ PROBLÈME IDENTIFIÉ: Le rapport existe mais les nextSteps sont vides')
    
    const extractedData = extractNextStepsFromReport(usecase.report_summary)
    const hasExtractedData = Object.keys(extractedData).some(key => extractedData[key as keyof typeof extractedData])
    
    if (!hasExtractedData) {
      console.log('   → Cause probable: L\'extraction a échoué (format du rapport non conforme)')
      console.log('   → Solution: Vérifier le format du rapport généré par OpenAI')
      console.log('   → Vérifier que les sections suivent exactement le format attendu:')
      console.log('      - ## Introduction contextuelle')
      console.log('      - ## Évaluation du niveau de risque AI Act')
      console.log('      - ### Les 3 priorités d\'actions réglementaires')
      console.log('      - ### Quick wins & actions immédiates recommandées')
      console.log('      - ### Actions à moyen terme')
      console.log('      - ## Impact attendu')
      console.log('      - ## Conclusion')
    } else {
      console.log('   → Cause probable: L\'extraction a fonctionné mais la sauvegarde a échoué')
      console.log('   → Solution: Vérifier les logs serveur lors de la génération du rapport')
    }
  } else {
    console.log('✅ Les nextSteps sont présents et remplis')
  }

  console.log('\n🔍 === FIN DU DIAGNOSTIC ===\n')
}

// Point d'entrée
const usecaseId = process.argv[2]

if (!usecaseId) {
  console.error('❌ Usage: npx tsx scripts/diagnose-usecase-nextsteps.ts <usecase_id>')
  console.error('   Exemple: npx tsx scripts/diagnose-usecase-nextsteps.ts 5f6c216e-6ed5-47d1-a61e-266c5b4fe91e')
  process.exit(1)
}

diagnoseUseCase(usecaseId)
  .then(() => {
    console.log('✅ Diagnostic terminé')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur lors du diagnostic:', error)
    process.exit(1)
  })


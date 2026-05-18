/**
 * Script de correction : Recalcul de tous les scores avec formule corrigée
 * 
 * Formule corrigée : score_final = (score_base + score_model + 0) / 120 × 100
 * 
 * Usage :
 *   npx tsx scripts/correct-scores-base-120.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

interface CorrectionResult {
  usecaseId: string
  success: boolean
  oldScore?: number
  newScore?: number
  scoreBase?: number
  scoreModel?: number
  error?: string
}

async function correctScoresBase120() {
  console.log('🚀 Démarrage de la correction des scores (base 120, marge 0)...\n')
  
  // Vérifier les variables d'environnement
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables d\'environnement manquantes!')
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
    process.exit(1)
  }
  
  // Créer le client Supabase
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Constantes de la formule
    const MARGIN_SCORE = 0
    const TOTAL_WEIGHT = 120
    
    // Récupérer tous les cas d'usage avec scores
    console.log('📊 Récupération de tous les cas d\'usage avec scores...')
    const { data: usecases, error: fetchError } = await supabase
      .from('usecases')
      .select('id, name, score_base, score_model, score_final, primary_model_id')
      .not('score_final', 'is', null)
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('❌ Erreur lors de la récupération des cas d\'usage:', fetchError)
      process.exit(1)
    }
    
    if (!usecases || usecases.length === 0) {
      console.log('ℹ️  Aucun cas d\'usage avec score trouvé.')
      return
    }
    
    console.log(`✓ ${usecases.length} cas d'usage trouvés\n`)
    
    // Résultats de la correction
    const results: CorrectionResult[] = []
    let successCount = 0
    let errorCount = 0
    
    // Corriger chaque cas d'usage
    for (let i = 0; i < usecases.length; i++) {
      const usecase = usecases[i]
      const progress = `[${i + 1}/${usecases.length}]`
      
      console.log(`${progress} 🔄 Correction du cas "${usecase.name || usecase.id}"...`)
      console.log(`   Score actuel: ${usecase.score_final || 'N/A'}`)
      console.log(`   score_base: ${usecase.score_base || 0}, score_model: ${usecase.score_model || 0}`)
      
      try {
        // Vérifier que score_base existe
        if (usecase.score_base === null || usecase.score_base === undefined) {
          console.log(`   ⚠️  score_base manquant - score ignoré\n`)
          results.push({
            usecaseId: usecase.id,
            success: false,
            oldScore: usecase.score_final,
            error: 'score_base manquant'
          })
          continue
        }
        
        // Recalculer score_model depuis les évaluations COMPL-AI
        // Le score_model = global_average_original_score × 20
        // global_average_original_score = moyenne des moyennes par principe des scores originaux
        let modelScore = usecase.score_model || 0
        
        if (usecase.primary_model_id) {
          // Récupérer les évaluations COMPL-AI avec scores originaux
          const { data: evaluations } = await supabase
            .from('compl_ai_evaluations')
            .select('score, principle_id')
            .eq('model_id', usecase.primary_model_id)
            .not('score', 'is', null)
          
          if (evaluations && evaluations.length > 0) {
            // Calculer la moyenne par principe (score original)
            const principleScores: Record<string, number[]> = {}
            evaluations.forEach((e: any) => {
              const principleId = e.principle_id
              if (!principleScores[principleId]) {
                principleScores[principleId] = []
              }
              principleScores[principleId].push(e.score)
            })
            
            // Calculer la moyenne par principe
            const avgByPrinciple: number[] = []
            Object.values(principleScores).forEach(scores => {
              const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length
              avgByPrinciple.push(avg)
            })
            
            // Calculer global_average_original_score (moyenne des moyennes par principe)
            const globalAverageOriginalScore = avgByPrinciple.length > 0
              ? avgByPrinciple.reduce((sum, avg) => sum + avg, 0) / avgByPrinciple.length
              : 0
            
            // score_model = global_average_original_score × 20
            modelScore = globalAverageOriginalScore * 20
            
            console.log(`   🔄 score_model recalculé: ${modelScore.toFixed(2)}/20`)
            console.log(`   📊 global_average_original_score: ${globalAverageOriginalScore.toFixed(3)}`)
            console.log(`   📊 Nombre de principes: ${avgByPrinciple.length}`)
          } else {
            console.log(`   ⚠️  Aucune évaluation COMPL-AI trouvée pour ce modèle`)
          }
        }
        
        // Calculer le nouveau score avec la formule corrigée
        const scoreBrut = (usecase.score_base || 0) + modelScore + MARGIN_SCORE
        const newScoreFinal = (scoreBrut / TOTAL_WEIGHT) * 100
        
        console.log(`   📐 Calcul: (${usecase.score_base} + ${modelScore.toFixed(2)} + ${MARGIN_SCORE}) / ${TOTAL_WEIGHT} × 100`)
        console.log(`   📊 Score brut: ${scoreBrut.toFixed(2)}`)
        console.log(`   ✓ Nouveau score_final: ${newScoreFinal.toFixed(2)}`)
        
        if (usecase.score_final !== null) {
          const delta = newScoreFinal - usecase.score_final
          console.log(`   Δ ${delta > 0 ? '+' : ''}${delta.toFixed(2)} points\n`)
        } else {
          console.log('')
        }
        
        // Mettre à jour le score dans la base de données
        const { error: updateError } = await supabase
          .from('usecases')
          .update({ 
            score_model: modelScore > 0 ? Math.round(modelScore * 100) / 100 : null,
            score_final: Math.round(newScoreFinal * 100) / 100, // Arrondi à 2 décimales
            updated_at: new Date().toISOString()
          })
          .eq('id', usecase.id)
        
        if (updateError) {
          throw new Error(`Erreur mise à jour: ${updateError.message}`)
        }
        
        results.push({
          usecaseId: usecase.id,
          success: true,
          oldScore: usecase.score_final,
          newScore: newScoreFinal,
          scoreBase: usecase.score_base,
          scoreModel: modelScore
        })
        
        successCount++
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
        console.error(`   ❌ Erreur: ${errorMessage}\n`)
        
        results.push({
          usecaseId: usecase.id,
          success: false,
          oldScore: usecase.score_final,
          error: errorMessage
        })
        
        errorCount++
      }
    }
    
    // Afficher le résumé
    console.log('\n' + '='.repeat(60))
    console.log('📊 RÉSUMÉ DE LA CORRECTION')
    console.log('='.repeat(60))
    console.log(`Total des cas d'usage: ${usecases.length}`)
    console.log(`✓ Succès: ${successCount}`)
    console.log(`✗ Erreurs: ${errorCount}`)
    
    // Statistiques des changements
    const successfulResults = results.filter(r => r.success && r.oldScore && r.newScore)
    if (successfulResults.length > 0) {
      const avgChange = successfulResults.reduce((sum, r) => {
        return sum + (r.newScore! - r.oldScore!)
      }, 0) / successfulResults.length
      
      const minChange = Math.min(...successfulResults.map(r => r.newScore! - r.oldScore!))
      const maxChange = Math.max(...successfulResults.map(r => r.newScore! - r.oldScore!))
      
      console.log(`\n📈 Changement moyen de score: ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)} points`)
      console.log(`📉 Changement min: ${minChange > 0 ? '+' : ''}${minChange.toFixed(2)} points`)
      console.log(`📈 Changement max: ${maxChange > 0 ? '+' : ''}${maxChange.toFixed(2)} points`)
    }
    
    // Afficher les erreurs si présentes
    if (errorCount > 0) {
      console.log('\n⚠️  ERREURS DÉTECTÉES:')
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.usecaseId}: ${r.error}`)
      })
    }
    
    // Vérifier le cas LinkedIn spécifiquement
    const linkedinCase = results.find(r => r.usecaseId === 'bb7b4244-c698-465b-bbbd-9ec647673e4a')
    if (linkedinCase && linkedinCase.success) {
      console.log('\n🎯 CAS LINKEDIN (bb7b4244-c698-465b-bbbd-9ec647673e4a):')
      console.log(`   score_base: ${linkedinCase.scoreBase}`)
      console.log(`   score_model: ${linkedinCase.scoreModel}`)
      console.log(`   score_final: ${linkedinCase.newScore?.toFixed(2)}`)
      console.log(`   Attendu: 63.42% (si score_base=60, score_model=16.1)`)
    }
    
    console.log('\n✅ Correction terminée!')
    
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error)
    process.exit(1)
  }
}

// Exécuter le script
correctScoresBase120()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erreur:', error)
    process.exit(1)
  })


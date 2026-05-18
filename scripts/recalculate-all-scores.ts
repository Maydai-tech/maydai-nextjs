/**
 * Script de migration : Recalcul de tous les scores existants
 * 
 * Ce script recalcule tous les scores des cas d'usage avec la nouvelle base 110
 * (au lieu de l'ancienne base 120).
 * 
 * Usage :
 *   npx tsx scripts/recalculate-all-scores.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

interface RecalculationResult {
  usecaseId: string
  success: boolean
  oldScore?: number
  newScore?: number
  error?: string
}

async function recalculateAllScores() {
  console.log('🚀 Démarrage du recalcul de tous les scores...\n')
  
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
    // Récupérer tous les cas d'usage
    console.log('📊 Récupération de tous les cas d\'usage...')
    const { data: usecases, error: fetchError } = await supabase
      .from('usecases')
      .select('id, name, score_final, score_base, score_model')
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('❌ Erreur lors de la récupération des cas d\'usage:', fetchError)
      process.exit(1)
    }
    
    if (!usecases || usecases.length === 0) {
      console.log('ℹ️  Aucun cas d\'usage trouvé.')
      return
    }
    
    console.log(`✓ ${usecases.length} cas d'usage trouvés\n`)
    
    // Résultats de la migration
    const results: RecalculationResult[] = []
    let successCount = 0
    let errorCount = 0
    
    // Recalculer chaque cas d'usage
    for (let i = 0; i < usecases.length; i++) {
      const usecase = usecases[i]
      const progress = `[${i + 1}/${usecases.length}]`
      
      console.log(`${progress} 🔄 Recalcul du cas "${usecase.name || usecase.id}"...`)
      console.log(`   Score final actuel: ${usecase.score_final || 'N/A'}`)
      
      try {
        // Récupérer les réponses pour ce cas d'usage
        const { data: responses, error: responsesError } = await supabase
          .from('usecase_responses')
          .select('*')
          .eq('usecase_id', usecase.id)
        
        if (responsesError) {
          throw new Error(`Erreur récupération réponses: ${responsesError.message}`)
        }
        
        if (!responses || responses.length === 0) {
          console.log(`   ⚠️  Aucune réponse trouvée - score ignoré\n`)
          results.push({
            usecaseId: usecase.id,
            success: false,
            oldScore: usecase.score_final,
            error: 'Aucune réponse'
          })
          continue
        }
        
        // Récupérer le score COMPL-AI si disponible
        const { data: complAiScore } = await supabase
          .from('compl_ai_scores')
          .select('score')
          .eq('usecase_id', usecase.id)
          .maybeSingle()
        
        // Calculer le nouveau score en utilisant les fonctions mises à jour
        const { calculateBaseScore, calculateFinalScore } = await import('../lib/score-calculator-simple')
        
        const baseScoreResult = calculateBaseScore(responses)
        const modelScore = complAiScore?.score || null
        const finalScoreResult = calculateFinalScore(baseScoreResult, modelScore, usecase.id)
        
        // Mettre à jour les scores dans la base de données
        const { error: updateError } = await supabase
          .from('usecases')
          .update({ 
            score_base: finalScoreResult.scores.score_base,
            score_model: finalScoreResult.scores.score_model,
            score_final: finalScoreResult.scores.score_final,
            is_eliminated: finalScoreResult.scores.is_eliminated,
            elimination_reason: finalScoreResult.scores.elimination_reason,
            last_calculation_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', usecase.id)
        
        if (updateError) {
          throw new Error(`Erreur mise à jour: ${updateError.message}`)
        }
        
        console.log(`   ✓ Nouveau score final: ${finalScoreResult.scores.score_final}`)
        console.log(`   ✓ Score base: ${finalScoreResult.scores.score_base}/90`)
        console.log(`   ✓ Score modèle: ${finalScoreResult.scores.score_model || 'N/A'}/20`)
        console.log(`   ${usecase.score_final ? `Δ ${(finalScoreResult.scores.score_final - usecase.score_final).toFixed(2)}` : ''}\n`)
        
        results.push({
          usecaseId: usecase.id,
          success: true,
          oldScore: usecase.score_final,
          newScore: finalScoreResult.scores.score_final
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
    console.log('📊 RÉSUMÉ DE LA MIGRATION')
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
      
      console.log(`\n📈 Changement moyen de score: ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)} points`)
    }
    
    // Afficher les erreurs si présentes
    if (errorCount > 0) {
      console.log('\n⚠️  ERREURS DÉTECTÉES:')
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.usecaseId}: ${r.error}`)
      })
    }
    
    console.log('\n✅ Migration terminée!')
    
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error)
    process.exit(1)
  }
}

// Exécuter le script
recalculateAllScores()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erreur:', error)
    process.exit(1)
  })


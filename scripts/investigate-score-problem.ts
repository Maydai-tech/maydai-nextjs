/**
 * Script d'investigation : Problème de chute des scores
 * 
 * Analyse détaillée du cas bb7b4244-c698-465b-bbbd-9ec647673e4a
 * et comparaison avec d'autres cas
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function investigateScoreProblem() {
  console.log('🔍 === INVESTIGATION DU PROBLÈME DE SCORES ===\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables d\'environnement manquantes!')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // ===== PARTIE 1: ANALYSER LE CAS SPÉCIFIQUE =====
  console.log('📊 PARTIE 1: Analyse du cas bb7b4244-c698-465b-bbbd-9ec647673e4a\n')
  
  const targetUsecaseId = 'bb7b4244-c698-465b-bbbd-9ec647673e4a'
  
  const { data: usecase, error: usecaseError } = await supabase
    .from('usecases')
    .select('id, name, score_base, score_model, score_final, last_calculation_date, created_at')
    .eq('id', targetUsecaseId)
    .single()
  
  if (usecaseError || !usecase) {
    console.error('❌ Erreur récupération cas d\'usage:', usecaseError)
  } else {
    console.log('✅ Cas d\'usage trouvé:')
    console.log('   ID:', usecase.id)
    console.log('   Nom:', usecase.name)
    console.log('   Créé le:', usecase.created_at)
    console.log('   Dernière MAJ:', usecase.last_calculation_date)
    console.log('\n🔢 SCORES ACTUELS EN DB:')
    console.log('   score_base:', usecase.score_base, '/ 90')
    console.log('   score_model:', usecase.score_model, '/ 20')
    console.log('   score_final:', usecase.score_final)
    
    // Calculs théoriques
    console.log('\n🧮 CALCULS THÉORIQUES:')
    
    if (usecase.score_base !== null) {
      const scoreBrutSansModele = usecase.score_base
      const scoreBrutAvecModele = usecase.score_base + (usecase.score_model || 0)
      
      console.log('   Score brut (base seul):', scoreBrutSansModele)
      console.log('   Score brut (base + modèle):', scoreBrutAvecModele)
      
      // Avec base 120
      console.log('\n   Si BASE 120:')
      console.log('     - Score brut max: 110 (90 base + 20 modèle)')
      console.log('     - Conversion: (' + scoreBrutAvecModele + ' / 120) × 100 =', 
        ((scoreBrutAvecModele / 120) * 100).toFixed(2))
      
      // Avec base 110
      console.log('\n   Si BASE 110:')
      console.log('     - Score brut max: 110 (90 base + 20 modèle)')
      console.log('     - Conversion: (' + scoreBrutAvecModele + ' / 110) × 100 =', 
        ((scoreBrutAvecModele / 110) * 100).toFixed(2))
      
      // Avec l'ancien système (base 120 avec marge implicite)
      console.log('\n   Si BASE 120 AVEC MARGE de 10:')
      const scoreBrutAvecMarge = usecase.score_base + 10 + (usecase.score_model || 0)
      console.log('     - Score brut: ' + usecase.score_base + ' + 10 (marge) + ' + 
        (usecase.score_model || 0) + ' (modèle) =', scoreBrutAvecMarge)
      console.log('     - Conversion: (' + scoreBrutAvecMarge + ' / 120) × 100 =', 
        ((scoreBrutAvecMarge / 120) * 100).toFixed(2))
    }
    
    // Récupérer les réponses
    console.log('\n📝 RÉPONSES AU QUESTIONNAIRE:')
    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('*')
      .eq('usecase_id', targetUsecaseId)
    
    if (responsesError) {
      console.error('   ❌ Erreur récupération réponses:', responsesError)
    } else {
      console.log('   Nombre de réponses:', responses?.length || 0)
      
      // Recalcul manuel avec les fonctions actuelles
      if (responses && responses.length > 0) {
        console.log('\n🔄 RECALCUL AVEC LES FONCTIONS ACTUELLES (BASE 110):')
        try {
          const { calculateBaseScore, calculateFinalScore } = await import('../lib/score-calculator-simple')
          
          const baseScoreResult = calculateBaseScore(responses)
          const modelScore = usecase.score_model
          const finalScoreResult = calculateFinalScore(baseScoreResult, modelScore, targetUsecaseId)
          
          console.log('   score_base recalculé:', finalScoreResult.scores.score_base, '/ 90')
          console.log('   score_model:', finalScoreResult.scores.score_model, '/ 20')
          console.log('   score_final recalculé:', finalScoreResult.scores.score_final)
          
          console.log('\n📊 COMPARAISON DB vs RECALCUL:')
          console.log('   score_base:  DB=' + usecase.score_base + ' | Recalculé=' + finalScoreResult.scores.score_base + 
            ' | Δ=' + (finalScoreResult.scores.score_base - (usecase.score_base || 0)).toFixed(2))
          console.log('   score_final: DB=' + usecase.score_final + ' | Recalculé=' + finalScoreResult.scores.score_final + 
            ' | Δ=' + (finalScoreResult.scores.score_final - (usecase.score_final || 0)).toFixed(2))
          
        } catch (error) {
          console.error('   ❌ Erreur lors du recalcul:', error)
        }
      }
    }
  }
  
  // ===== PARTIE 2: ANALYSER D'AUTRES CAS =====
  console.log('\n\n📊 PARTIE 2: Analyse d\'autres cas pour pattern\n')
  
  const { data: otherCases, error: otherError } = await supabase
    .from('usecases')
    .select('id, name, score_base, score_model, score_final, last_calculation_date')
    .not('score_final', 'is', null)
    .order('last_calculation_date', { ascending: false })
    .limit(10)
  
  if (otherError) {
    console.error('❌ Erreur récupération autres cas:', otherError)
  } else if (otherCases) {
    console.log('✅ Analyse de', otherCases.length, 'autres cas récents:\n')
    
    console.log('| Nom | score_base | score_model | score_final | Base 110 | Base 120+10 |')
    console.log('|-----|------------|-------------|-------------|----------|-------------|')
    
    for (const uc of otherCases) {
      const scoreBrut110 = (uc.score_base || 0) + (uc.score_model || 0)
      const scoreBrut120 = (uc.score_base || 0) + (uc.score_model || 0) + 10
      
      const calcul110 = ((scoreBrut110 / 110) * 100).toFixed(1)
      const calcul120 = ((scoreBrut120 / 120) * 100).toFixed(1)
      
      const nom = (uc.name || 'Sans nom').substring(0, 20)
      console.log(`| ${nom.padEnd(20)} | ${String(uc.score_base || 0).padStart(10)} | ${String(uc.score_model || 0).padStart(11)} | ${String(uc.score_final || 0).padStart(11)} | ${calcul110.padStart(8)} | ${calcul120.padStart(11)} |`)
    }
    
    console.log('\n📈 STATISTIQUES:')
    const avgFinalScore = otherCases.reduce((sum, uc) => sum + (uc.score_final || 0), 0) / otherCases.length
    console.log('   Score final moyen:', avgFinalScore.toFixed(2))
    
    const casesWithModel = otherCases.filter(uc => uc.score_model !== null && uc.score_model > 0)
    console.log('   Cas avec score modèle:', casesWithModel.length, '/', otherCases.length)
  }
  
  // ===== PARTIE 3: HYPOTHÈSES =====
  console.log('\n\n🎯 PARTIE 3: Hypothèses sur le problème\n')
  console.log('Hypothèse 1: Le script a RECALCULÉ au lieu de CONVERTIR')
  console.log('  → Les scores ont été recalculés depuis les réponses avec la nouvelle formule')
  console.log('  → Au lieu de simplement convertir les scores existants')
  console.log('')
  console.log('Hypothèse 2: Perte de la marge de 10 points')
  console.log('  → Ancien système: score_base pouvait aller jusqu\'à 100 (90 + 10 marge)')
  console.log('  → Nouveau système: score_base max = 90 (marge supprimée)')
  console.log('  → Résultat: tous les scores ont perdu ~8-10 points')
  console.log('')
  console.log('Hypothèse 3: Double système de stockage')
  console.log('  → Avant: score_final était peut-être un pourcentage calculé différemment')
  console.log('  → Maintenant: score_final utilise la formule (brut/110)*100')
  
  console.log('\n✅ Investigation terminée!')
}

investigateScoreProblem()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Erreur fatale:', error)
    process.exit(1)
  })



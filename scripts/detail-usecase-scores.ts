#!/usr/bin/env npx tsx

/**
 * Script pour afficher les scores détaillés d'un cas d'usage
 * Affiche le score global et les scores par principe
 */

// IMPORTANT: Charger les variables d'environnement AVANT tout autre import
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Charger .env.local de manière synchrone
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value
        }
      }
    }
  })
}

// Maintenant on peut importer les autres modules
import { createClient } from '@supabase/supabase-js'
import { calculateScore } from '../app/usecases/[id]/utils/score-calculator'
import { RISK_CATEGORIES } from '../app/usecases/[id]/utils/risk-categories'

async function displayDetailedScores() {
  const usecaseId = '310f530a-4b59-4100-99d0-3470eeb38597'
  
  console.log('📊 === SCORES DÉTAILLÉS DU CAS D\'USAGE ===\n')
  console.log(`ID: ${usecaseId}\n`)
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables d\'environnement manquantes!')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
    console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // 1. Récupérer les informations du cas d'usage
  console.log('📋 Récupération des données du cas d\'usage...\n')
  const { data: usecase, error: usecaseError } = await supabase
    .from('usecases')
    .select('id, name, score_base, score_model, score_final, is_eliminated, primary_model_id')
    .eq('id', usecaseId)
    .single()
  
  if (usecaseError || !usecase) {
    console.error('❌ Cas d\'usage non trouvé:', usecaseError?.message)
    process.exit(1)
  }
  
  console.log('✅ Cas d\'usage trouvé:', usecase.name)
  console.log('   Score base (DB):', usecase.score_base || 'N/A')
  console.log('   Score modèle (DB):', usecase.score_model || 'N/A')
  console.log('   Score final (DB):', usecase.score_final || 'N/A')
  console.log('   Éliminé:', usecase.is_eliminated ? 'Oui' : 'Non')
  console.log('')
  
  // 2. Récupérer les réponses
  console.log('📝 Récupération des réponses...\n')
  const { data: responses, error: responsesError } = await supabase
    .from('usecase_responses')
    .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
    .eq('usecase_id', usecaseId)
  
  if (responsesError) {
    console.error('❌ Erreur récupération réponses:', responsesError.message)
    process.exit(1)
  }
  
  console.log(`✅ ${responses?.length || 0} réponses trouvées\n`)
  
  // 3. Calculer les scores
  console.log('🧮 Calcul des scores...\n')
  const scoreData = await calculateScore(usecaseId, responses || [], supabase)
  
  // 4. Afficher le score global
  console.log('='.repeat(80))
  console.log('🎯 SCORE GLOBAL')
  console.log('='.repeat(80))
  console.log(`Score: ${scoreData.score.toFixed(2)} / ${scoreData.max_score}`)
  console.log(`Pourcentage: ${((scoreData.score / scoreData.max_score) * 100).toFixed(2)}%`)
  console.log(`Éliminé: ${scoreData.is_eliminated ? 'Oui' : 'Non'}`)
  
  if (scoreData.compl_ai_bonus) {
    console.log(`\nBonus COMPL-AI: ${scoreData.compl_ai_bonus.toFixed(2)} points`)
    if (scoreData.compl_ai_score !== null) {
      console.log(`Score COMPL-AI: ${((scoreData.compl_ai_score || 0) * 100).toFixed(2)}%`)
    }
    if (scoreData.model_info) {
      console.log(`Modèle: ${scoreData.model_info.name} (${scoreData.model_info.provider})`)
    }
  }
  console.log('')
  
  // 5. Afficher les scores par principe
  console.log('='.repeat(80))
  console.log('📊 SCORES PAR PRINCIPE')
  console.log('='.repeat(80))
  console.log('')
  
  // Filtrer les catégories pertinentes (exclure risk_level et prohibited_practices)
  const relevantCategories = scoreData.category_scores.filter(cat => 
    cat.category_id !== 'risk_level' && cat.category_id !== 'prohibited_practices'
  )
  
  // Trier par pourcentage (du plus bas au plus haut pour voir les problèmes en premier)
  relevantCategories.sort((a, b) => a.percentage - b.percentage)
  
  for (const categoryScore of relevantCategories) {
    const category = RISK_CATEGORIES[categoryScore.category_id]
    const barLength = 50
    const filledLength = Math.round((categoryScore.percentage / 100) * barLength)
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)
    
    console.log(`📌 ${category?.shortName || categoryScore.category_name}`)
    console.log(`   Score: ${categoryScore.score.toFixed(2)} / ${categoryScore.max_score}`)
    console.log(`   Pourcentage: ${categoryScore.percentage}%`)
    console.log(`   Questions impactées: ${categoryScore.question_count}`)
    console.log(`   [${bar}] ${categoryScore.percentage}%`)
    console.log('')
  }
  
  // 6. Afficher le breakdown détaillé (Top 10 impacts)
  console.log('='.repeat(80))
  console.log('📋 BREAKDOWN DÉTAILLÉ (Top 10 impacts)')
  console.log('='.repeat(80))
  console.log('')
  
  const topImpacts = [...scoreData.score_breakdown]
    .sort((a, b) => Math.abs(b.score_impact) - Math.abs(a.score_impact))
    .slice(0, 10)
  
  for (const breakdown of topImpacts) {
    const sign = breakdown.score_impact >= 0 ? '+' : ''
    const questionText = breakdown.question_text.length > 60 
      ? breakdown.question_text.substring(0, 60) + '...' 
      : breakdown.question_text
    console.log(`❓ ${questionText}`)
    console.log(`   Impact: ${sign}${breakdown.score_impact.toFixed(2)} points`)
    console.log(`   Raison: ${breakdown.reasoning}`)
    if (breakdown.risk_category) {
      console.log(`   Catégorie: ${breakdown.risk_category}`)
    }
    console.log('')
  }
  
  console.log('='.repeat(80))
  console.log('✅ Analyse terminée!')
  console.log('='.repeat(80))
}

displayDetailedScores()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Erreur fatale:', error)
    process.exit(1)
  })

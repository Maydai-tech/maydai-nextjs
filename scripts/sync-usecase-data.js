#!/usr/bin/env node

/**
 * Script pour synchroniser les données du cas d'usage "Trieur de CV"
 * Ce script force le recalcul du score pour résoudre les incohérences
 * entre le dashboard et la page détaillée.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findTrieurDeCV() {
  console.log('🔍 Recherche du cas d\'usage "Trieur de CV"...')
  
  const { data: usecases, error } = await supabase
    .from('usecases')
    .select('id, name, score_final, risk_level, status, company_id')
    .ilike('name', '%trieur%cv%')
  
  if (error) {
    console.error('❌ Erreur lors de la recherche:', error)
    return null
  }
  
  if (!usecases || usecases.length === 0) {
    console.log('⚠️ Aucun cas d\'usage "Trieur de CV" trouvé')
    return null
  }
  
  console.log(`✅ ${usecases.length} cas d'usage trouvé(s):`)
  usecases.forEach((uc, index) => {
    console.log(`  ${index + 1}. ${uc.name} (ID: ${uc.id})`)
    console.log(`     Score: ${uc.score_final}, Risk: ${uc.risk_level}, Status: ${uc.status}`)
  })
  
  return usecases[0] // Retourner le premier trouvé
}

async function forceScoreRecalculation(usecaseId) {
  console.log(`🔄 Forçage du recalcul du score pour ${usecaseId}...`)
  
  try {
    // Appel à l'endpoint de calcul de score
    const response = await fetch(`http://localhost:3000/api/usecases/${usecaseId}/calculate-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ usecase_id: usecaseId })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erreur lors du recalcul:', response.status, errorText)
      return false
    }
    
    const result = await response.json()
    console.log('✅ Recalcul réussi:', result)
    return true
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel API:', error.message)
    return false
  }
}

async function verifyDataConsistency(usecaseId) {
  console.log('🔍 Vérification de la cohérence des données...')
  
  const { data: usecase, error } = await supabase
    .from('usecases')
    .select('id, name, score_final, risk_level, status, company_id')
    .eq('id', usecaseId)
    .single()
  
  if (error) {
    console.error('❌ Erreur lors de la vérification:', error)
    return false
  }
  
  console.log('📊 Données actuelles:')
  console.log(`  - Nom: ${usecase.name}`)
  console.log(`  - Score final: ${usecase.score_final}`)
  console.log(`  - Niveau de risque: ${usecase.risk_level}`)
  console.log(`  - Statut: ${usecase.status}`)
  
  // Vérifier la cohérence
  const isConsistent = usecase.score_final !== null && 
                      usecase.risk_level !== null && 
                      usecase.status === 'completed'
  
  if (isConsistent) {
    console.log('✅ Les données sont cohérentes')
  } else {
    console.log('⚠️ Les données ne sont pas cohérentes')
  }
  
  return isConsistent
}

async function main() {
  console.log('🚀 Début de la synchronisation des données...')
  
  // 1. Trouver le cas d'usage "Trieur de CV"
  const usecase = await findTrieurDeCV()
  if (!usecase) {
    console.log('❌ Impossible de continuer sans cas d\'usage')
    return
  }
  
  // 2. Vérifier l'état actuel
  console.log('\n📋 État actuel:')
  await verifyDataConsistency(usecase.id)
  
  // 3. Forcer le recalcul
  console.log('\n🔄 Recalcul en cours...')
  const recalcSuccess = await forceScoreRecalculation(usecase.id)
  
  if (!recalcSuccess) {
    console.log('❌ Échec du recalcul')
    return
  }
  
  // 4. Vérifier la cohérence après recalcul
  console.log('\n✅ Vérification finale:')
  await verifyDataConsistency(usecase.id)
  
  console.log('\n🎉 Synchronisation terminée!')
  console.log('💡 Rechargez le dashboard pour voir les changements')
}

// Exécuter le script
main().catch(console.error)

#!/usr/bin/env node

/**
 * Script de test pour la génération automatique des rapports OpenAI
 * Usage: node scripts/test-auto-generation.js [usecase_id]
 */

const API_BASE_URL = 'http://localhost:3000'

async function testAutoGeneration(usecaseId) {
  console.log('🤖 Test de la génération automatique des rapports OpenAI')
  console.log(`📋 Use Case ID: ${usecaseId}`)
  console.log('─'.repeat(50))

  try {
    // Test 1: Vérifier l'état initial
    console.log('\n1️⃣ Vérification de l\'état initial')
    const initialResponse = await fetch(`${API_BASE_URL}/api/generate-report?usecase_id=${usecaseId}`)
    const initialData = await initialResponse.json()

    if (initialResponse.ok) {
      console.log('✅ Rapport existant trouvé')
      console.log(`📊 Rapport: ${initialData.report?.substring(0, 100)}...`)
      console.log(`📅 Généré le: ${initialData.generated_at}`)
    } else if (initialResponse.status === 404) {
      console.log('ℹ️ Aucun rapport existant (normal pour un nouveau use case)')
    } else {
      console.log('❌ Erreur lors de la vérification:', initialData.error)
    }

    // Test 2: Simuler une soumission de formulaire (génération automatique)
    console.log('\n2️⃣ Test de génération automatique (simulation soumission formulaire)')
    const autoResponse = await fetch(`${API_BASE_URL}/api/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usecase_id: usecaseId })
    })

    const autoData = await autoResponse.json()

    if (autoResponse.ok) {
      console.log('✅ Génération automatique réussie')
      console.log(`📊 Rapport généré: ${autoData.report?.substring(0, 100)}...`)
      console.log(`💾 Sauvegardé en DB: ${autoData.saved_to_db}`)
    } else {
      console.log('❌ Génération automatique échouée:', autoData.error)
      if (autoData.details) {
        console.log('📝 Détails:', autoData.details)
      }
    }

    // Test 3: Vérifier que le rapport est bien sauvegardé
    console.log('\n3️⃣ Vérification de la sauvegarde')
    const verifyResponse = await fetch(`${API_BASE_URL}/api/generate-report?usecase_id=${usecaseId}`)
    const verifyData = await verifyResponse.json()

    if (verifyResponse.ok) {
      console.log('✅ Rapport sauvegardé et récupérable')
      console.log(`📊 Rapport en base: ${verifyData.report?.substring(0, 100)}...`)
      
      // Vérifier la cohérence
      if (autoData.report === verifyData.report) {
        console.log('✅ Les rapports sont cohérents')
      } else {
        console.log('❌ Incohérence détectée entre génération et récupération')
      }
    } else {
      console.log('❌ Échec de récupération:', verifyData.error)
    }

    // Test 4: Test de régénération automatique
    console.log('\n4️⃣ Test de régénération automatique')
    const regenResponse = await fetch(`${API_BASE_URL}/api/usecases/${usecaseId}/regenerate-report`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const regenData = await regenResponse.json()

    if (regenResponse.ok) {
      console.log('✅ Régénération automatique réussie')
      console.log(`📊 Rapport régénéré: ${regenData.report?.substring(0, 100)}...`)
      console.log(`🔄 Régénéré: ${regenData.regenerated}`)
    } else {
      console.log('❌ Régénération automatique échouée:', regenData.error)
    }

    console.log('\n🎉 Tests de génération automatique terminés!')
    console.log('\n📝 Instructions pour tester manuellement:')
    console.log(`1. Ouvrir http://localhost:3000/usecases/${usecaseId}/rapport`)
    console.log('2. Vérifier que le rapport s\'affiche automatiquement')
    console.log('3. Compléter un questionnaire pour déclencher la régénération')
    console.log('4. Vérifier que le rapport se met à jour automatiquement')

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message)
  }
}

// Récupérer l'ID du use case depuis les arguments
const usecaseId = process.argv[2]

if (!usecaseId) {
  console.log('Usage: node scripts/test-auto-generation.js [usecase_id]')
  console.log('Exemple: node scripts/test-auto-generation.js 123e4567-e89b-12d3-a456-426614174000')
  process.exit(1)
}

testAutoGeneration(usecaseId)


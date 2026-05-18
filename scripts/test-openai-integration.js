#!/usr/bin/env node

/**
 * Script de test pour l'intégration OpenAI dans la page de rapport
 * Usage: node scripts/test-openai-integration.js [usecase_id]
 */

const API_BASE_URL = 'http://localhost:3000'

async function testOpenAIIntegration(usecaseId) {
  console.log('🤖 Test de l\'intégration OpenAI dans la page de rapport')
  console.log(`📋 Use Case ID: ${usecaseId}`)
  console.log('─'.repeat(50))

  try {
    // Test 1: Vérifier que la page de rapport se charge
    console.log('\n1️⃣ Test de chargement de la page de rapport')
    const pageResponse = await fetch(`${API_BASE_URL}/usecases/${usecaseId}/rapport`)
    
    if (pageResponse.ok) {
      console.log('✅ Page de rapport accessible')
    } else {
      console.log('❌ Page de rapport inaccessible:', pageResponse.status)
      return
    }

    // Test 2: Vérifier l'API GET (récupération de rapport)
    console.log('\n2️⃣ Test API GET - Récupération de rapport')
    const getResponse = await fetch(`${API_BASE_URL}/api/generate-report?usecase_id=${usecaseId}`)
    const getData = await getResponse.json()

    if (getResponse.ok) {
      console.log('✅ GET réussi - Rapport existant trouvé')
      console.log(`📊 Rapport: ${getData.report?.substring(0, 100)}...`)
    } else if (getResponse.status === 404) {
      console.log('ℹ️ Aucun rapport existant (normal pour un nouveau use case)')
    } else {
      console.log('❌ GET échoué:', getData.error)
    }

    // Test 3: Test API POST (génération de rapport)
    console.log('\n3️⃣ Test API POST - Génération de rapport')
    const postResponse = await fetch(`${API_BASE_URL}/api/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usecase_id: usecaseId })
    })

    const postData = await postResponse.json()

    if (postResponse.ok) {
      console.log('✅ POST réussi - Rapport généré')
      console.log(`📊 Rapport généré: ${postData.report?.substring(0, 100)}...`)
      console.log(`💾 Sauvegardé en DB: ${postData.saved_to_db}`)
    } else {
      console.log('❌ POST échoué:', postData.error)
      if (postData.details) {
        console.log('📝 Détails:', postData.details)
      }
    }

    // Test 4: Test API PUT (régénération de rapport)
    console.log('\n4️⃣ Test API PUT - Régénération de rapport')
    const putResponse = await fetch(`${API_BASE_URL}/api/usecases/${usecaseId}/regenerate-report`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const putData = await putResponse.json()

    if (putResponse.ok) {
      console.log('✅ PUT réussi - Rapport régénéré')
      console.log(`📊 Rapport régénéré: ${putData.report?.substring(0, 100)}...`)
      console.log(`🔄 Régénéré: ${putData.regenerated}`)
    } else {
      console.log('❌ PUT échoué:', putData.error)
      if (putData.details) {
        console.log('📝 Détails:', putData.details)
      }
    }

    // Test 5: Vérification finale
    console.log('\n5️⃣ Vérification finale')
    const finalGetResponse = await fetch(`${API_BASE_URL}/api/generate-report?usecase_id=${usecaseId}`)
    const finalGetData = await finalGetResponse.json()

    if (finalGetResponse.ok) {
      console.log('✅ Rapport final récupéré avec succès')
      console.log(`📅 Généré le: ${finalGetData.generated_at}`)
    } else {
      console.log('❌ Échec récupération finale:', finalGetData.error)
    }

    console.log('\n🎉 Tests d\'intégration OpenAI terminés!')
    console.log('\n📝 Instructions pour tester manuellement:')
    console.log(`1. Ouvrez http://localhost:3000/usecases/${usecaseId}/rapport`)
    console.log('2. Scrollez jusqu\'à la section "Analyse de Conformité IA Act - Section 3"')
    console.log('3. Cliquez sur "Générer le rapport" ou "Régénérer"')
    console.log('4. Vérifiez que le rapport s\'affiche correctement')

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message)
  }
}

// Récupérer l'ID du use case depuis les arguments
const usecaseId = process.argv[2]

if (!usecaseId) {
  console.log('Usage: node scripts/test-openai-integration.js [usecase_id]')
  console.log('Exemple: node scripts/test-openai-integration.js 123e4567-e89b-12d3-a456-426614174000')
  process.exit(1)
}

testOpenAIIntegration(usecaseId)


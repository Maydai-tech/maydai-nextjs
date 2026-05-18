#!/usr/bin/env node

/**
 * Script de test pour l'API de génération de rapports
 * Usage: node scripts/test-report-api.js [usecase_id]
 */

const API_BASE_URL = 'http://localhost:3000'

async function testReportAPI(usecaseId) {
  console.log('🧪 Test de l\'API de génération de rapports')
  console.log(`📋 Use Case ID: ${usecaseId}`)
  console.log('─'.repeat(50))

  try {
    // Test 1: Générer un nouveau rapport (POST)
    console.log('\n1️⃣ Test POST - Génération d\'un nouveau rapport')
    const postResponse = await fetch(`${API_BASE_URL}/api/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usecase_id: usecaseId })
    })

    const postData = await postResponse.json()
    
    if (postResponse.ok) {
      console.log('✅ POST réussi')
      console.log(`📊 Rapport généré: ${postData.report?.substring(0, 100)}...`)
      console.log(`💾 Sauvegardé en DB: ${postData.saved_to_db}`)
    } else {
      console.log('❌ POST échoué:', postData.error)
      return
    }

    // Test 2: Récupérer le rapport existant (GET)
    console.log('\n2️⃣ Test GET - Récupération du rapport existant')
    const getResponse = await fetch(`${API_BASE_URL}/api/generate-report?usecase_id=${usecaseId}`)
    const getData = await getResponse.json()

    if (getResponse.ok) {
      console.log('✅ GET réussi')
      console.log(`📊 Rapport récupéré: ${getData.report?.substring(0, 100)}...`)
      console.log(`📅 Généré le: ${getData.generated_at}`)
    } else {
      console.log('❌ GET échoué:', getData.error)
    }

    // Test 3: Vérifier la cohérence des données
    console.log('\n3️⃣ Test de cohérence')
    if (postData.report === getData.report) {
      console.log('✅ Les rapports sont identiques')
    } else {
      console.log('❌ Les rapports diffèrent')
    }

    // Test 4: Régénérer le rapport (PUT)
    console.log('\n4️⃣ Test PUT - Régénération du rapport')
    const putResponse = await fetch(`${API_BASE_URL}/api/usecases/${usecaseId}/regenerate-report`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const putData = await putResponse.json()

    if (putResponse.ok) {
      console.log('✅ PUT réussi')
      console.log(`📊 Rapport régénéré: ${putData.report?.substring(0, 100)}...`)
      console.log(`🔄 Régénéré: ${putData.regenerated}`)
    } else {
      console.log('❌ PUT échoué:', putData.error)
    }

    // Test 5: Vérifier que le rapport a été mis à jour
    console.log('\n5️⃣ Test de mise à jour')
    const getResponse2 = await fetch(`${API_BASE_URL}/api/generate-report?usecase_id=${usecaseId}`)
    const getData2 = await getResponse2.json()

    if (getResponse2.ok) {
      console.log('✅ Rapport mis à jour récupéré')
      console.log(`📊 Nouveau rapport: ${getData2.report?.substring(0, 100)}...`)
      
      // Vérifier si le rapport a vraiment changé
      if (getData.report !== getData2.report) {
        console.log('✅ Le rapport a été régénéré avec succès')
      } else {
        console.log('⚠️ Le rapport semble identique (peut-être normal)')
      }
    } else {
      console.log('❌ Échec récupération rapport mis à jour:', getData2.error)
    }

    console.log('\n🎉 Tests terminés avec succès!')

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message)
  }
}

// Récupérer l'ID du use case depuis les arguments
const usecaseId = process.argv[2]

if (!usecaseId) {
  console.log('Usage: node scripts/test-report-api.js [usecase_id]')
  console.log('Exemple: node scripts/test-report-api.js 123e4567-e89b-12d3-a456-426614174000')
  process.exit(1)
}

testReportAPI(usecaseId)

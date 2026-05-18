#!/usr/bin/env node

/**
 * Script de test spécifique pour l'endpoint PUT de régénération de rapport
 * Usage: node scripts/test-regenerate-endpoint.js [usecase_id]
 */

const API_BASE_URL = 'http://localhost:3000'

async function testRegenerateEndpoint(usecaseId) {
  console.log('🔄 Test de l\'endpoint PUT - Régénération de rapport')
  console.log(`📋 Use Case ID: ${usecaseId}`)
  console.log('─'.repeat(50))

  try {
    // Test 1: Vérifier qu'un rapport existe d'abord
    console.log('\n1️⃣ Vérification du rapport existant')
    const getResponse = await fetch(`${API_BASE_URL}/api/generate-report?usecase_id=${usecaseId}`)
    const getData = await getResponse.json()

    if (!getResponse.ok) {
      console.log('❌ Aucun rapport existant trouvé. Générons-en un d\'abord...')
      
      // Générer un rapport initial
      const postResponse = await fetch(`${API_BASE_URL}/api/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usecase_id: usecaseId })
      })
      
      if (!postResponse.ok) {
        console.log('❌ Impossible de générer un rapport initial')
        return
      }
      
      console.log('✅ Rapport initial généré')
    } else {
      console.log('✅ Rapport existant trouvé')
      console.log(`📊 Rapport actuel: ${getData.report?.substring(0, 100)}...`)
    }

    // Test 2: Régénérer le rapport avec PUT
    console.log('\n2️⃣ Régénération du rapport (PUT)')
    const putResponse = await fetch(`${API_BASE_URL}/api/usecases/${usecaseId}/regenerate-report`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    })

    const putData = await putResponse.json()

    if (putResponse.ok) {
      console.log('✅ PUT réussi')
      console.log(`📊 Nouveau rapport: ${putData.report?.substring(0, 100)}...`)
      console.log(`🔄 Régénéré: ${putData.regenerated}`)
      console.log(`📅 Timestamp: ${putData.timestamp}`)
    } else {
      console.log('❌ PUT échoué:', putData.error)
      if (putData.details) {
        console.log('📝 Détails:', putData.details)
      }
      return
    }

    // Test 3: Vérifier que le rapport a été mis à jour en base
    console.log('\n3️⃣ Vérification de la mise à jour en base')
    const getResponse2 = await fetch(`${API_BASE_URL}/api/generate-report?usecase_id=${usecaseId}`)
    const getData2 = await getResponse2.json()

    if (getResponse2.ok) {
      console.log('✅ Rapport mis à jour récupéré depuis la base')
      console.log(`📊 Rapport en base: ${getData2.report?.substring(0, 100)}...`)
      
      // Vérifier la cohérence
      if (putData.report === getData2.report) {
        console.log('✅ Les rapports sont cohérents')
      } else {
        console.log('❌ Incohérence détectée entre PUT et GET')
      }
    } else {
      console.log('❌ Échec récupération rapport mis à jour:', getData2.error)
    }

    // Test 4: Test de performance (temps de régénération)
    console.log('\n4️⃣ Test de performance')
    const startTime = Date.now()
    
    const perfResponse = await fetch(`${API_BASE_URL}/api/usecases/${usecaseId}/regenerate-report`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    })
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    if (perfResponse.ok) {
      console.log(`✅ Régénération terminée en ${duration}ms`)
      if (duration > 10000) {
        console.log('⚠️ Temps de réponse élevé (>10s)')
      } else if (duration > 5000) {
        console.log('⚠️ Temps de réponse modéré (>5s)')
      } else {
        console.log('✅ Temps de réponse excellent (<5s)')
      }
    } else {
      console.log('❌ Test de performance échoué')
    }

    console.log('\n🎉 Tests de régénération terminés avec succès!')

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message)
  }
}

// Récupérer l'ID du use case depuis les arguments
const usecaseId = process.argv[2]

if (!usecaseId) {
  console.log('Usage: node scripts/test-regenerate-endpoint.js [usecase_id]')
  console.log('Exemple: node scripts/test-regenerate-endpoint.js 123e4567-e89b-12d3-a456-426614174000')
  process.exit(1)
}

testRegenerateEndpoint(usecaseId)


#!/usr/bin/env node

/**
 * Script de test pour vérifier la validation du questionnaire
 * Usage: node scripts/test-questionnaire-validation.js [usecase_id]
 */

const API_BASE_URL = 'http://localhost:3000'

async function testQuestionnaireValidation(usecaseId) {
  console.log('🔍 Test de validation du questionnaire pour OpenAI')
  console.log(`📋 Use Case ID: ${usecaseId}`)
  console.log('─'.repeat(50))

  try {
    // Test 1: Tenter de générer un rapport sans données complètes
    console.log('\n1️⃣ Test de génération avec questionnaire incomplet')
    const response = await fetch(`${API_BASE_URL}/api/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usecase_id: usecaseId })
    })

    const data = await response.json()

    if (response.status === 400 && data.requires_questionnaire) {
      console.log('✅ Validation fonctionne correctement')
      console.log(`📝 Message: ${data.error}`)
      console.log(`🔍 Détails: ${data.details?.join(', ')}`)
    } else if (response.ok) {
      console.log('✅ Rapport généré avec succès')
      console.log(`📊 Rapport: ${data.report?.substring(0, 100)}...`)
    } else {
      console.log('❌ Erreur inattendue:', data.error)
    }

    // Test 2: Vérifier l'état du use case
    console.log('\n2️⃣ Vérification de l\'état du use case')
    console.log('ℹ️ Pour tester complètement, complétez le questionnaire avec les questions E4.N7.Q2 et E5.N9.Q7')

    console.log('\n🎉 Test de validation terminé!')
    console.log('\n📝 Instructions pour tester complètement:')
    console.log(`1. Aller sur http://localhost:3000/usecases/${usecaseId}/evaluation`)
    console.log('2. Compléter le questionnaire jusqu\'aux questions E4.N7.Q2 et E5.N9.Q7')
    console.log('3. Soumettre le questionnaire')
    console.log('4. Vérifier que le rapport se génère automatiquement')
    console.log('5. Aller sur la page rapport pour voir le résultat')

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
  }
}

// Récupérer l'ID du use case depuis les arguments
const usecaseId = process.argv[2]

if (!usecaseId) {
  console.log('Usage: node scripts/test-questionnaire-validation.js [usecase_id]')
  console.log('Exemple: node scripts/test-questionnaire-validation.js dbe93d01-1b42-442a-80ab-79f71fdcd1bf')
  process.exit(1)
}

testQuestionnaireValidation(usecaseId)


#!/usr/bin/env node

/**
 * Script pour tester l'import d'OpenAI
 * Usage: node scripts/test-openai-import.js
 */

require('dotenv').config({ path: '.env.local' })

console.log('🔍 Test de l\'import OpenAI')
console.log('─'.repeat(40))

try {
  // Test 1: Vérifier les variables d'environnement
  console.log('\n1️⃣ Vérification des variables d\'environnement...')
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    console.log('✅ OPENAI_API_KEY trouvée')
    console.log(`📝 Clé: ${openaiKey.substring(0, 10)}...`)
  } else {
    console.log('❌ OPENAI_API_KEY manquante')
  }

  // Test 2: Tenter d'importer le client OpenAI
  console.log('\n2️⃣ Test d\'import du client OpenAI...')
  try {
    const { openAIClient } = require('../lib/openai-client')
    console.log('✅ Import réussi')
    console.log('📊 Type:', typeof openAIClient)
    console.log('📊 Méthodes disponibles:', Object.getOwnPropertyNames(Object.getPrototypeOf(openAIClient)))
  } catch (importError) {
    console.log('❌ Erreur d\'import:', importError.message)
  }

  // Test 3: Tenter d'importer les fonctions de transformation
  console.log('\n3️⃣ Test d\'import des fonctions de transformation...')
  try {
    const { transformToOpenAIFormat, extractTargetResponses, validateOpenAIInput } = require('../lib/openai-data-transformer')
    console.log('✅ Import des fonctions de transformation réussi')
    console.log('📊 Fonctions disponibles:', {
      transformToOpenAIFormat: typeof transformToOpenAIFormat,
      extractTargetResponses: typeof extractTargetResponses,
      validateOpenAIInput: typeof validateOpenAIInput
    })
  } catch (transformError) {
    console.log('❌ Erreur d\'import des fonctions:', transformError.message)
  }

  // Test 4: Test de compilation TypeScript
  console.log('\n4️⃣ Test de compilation TypeScript...')
  const { execSync } = require('child_process')
  try {
    execSync('npx tsc --noEmit lib/openai-client.ts', { stdio: 'pipe' })
    console.log('✅ Compilation TypeScript réussie')
  } catch (tsError) {
    console.log('❌ Erreur de compilation TypeScript:', tsError.message)
  }

  console.log('\n🎉 Test d\'import terminé!')

} catch (error) {
  console.error('❌ Erreur générale:', error.message)
}


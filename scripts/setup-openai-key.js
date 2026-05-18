#!/usr/bin/env node

/**
 * Script pour configurer la clé OpenAI
 * Usage: node scripts/setup-openai-key.js [api_key]
 */

const fs = require('fs')
const path = require('path')

function setupOpenAIKey(apiKey) {
  console.log('🔑 Configuration de la clé OpenAI')
  console.log('─'.repeat(40))

  if (!apiKey) {
    console.log('❌ Aucune clé API fournie')
    console.log('\nUsage: node scripts/setup-openai-key.js [api_key]')
    console.log('Exemple: node scripts/setup-openai-key.js sk-...')
    console.log('\nOu définissez manuellement dans .env.local:')
    console.log('OPENAI_API_KEY=sk-your-actual-api-key-here')
    return false
  }

  if (!apiKey.startsWith('sk-')) {
    console.log('⚠️ La clé API ne semble pas valide (doit commencer par "sk-")')
    console.log('Clé fournie:', apiKey.substring(0, 10) + '...')
  }

  try {
    const envPath = path.join(__dirname, '../.env.local')
    
    // Lire le fichier .env.local
    let envContent = ''
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')
    }

    // Remplacer ou ajouter la clé OpenAI
    const openaiKeyRegex = /^OPENAI_API_KEY=.*$/m
    if (openaiKeyRegex.test(envContent)) {
      // Remplacer la clé existante
      envContent = envContent.replace(openaiKeyRegex, `OPENAI_API_KEY=${apiKey}`)
      console.log('✅ Clé OpenAI mise à jour')
    } else {
      // Ajouter la clé
      envContent += `\nOPENAI_API_KEY=${apiKey}\n`
      console.log('✅ Clé OpenAI ajoutée')
    }

    // Sauvegarder le fichier
    fs.writeFileSync(envPath, envContent)
    
    console.log('📝 Fichier .env.local mis à jour')
    console.log('🔄 Redémarrez le serveur Next.js pour appliquer les changements')
    
    return true

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message)
    return false
  }
}

// Récupérer la clé API depuis les arguments
const apiKey = process.argv[2]

if (!apiKey) {
  console.log('🔑 Configuration de la clé OpenAI')
  console.log('─'.repeat(40))
  console.log('❌ Aucune clé API fournie')
  console.log('\n📝 Instructions:')
  console.log('1. Obtenez votre clé API sur https://platform.openai.com/account/api-keys')
  console.log('2. Exécutez: node scripts/setup-openai-key.js sk-your-actual-api-key')
  console.log('3. Redémarrez le serveur: npm run dev')
  console.log('\nOu modifiez manuellement le fichier .env.local:')
  console.log('OPENAI_API_KEY=sk-your-actual-api-key-here')
  process.exit(1)
}

setupOpenAIKey(apiKey)


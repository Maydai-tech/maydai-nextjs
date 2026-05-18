#!/usr/bin/env node

/**
 * Script pour déboguer l'import d'OpenAI
 * Usage: node scripts/test-import-debug.js
 */

require('dotenv').config({ path: '.env.local' })

console.log('🔍 Debug de l\'import OpenAI')
console.log('─'.repeat(40))

// Test 1: Vérifier les variables d'environnement
console.log('\n1️⃣ Variables d\'environnement:')
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Définie' : 'Non définie')
console.log('NODE_ENV:', process.env.NODE_ENV)

// Test 2: Vérifier que le fichier existe
console.log('\n2️⃣ Fichier openai-client.ts:')
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '../lib/openai-client.ts')
console.log('Chemin:', filePath)
console.log('Existe:', fs.existsSync(filePath))
console.log('Taille:', fs.statSync(filePath).size, 'octets')

// Test 3: Lire le contenu du fichier
console.log('\n3️⃣ Contenu du fichier:')
const content = fs.readFileSync(filePath, 'utf8')
console.log('Premières lignes:')
console.log(content.split('\n').slice(0, 10).join('\n'))
console.log('...')
console.log('Dernières lignes:')
console.log(content.split('\n').slice(-5).join('\n'))

// Test 4: Vérifier la syntaxe
console.log('\n4️⃣ Vérification de la syntaxe:')
try {
  const { execSync } = require('child_process')
  execSync('npx tsc --noEmit lib/openai-client.ts', { stdio: 'pipe' })
  console.log('✅ Syntaxe TypeScript valide')
} catch (error) {
  console.log('❌ Erreur de syntaxe:', error.message)
}

// Test 5: Vérifier l'export
console.log('\n5️⃣ Vérification de l\'export:')
const exportMatch = content.match(/export const openAIClient/)
console.log('Export trouvé:', !!exportMatch)

console.log('\n🎉 Debug terminé!')


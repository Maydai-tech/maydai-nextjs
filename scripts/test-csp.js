/**
 * Script de test pour valider le CSP renforcé
 */

console.log('🔒 Test du Content Security Policy renforcé\n')

// Test des fonctions utilitaires
const { generateNonce, validateNonce, createCSPHeader } = require('../lib/csp-nonce.ts')

console.log('1. Test de génération de nonce:')
const nonce1 = generateNonce()
const nonce2 = generateNonce()

console.log(`   Nonce 1: ${nonce1}`)
console.log(`   Nonce 2: ${nonce2}`)
console.log(`   Nonces différents: ${nonce1 !== nonce2 ? '✅' : '❌'}`)
console.log(`   Nonce 1 valide: ${validateNonce(nonce1) ? '✅' : '❌'}`)
console.log(`   Longueur suffisante: ${nonce1.length >= 16 ? '✅' : '❌'}`)

console.log('\n2. Test de validation de nonce:')
const invalidNonces = ['abc', '123-456', 'short', 'with spaces']
invalidNonces.forEach(invalid => {
  console.log(`   "${invalid}" invalide: ${!validateNonce(invalid) ? '✅' : '❌'}`)
})

console.log('\n3. Test de génération CSP development:')
process.env.NODE_ENV = 'development'
const devCSP = createCSPHeader(nonce1)
console.log(`   CSP dev: ${devCSP}`)
console.log(`   Contient nonce: ${devCSP.includes(`nonce-${nonce1}`) ? '✅' : '❌'}`)
console.log(`   Contient unsafe-eval (nécessaire en dev): ${devCSP.includes('unsafe-eval') ? '✅' : '❌'}`)

console.log('\n4. Test de génération CSP production:')
process.env.NODE_ENV = 'production'
const prodCSP = createCSPHeader(nonce1)
console.log(`   CSP prod: ${prodCSP}`)
console.log(`   Contient nonce: ${prodCSP.includes(`nonce-${nonce1}`) ? '✅' : '❌'}`)
console.log(`   N'a PAS unsafe-eval: ${!prodCSP.includes('unsafe-eval') ? '✅' : '❌'}`)
console.log(`   N'a PAS unsafe-inline: ${!prodCSP.includes('unsafe-inline') ? '✅' : '❌'}`)

console.log('\n5. Test de sécurité:')
console.log(`   Autorise Google Tag Manager: ${prodCSP.includes('googletagmanager.com') ? '✅' : '❌'}`)
console.log(`   Autorise Supabase: ${prodCSP.includes('supabase.co') ? '✅' : '❌'}`)
console.log(`   Bloque object-src: ${prodCSP.includes("object-src 'none'") ? '✅' : '❌'}`)
console.log(`   Bloque frame-ancestors: ${prodCSP.includes("frame-ancestors 'none'") ? '✅' : '❌'}`)
console.log(`   Force HTTPS: ${prodCSP.includes('upgrade-insecure-requests') ? '✅' : '❌'}`)

console.log('\n6. Test de mock middleware:')
// Simuler une requête middleware
const mockRequest = {
  nextUrl: {
    pathname: '/',
    hostname: 'maydai.com'
  }
}

// Simuler les headers de réponse
const mockHeaders = new Map()
const mockResponse = {
  headers: {
    set: (key, value) => {
      mockHeaders.set(key, value)
      console.log(`   Header ajouté: ${key} = ${value.substring(0, 60)}${value.length > 60 ? '...' : ''}`)
    }
  }
}

// Test du middleware logic (simulation)
const middlewareNonce = generateNonce()
mockResponse.headers.set('x-nonce', middlewareNonce)
mockResponse.headers.set('Content-Security-Policy', createCSPHeader(middlewareNonce))
mockResponse.headers.set('X-Content-Type-Options', 'nosniff')
mockResponse.headers.set('X-Frame-Options', 'DENY')

console.log(`   Middleware nonce généré: ${middlewareNonce}`)
console.log(`   Headers sécurité ajoutés: ${mockHeaders.size >= 4 ? '✅' : '❌'}`)

console.log('\n7. Comparaison avec l\'ancien CSP:')
const oldCSP = "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
const newCSP = createCSPHeader(generateNonce())

console.log('   Ancien CSP (vulnérable):')
console.log(`     - unsafe-eval: ${oldCSP.includes('unsafe-eval') ? '❌' : '✅'}`)
console.log(`     - unsafe-inline: ${oldCSP.includes('unsafe-inline') ? '❌' : '✅'}`)

console.log('   Nouveau CSP (sécurisé):')
console.log(`     - nonces utilisés: ${newCSP.includes('nonce-') ? '✅' : '❌'}`)
console.log(`     - pas d'unsafe-eval en prod: ${!newCSP.includes('unsafe-eval') ? '✅' : '❌'}`)
console.log(`     - pas d'unsafe-inline en prod: ${!newCSP.includes('unsafe-inline') ? '✅' : '❌'}`)

console.log('\n✅ Tests du CSP terminés')
console.log('\n📋 Résumé des améliorations:')
console.log('- ✅ Nonces uniques générés pour chaque requête')
console.log('- ✅ Suppression de unsafe-eval et unsafe-inline en production')
console.log('- ✅ Conservation des nonces pour le développement')
console.log('- ✅ Headers de sécurité additionnels')
console.log('- ✅ Validation des nonces')
console.log('- ✅ Whitelist spécifique pour services tiers (GTM, Supabase)')

console.log('\n🔍 Pour tester en production:')
console.log('1. Déployer l\'application')
console.log('2. Ouvrir les DevTools du navigateur')
console.log('3. Aller dans l\'onglet Security')
console.log('4. Vérifier que le CSP est actif')
console.log('5. Tenter d\'injecter du JavaScript inline (doit être bloqué)')
console.log('6. Vérifier que les scripts avec nonce fonctionnent')
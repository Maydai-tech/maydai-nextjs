/**
 * Script de test simplifié pour valider le CSP
 */

console.log('🔒 Test du Content Security Policy renforcé\n')

// Fonctions utilitaires simplifiées pour le test
function generateNonce() {
  const array = new Uint8Array(16)
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

function validateNonce(nonce) {
  return /^[a-zA-Z0-9]{16,}$/.test(nonce)
}

function createCSPHeader(nonce) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  if (isDevelopment) {
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`,
      `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co ws: wss:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
  }
  
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co https://www.google-analytics.com",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
}

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

console.log('\n6. Comparaison avec l\'ancien CSP:')
const oldCSP = "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
const newCSP = createCSPHeader(generateNonce())

console.log('   Ancien CSP (vulnérable):')
console.log(`     - unsafe-eval: ${oldCSP.includes('unsafe-eval') ? '❌ Présent' : '✅ Absent'}`)
console.log(`     - unsafe-inline: ${oldCSP.includes('unsafe-inline') ? '❌ Présent' : '✅ Absent'}`)

console.log('   Nouveau CSP (sécurisé):')
console.log(`     - nonces utilisés: ${newCSP.includes('nonce-') ? '✅' : '❌'}`)
console.log(`     - pas d'unsafe-eval en prod: ${!newCSP.includes('unsafe-eval') ? '✅' : '❌'}`)
console.log(`     - pas d'unsafe-inline en prod: ${!newCSP.includes('unsafe-inline') ? '✅' : '❌'}`)

console.log('\n✅ Tests du CSP terminés')

console.log('\n📊 Évaluation de sécurité:')
const securityChecks = [
  { name: 'Nonces uniques', status: nonce1 !== nonce2 },
  { name: 'Pas d\'unsafe-eval en prod', status: !prodCSP.includes('unsafe-eval') },
  { name: 'Pas d\'unsafe-inline en prod', status: !prodCSP.includes('unsafe-inline') },
  { name: 'object-src bloqué', status: prodCSP.includes("object-src 'none'") },
  { name: 'frame-ancestors bloqué', status: prodCSP.includes("frame-ancestors 'none'") },
  { name: 'HTTPS forcé', status: prodCSP.includes('upgrade-insecure-requests') }
]

const passedChecks = securityChecks.filter(check => check.status).length
const totalChecks = securityChecks.length

console.log(`Score de sécurité: ${passedChecks}/${totalChecks} (${Math.round(passedChecks/totalChecks*100)}%)`)

securityChecks.forEach(check => {
  console.log(`  ${check.status ? '✅' : '❌'} ${check.name}`)
})

if (passedChecks === totalChecks) {
  console.log('\n🎉 Tous les tests de sécurité passent ! CSP sécurisé !')
} else {
  console.log(`\n⚠️  ${totalChecks - passedChecks} test(s) échoué(s). Vérifier la configuration.`)
}

console.log('\n🔍 Instructions pour test manuel:')
console.log('1. Déployer en production avec NODE_ENV=production')
console.log('2. Ouvrir DevTools > Console')
console.log('3. Exécuter: console.log(document.querySelector("meta[http-equiv=\'Content-Security-Policy\']"))')
console.log('4. Vérifier que le CSP ne contient ni unsafe-eval ni unsafe-inline')
console.log('5. Tenter d\'injecter: <script>alert("test")</script> (doit être bloqué)')
console.log('6. Vérifier que Google Tag Manager fonctionne toujours')
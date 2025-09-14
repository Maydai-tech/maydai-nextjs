// Script pour régénérer le rapport et tester les corrections
const usecaseId = '5d996313-8484-4b15-a571-4210fcb1235f'

console.log('🔄 Régénération du rapport pour tester les corrections...')
console.log(`Cas d'usage: ${usecaseId}`)
console.log('')

// URL de l'API de génération de rapport
const apiUrl = `http://localhost:3000/api/generate-report`

// Données à envoyer
const requestData = {
  usecase_id: usecaseId
}

console.log('📡 Appel de l\'API de génération de rapport...')
console.log(`URL: ${apiUrl}`)
console.log(`Données:`, requestData)
console.log('')

// Note: Ce script montre la commande à exécuter
console.log('Pour exécuter la régénération, utilisez:')
console.log(`curl -X POST "${apiUrl}" \\`)
console.log(`  -H "Content-Type: application/json" \\`)
console.log(`  -d '{"usecase_id":"${usecaseId}"}'`)
console.log('')
console.log('Ou via l\'interface utilisateur en cliquant sur "Générer le rapport"')

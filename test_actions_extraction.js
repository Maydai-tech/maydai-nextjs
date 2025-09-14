// Test de l'extraction des actions à moyen terme
const fs = require('fs')

// Lire le rapport de test
const reportPath = '/Users/thomaschippeaux/Desktop/workspacemaydai/maydai-nextjs/openai_test_response.md'
const reportContent = fs.readFileSync(reportPath, 'utf8')

console.log('🔍 Test de l\'extraction des actions à moyen terme')
console.log('=' .repeat(60))

// Extraire la section Actions à moyen terme
const actionsMatch = reportContent.match(/### Actions à moyen terme\s*\n([\s\S]*?)(?=###|##|$)/)
if (actionsMatch) {
  const actionsSection = actionsMatch[1]
  console.log('📄 Section Actions à moyen terme trouvée:')
  console.log(actionsSection)
  console.log('\n' + '=' .repeat(60))
  
  // Tester le pattern
  const actionMatches = actionsSection.match(/- \*\*[^*]+:\*\* (.+)/g)
  
  if (actionMatches) {
    console.log('✅ Pattern fonctionne! Actions trouvées:')
    actionMatches.forEach((match, index) => {
      const action = match.replace(/- \*\*[^*]+:\*\* /, '').trim()
      console.log(`Action ${index + 1}: ${action}`)
    })
  } else {
    console.log('❌ Pattern ne fonctionne pas - aucune action trouvée')
    
    // Analyser le contenu pour comprendre le format
    console.log('\n🔍 Analyse du format:')
    const lines = actionsSection.split('\n')
    lines.forEach((line, index) => {
      if (line.includes('**')) {
        console.log(`Ligne ${index + 1}: "${line}"`)
      }
    })
  }
} else {
  console.log('❌ Section Actions à moyen terme non trouvée')
}


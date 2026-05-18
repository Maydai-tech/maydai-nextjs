#!/usr/bin/env node

/**
 * Script de test pour vérifier la nouvelle structure de formatage
 * Teste que les clients OpenAI utilisent bien le template standardisé
 */

const { buildStandardizedPrompt } = require('../lib/formatting-template.ts')

console.log('🧪 Test de la structure de formatage standardisée\n')

// Données de test
const testData = {
  companyName: 'Test Company',
  usecaseName: 'Système de recommandation IA',
  usecaseId: 'test-001',
  companyIndustry: 'E-commerce',
  companyCity: 'Paris',
  companyCountry: 'France',
  questionnaireData: `
**E4.N7.Q2 - Domaines d'utilisation (Risque élevé) :**
Question : Quels sont les domaines d'utilisation de votre système d'IA ?
Domaines sélectionnés :
- Santé et soins médicaux
- Éducation et formation

**E5.N9.Q7 - Registre centralisé des systèmes IA :**
Question : Votre système doit-il être enregistré dans le registre centralisé ?
Réponse : Oui, système à risque élevé
Détails : registry_type: EU_AI_ACT_REGISTRY, system_name: Système de recommandation IA
  `
}

try {
  console.log('📝 Génération du prompt standardisé...\n')
  
  const prompt = buildStandardizedPrompt(
    testData.companyName,
    testData.usecaseName,
    testData.usecaseId,
    testData.companyIndustry,
    testData.companyCity,
    testData.companyCountry,
    testData.questionnaireData
  )
  
  console.log('✅ Prompt généré avec succès\n')
  console.log('📋 Structure du prompt :')
  console.log('=' .repeat(50))
  console.log(prompt)
  console.log('=' .repeat(50))
  
  // Vérifier que la structure contient les éléments requis (format Markdown)
  const requiredElements = [
    '# Recommandations et plan d\'action',
    '## Introduction contextuelle',
    '## Évaluation du niveau de risque AI Act',
    '## Il est impératif de mettre en œuvre les mesures suivantes',
    '### Les 3 priorités d\'actions réglementaires',
    '## Trois actions concrètes à mettre en œuvre rapidement',
    '### Quick wins & actions immédiates recommandées',
    '## Impact attendu',
    '## Trois actions structurantes à mener dans les 3 à 6 mois',
    '### Actions à moyen terme',
    '## Conclusion'
  ]
  
  console.log('\n🔍 Vérification des éléments requis :')
  let allElementsPresent = true
  
  requiredElements.forEach(element => {
    const isPresent = prompt.includes(element)
    console.log(`${isPresent ? '✅' : '❌'} ${element}`)
    if (!isPresent) allElementsPresent = false
  })
  
  if (allElementsPresent) {
    console.log('\n🎉 Tous les éléments requis sont présents dans la structure !')
    console.log('✅ La structure de formatage standardisée est correctement implémentée.')
  } else {
    console.log('\n❌ Certains éléments requis sont manquants.')
    process.exit(1)
  }
  
} catch (error) {
  console.error('❌ Erreur lors du test :', error.message)
  process.exit(1)
}

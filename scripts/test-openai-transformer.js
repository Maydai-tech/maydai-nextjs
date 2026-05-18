/**
 * Script de test pour la transformation des données vers le format OpenAI
 * Usage: node scripts/test-openai-transformer.js
 */

const { transformToOpenAIFormat, extractTargetResponses, validateOpenAIInput } = require('../lib/openai-data-transformer.ts')

// Données de test simulées
const mockUseCaseId = '123e4567-e89b-12d3-a456-426614174000'
const mockUseCaseName = 'Assistant RH IA – sélection de candidats'

const mockResponses = [
  {
    question_code: 'E4.N7.Q2',
    multiple_codes: ['E4.N7.Q2.A', 'E4.N7.Q2.B'],
    multiple_labels: [
      'Emploi, gestion des travailleurs et accès à l\'emploi indépendant',
      'Administration de la justice et processus démocratiques'
    ]
  },
  {
    question_code: 'E5.N9.Q7',
    conditional_main: 'E5.N9.Q7.B',
    conditional_keys: ['registry_type', 'system_name'],
    conditional_values: ['Interne', 'MaydAI']
  },
  {
    question_code: 'E4.N7.Q1', // Question non ciblée
    single_value: 'E4.N7.Q1.A'
  }
]

console.log('🧪 Test de la transformation des données vers le format OpenAI\n')

// Test 1: Extraction des réponses ciblées
console.log('1️⃣ Extraction des réponses ciblées:')
const targetResponses = extractTargetResponses(mockResponses)
console.log(`   Réponses extraites: ${targetResponses.length}`)
console.log(`   Codes des questions: ${targetResponses.map(r => r.question_code).join(', ')}`)
console.log()

// Test 2: Transformation vers le format OpenAI
console.log('2️⃣ Transformation vers le format OpenAI:')
const transformedData = transformToOpenAIFormat(mockUseCaseId, mockUseCaseName, targetResponses)
console.log(JSON.stringify(transformedData, null, 2))
console.log()

// Test 3: Validation des données transformées
console.log('3️⃣ Validation des données transformées:')
const validation = validateOpenAIInput(transformedData)
console.log(`   Valide: ${validation.isValid}`)
if (!validation.isValid) {
  console.log(`   Erreurs: ${validation.errors.join(', ')}`)
}
console.log()

// Test 4: Test avec données manquantes
console.log('4️⃣ Test avec données manquantes:')
const emptyData = transformToOpenAIFormat(mockUseCaseId, mockUseCaseName, [])
const emptyValidation = validateOpenAIInput(emptyData)
console.log(`   Valide: ${emptyValidation.isValid}`)
if (!emptyValidation.isValid) {
  console.log(`   Erreurs: ${emptyValidation.errors.join(', ')}`)
}

console.log('\n✅ Tests terminés!')


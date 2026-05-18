#!/usr/bin/env node

/**
 * Script pour tester l'API OpenAI sans sauvegarde en base
 * Usage: node scripts/test-openai-api.js [usecase_id]
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Simulation des fonctions de transformation
function extractTargetResponses(responses) {
  const targetResponses = []
  
  for (const response of responses) {
    if (response.question_code === 'E4.N7.Q2' || response.question_code === 'E5.N9.Q7') {
      targetResponses.push(response)
    }
  }
  
  return targetResponses
}

function transformToOpenAIFormat(usecaseId, usecaseName, responses) {
  const transformed = {
    usecase_id: usecaseId,
    usecase_name: usecaseName,
    responses: {
      E4_N7_Q2: {
        question: 'Domaines d\'utilisation à risque élevé',
        selected_options: [],
        selected_labels: []
      },
      E5_N9_Q7: {
        question: 'Registre centralisé des systèmes IA',
        selected_option: '',
        selected_label: '',
        conditional_data: {}
      }
    }
  }

  for (const response of responses) {
    if (response.question_code === 'E4.N7.Q2') {
      transformed.responses.E4_N7_Q2.selected_options = response.multiple_codes || []
      transformed.responses.E4_N7_Q2.selected_labels = response.multiple_labels || []
    } else if (response.question_code === 'E5.N9.Q7') {
      transformed.responses.E5_N9_Q7.selected_option = response.conditional_main || ''
      transformed.responses.E5_N9_Q7.selected_label = response.conditional_main || ''
      transformed.responses.E5_N9_Q7.conditional_data = {
        registry_type: response.conditional_main,
        system_name: usecaseName
      }
    }
  }

  return transformed
}

function validateOpenAIInput(data) {
  const errors = []

  if (!data.usecase_id) {
    errors.push('usecase_id is required')
  }

  if (!data.usecase_name) {
    errors.push('usecase_name is required')
  }

  if (!data.responses.E4_N7_Q2.selected_options.length) {
    errors.push('E4.N7.Q2 must have at least one selected option')
  }

  if (!data.responses.E5_N9_Q7.selected_option) {
    errors.push('E5.N9.Q7 must have a selected option')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Test de l'API OpenAI réelle
async function testOpenAIAPI(data) {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('Clé API OpenAI manquante')
  }

  console.log('🚀 Test de l\'API OpenAI réelle')
  console.log('📝 Clé API:', apiKey.substring(0, 10) + '...')
  
  const prompt = `
**ANALYSE DE CONFORMITÉ IA ACT - SECTION 3**

**Informations du cas d'usage :**
- Nom : ${data.usecase_name}
- ID : ${data.usecase_id}

**RÉPONSES AU QUESTIONNAIRE :**

**E4.N7.Q2 - Domaines d'utilisation (Risque élevé) :**
Question : ${data.responses.E4_N7_Q2.question}
Domaines sélectionnés :
${data.responses.E4_N7_Q2.selected_labels.length > 0 ? data.responses.E4_N7_Q2.selected_labels.map(domain => `- ${domain}`).join('\n') : 'Aucun domaine à risque élevé identifié'}

**E5.N9.Q7 - Registre centralisé des systèmes IA :**
Question : ${data.responses.E5_N9_Q7.question}
Réponse : ${data.responses.E5_N9_Q7.selected_label}
${Object.keys(data.responses.E5_N9_Q7.conditional_data).length > 0 ? 
  `Détails : ${Object.entries(data.responses.E5_N9_Q7.conditional_data).map(([key, value]) => `${key}: ${value}`).join(', ')}` : 
  ''}

**INSTRUCTIONS :**
Analyse ces informations et fournis une évaluation de conformité structurée avec :
1. Évaluation des domaines à risque élevé
2. Analyse du registre centralisé
3. Recommandations d'actions prioritaires
4. Quick wins (actions rapides)
5. Actions à moyen terme

Sois précis, professionnel et actionnable dans tes recommandations.
  `.trim()

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erreur API OpenAI: ${response.status} - ${errorText}`)
    }

    const openaiResponse = await response.json()
    return openaiResponse.choices[0]?.message?.content || 'Erreur lors de la génération de l\'analyse'
    
  } catch (error) {
    throw new Error(`Erreur avec OpenAI: ${error.message}`)
  }
}

async function testOpenAIAPIWithData(usecaseId) {
  console.log('🔍 Test de l\'API OpenAI avec données réelles')
  console.log(`📋 Use Case ID: ${usecaseId}`)
  console.log('─'.repeat(60))

  try {
    // 1. Récupérer les informations du use case
    console.log('\n1️⃣ Récupération du use case...')
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('id, name')
      .eq('id', usecaseId)
      .single()

    if (usecaseError || !usecase) {
      console.log('❌ Use case non trouvé')
      return
    }

    console.log('✅ Use case trouvé:', usecase.name)

    // 2. Récupérer les réponses du questionnaire
    console.log('\n2️⃣ Récupération des réponses...')
    const { data: responses, error: responseError } = await supabase
      .from('usecase_responses')
      .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
      .eq('usecase_id', usecaseId)
      .in('question_code', ['E4.N7.Q2', 'E5.N9.Q7'])

    if (responseError) {
      console.log('❌ Erreur récupération réponses:', responseError.message)
      return
    }

    console.log(`📝 Réponses trouvées: ${responses?.length || 0}`)

    // 3. Extraire et transformer les réponses
    console.log('\n3️⃣ Transformation des données...')
    const targetResponses = extractTargetResponses(responses || [])
    const transformedData = transformToOpenAIFormat(usecase.id, usecase.name, targetResponses)

    // 4. Valider les données transformées
    console.log('\n4️⃣ Validation des données...')
    const validation = validateOpenAIInput(transformedData)
    if (!validation.isValid) {
      console.log('⚠️ Données insuffisantes:', validation.errors)
      return
    }

    console.log('✅ Données validées')

    // 5. Tester l'API OpenAI réelle
    console.log('\n5️⃣ Test de l\'API OpenAI réelle...')
    const analysis = await testOpenAIAPI(transformedData)

    console.log('\n📄 RAPPORT GÉNÉRÉ PAR OPENAI:')
    console.log('─'.repeat(60))
    console.log(analysis)
    console.log('─'.repeat(60))

    console.log('\n🎉 Test réussi! L\'API OpenAI fonctionne parfaitement!')

  } catch (error) {
    console.error('❌ Erreur générale:', error.message)
  }
}

// Récupérer l'ID du use case depuis les arguments
const usecaseId = process.argv[2]

if (!usecaseId) {
  console.log('Usage: node scripts/test-openai-api.js [usecase_id]')
  console.log('Exemple: node scripts/test-openai-api.js dbe93d01-1b42-442a-80ab-79f71fdcd1bf')
  process.exit(1)
}

testOpenAIAPIWithData(usecaseId)


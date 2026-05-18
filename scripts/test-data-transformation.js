#!/usr/bin/env node

/**
 * Script pour tester la transformation des données sans API
 * Usage: node scripts/test-data-transformation.js [usecase_id]
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

// Simulation des fonctions de transformation (copiées du fichier original)
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

async function testDataTransformation(usecaseId) {
  console.log('🔍 Test de transformation des données pour OpenAI')
  console.log(`📋 Use Case ID: ${usecaseId}`)
  console.log('─'.repeat(60))

  try {
    // 1. Récupérer le use case
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('id, name')
      .eq('id', usecaseId)
      .single()

    if (usecaseError || !usecase) {
      console.error('❌ Use case non trouvé:', usecaseError?.message)
      return
    }

    console.log('✅ Use case trouvé:', usecase.name)

    // 2. Récupérer les réponses
    const { data: responses, error: responseError } = await supabase
      .from('usecase_responses')
      .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
      .eq('usecase_id', usecaseId)
      .in('question_code', ['E4.N7.Q2', 'E5.N9.Q7'])

    if (responseError) {
      console.error('❌ Erreur récupération réponses:', responseError.message)
      return
    }

    console.log(`📝 Réponses trouvées: ${responses?.length || 0}`)

    // 3. Extraire et transformer
    const targetResponses = extractTargetResponses(responses || [])
    console.log(`🎯 Réponses ciblées: ${targetResponses.length}`)

    const transformedData = transformToOpenAIFormat(usecase.id, usecase.name, targetResponses)
    console.log('\n📊 Données transformées:')
    console.log(JSON.stringify(transformedData, null, 2))

    // 4. Valider
    const validation = validateOpenAIInput(transformedData)
    console.log(`\n✅ Validation: ${validation.isValid ? 'Valide' : 'Invalide'}`)
    
    if (!validation.isValid) {
      console.log('❌ Erreurs de validation:')
      validation.errors.forEach(error => console.log(`  - ${error}`))
    } else {
      console.log('🎉 Données prêtes pour OpenAI!')
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message)
  }
}

// Récupérer l'ID du use case depuis les arguments
const usecaseId = process.argv[2]

if (!usecaseId) {
  console.log('Usage: node scripts/test-data-transformation.js [usecase_id]')
  console.log('Exemple: node scripts/test-data-transformation.js dbe93d01-1b42-442a-80ab-79f71fdcd1bf')
  process.exit(1)
}

testDataTransformation(usecaseId)


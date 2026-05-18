#!/usr/bin/env node

/**
 * Script pour vérifier les réponses du questionnaire dans Supabase
 * Usage: node scripts/check-questionnaire-responses.js [usecase_id]
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  console.log('Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkQuestionnaireResponses(usecaseId) {
  console.log('🔍 Vérification des réponses du questionnaire dans Supabase')
  console.log(`📋 Use Case ID: ${usecaseId}`)
  console.log('─'.repeat(60))

  try {
    // 1. Vérifier que le use case existe
    console.log('\n1️⃣ Vérification du use case...')
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('id, name, status')
      .eq('id', usecaseId)
      .single()

    if (usecaseError) {
      console.error('❌ Erreur lors de la récupération du use case:', usecaseError.message)
      return
    }

    if (!usecase) {
      console.error('❌ Use case non trouvé')
      return
    }

    console.log('✅ Use case trouvé:', usecase.name)
    console.log(`📊 Statut: ${usecase.status}`)

    // 2. Vérifier toutes les réponses du questionnaire
    console.log('\n2️⃣ Vérification de toutes les réponses...')
    const { data: allResponses, error: allResponsesError } = await supabase
      .from('usecase_responses')
      .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
      .eq('usecase_id', usecaseId)
      .order('question_code')

    if (allResponsesError) {
      console.error('❌ Erreur lors de la récupération des réponses:', allResponsesError.message)
      return
    }

    console.log(`📝 Nombre total de réponses: ${allResponses?.length || 0}`)
    
    if (allResponses && allResponses.length > 0) {
      console.log('\n📋 Liste des questions répondues:')
      allResponses.forEach((response, index) => {
        console.log(`  ${index + 1}. ${response.question_code}`)
        if (response.single_value) console.log(`     → Valeur unique: ${response.single_value}`)
        if (response.multiple_codes?.length) console.log(`     → Codes multiples: ${response.multiple_codes.join(', ')}`)
        if (response.multiple_labels?.length) console.log(`     → Labels multiples: ${response.multiple_labels.join(', ')}`)
        if (response.conditional_main) console.log(`     → Conditionnel principal: ${response.conditional_main}`)
      })
    }

    // 3. Vérifier spécifiquement E4.N7.Q2 et E5.N9.Q7
    console.log('\n3️⃣ Vérification des questions spécifiques...')
    const targetQuestions = ['E4.N7.Q2', 'E5.N9.Q7']
    
    for (const questionCode of targetQuestions) {
      const response = allResponses?.find(r => r.question_code === questionCode)
      
      if (response) {
        console.log(`✅ ${questionCode} - Réponse trouvée:`)
        console.log(`   - Valeur unique: ${response.single_value || 'N/A'}`)
        console.log(`   - Codes multiples: ${response.multiple_codes?.join(', ') || 'N/A'}`)
        console.log(`   - Labels multiples: ${response.multiple_labels?.join(', ') || 'N/A'}`)
        console.log(`   - Conditionnel principal: ${response.conditional_main || 'N/A'}`)
      } else {
        console.log(`❌ ${questionCode} - Aucune réponse trouvée`)
      }
    }

    // 4. Test de la transformation des données
    console.log('\n4️⃣ Test de la transformation des données...')
    try {
      const { extractTargetResponses, transformToOpenAIFormat, validateOpenAIInput } = require('../lib/openai-data-transformer')
      
      const targetResponses = extractTargetResponses(allResponses || [])
      console.log(`📊 Réponses ciblées extraites: ${targetResponses.length}`)
      
      const transformedData = transformToOpenAIFormat(usecase.id, usecase.name, targetResponses)
      console.log('📊 Données transformées:', {
        usecase_id: transformedData.usecase_id,
        usecase_name: transformedData.usecase_name,
        responses_count: Object.keys(transformedData.responses).length
      })
      
      const validation = validateOpenAIInput(transformedData)
      console.log(`✅ Validation: ${validation.isValid ? 'Valide' : 'Invalide'}`)
      if (!validation.isValid) {
        console.log('❌ Erreurs de validation:', validation.errors)
      }
      
    } catch (transformError) {
      console.error('❌ Erreur lors de la transformation:', transformError.message)
    }

    console.log('\n🎉 Vérification terminée!')

  } catch (error) {
    console.error('❌ Erreur générale:', error.message)
  }
}

// Récupérer l'ID du use case depuis les arguments
const usecaseId = process.argv[2]

if (!usecaseId) {
  console.log('Usage: node scripts/check-questionnaire-responses.js [usecase_id]')
  console.log('Exemple: node scripts/check-questionnaire-responses.js dbe93d01-1b42-442a-80ab-79f71fdcd1bf')
  process.exit(1)
}

checkQuestionnaireResponses(usecaseId)

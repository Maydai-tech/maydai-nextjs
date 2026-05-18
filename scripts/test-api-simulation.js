#!/usr/bin/env node

/**
 * Script pour simuler l'API de génération de rapport
 * Usage: node scripts/test-api-simulation.js [usecase_id]
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

// Simulation de l'API OpenAI
function simulateOpenAIAnalysis(data) {
  return `
**ANALYSE DE CONFORMITÉ IA ACT - SECTION 3**

**Informations du cas d'usage :**
- Nom : ${data.usecase_name}
- ID : ${data.usecase_id}

**ÉVALUATION DE CONFORMITÉ :**

**1. Domaines d'utilisation à risque élevé**
- Domaines identifiés : ${data.responses.E4_N7_Q2.selected_labels.join(', ')}
- Évaluation : ${data.responses.E4_N7_Q2.selected_labels.includes('Aucun de ces domaines') ? 'Aucun domaine à risque élevé identifié' : 'Domaines à risque élevé détectés'}

**2. Registre centralisé des systèmes IA**
- Statut : ${data.responses.E5_N9_Q7.selected_label}
- Évaluation : ${data.responses.E5_N9_Q7.selected_label.includes('B') ? 'Système non soumis au registre' : 'Système soumis au registre'}

**3. Recommandations d'actions prioritaires**
- Vérifier la classification de risque du système
- Mettre en place des mesures de conformité appropriées
- Documenter les processus de validation

**4. Quick wins (actions rapides)**
- Réviser la documentation du système
- Identifier les parties prenantes responsables
- Mettre à jour les procédures internes

**5. Actions à moyen terme**
- Implémenter un système de monitoring
- Former les équipes aux exigences de l'AI Act
- Établir un processus de révision régulière
  `.trim()
}

async function simulateAPI(usecaseId) {
  console.log('🔍 Simulation de l\'API de génération de rapport')
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
      return { error: 'Usecase not found', status: 404 }
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
      return { error: 'Failed to fetch questionnaire responses', status: 500 }
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
      return { 
        error: 'Données insuffisantes pour l\'analyse. Veuillez compléter le questionnaire d\'abord.', 
        details: validation.errors,
        requires_questionnaire: true,
        status: 400
      }
    }

    console.log('✅ Données validées')

    // 5. Simuler la génération de l'analyse
    console.log('\n5️⃣ Génération de l\'analyse (simulation)...')
    const analysis = simulateOpenAIAnalysis(transformedData)

    // 6. Sauvegarder le rapport dans la base de données
    console.log('\n6️⃣ Sauvegarde du rapport...')
    const { error: saveError } = await supabase
      .from('usecases')
      .update({ 
        report_summary: analysis,
        report_generated_at: new Date().toISOString()
      })
      .eq('id', usecaseId)

    if (saveError) {
      console.log('❌ Erreur sauvegarde:', saveError.message)
      return { 
        error: 'Failed to save report to database',
        details: saveError.message,
        status: 500
      }
    }

    console.log('✅ Rapport sauvegardé')

    return { 
      report: analysis,
      success: true,
      timestamp: new Date().toISOString(),
      usecase_id: usecase.id,
      usecase_name: usecase.name,
      saved_to_db: true,
      status: 200
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message)
    return { 
      error: 'Erreur lors de la génération du rapport IA',
      details: error.message,
      status: 500
    }
  }
}

// Récupérer l'ID du use case depuis les arguments
const usecaseId = process.argv[2]

if (!usecaseId) {
  console.log('Usage: node scripts/test-api-simulation.js [usecase_id]')
  console.log('Exemple: node scripts/test-api-simulation.js dbe93d01-1b42-442a-80ab-79f71fdcd1bf')
  process.exit(1)
}

simulateAPI(usecaseId).then(result => {
  console.log('\n🎉 Simulation terminée!')
  console.log('📊 Résultat:', JSON.stringify(result, null, 2))
})


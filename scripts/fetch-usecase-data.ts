#!/usr/bin/env npx tsx

/**
 * Script pour récupérer toutes les données d'un cas d'usage
 * et générer le JSON d'entrée pour l'assistant OpenAI
 */

import { createClient } from '@supabase/supabase-js';
import { transformToOpenAIFormatComplete } from '../lib/openai-data-transformer';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

loadEnvFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Utiliser la clé anonyme

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchUsecaseData() {
  const usecaseId = '5d996313-8484-4b15-a571-4210fcb1235f';
  
  console.log('🔍 Récupération des données du cas d\'usage:', usecaseId);
  console.log('=' .repeat(60));

  try {
    // 1. Récupérer les informations complètes du use case
    console.log('\n📊 1. Récupération des données de base...');
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select(`
        id, name, description, deployment_date, status, risk_level, ai_category, 
        system_type, responsible_service, deployment_countries, company_status,
        technology_partner, llm_model_version, primary_model_id,
        score_base, score_model, score_final, is_eliminated, elimination_reason,
        companies(name, industry, city, country),
        compl_ai_models(id, model_name, model_provider, model_type, version)
      `)
      .eq('id', usecaseId)
      .single();

    if (usecaseError || !usecase) {
      console.error('❌ Cas d\'usage non trouvé:', usecaseError?.message);
      return;
    }

    console.log('✅ Cas d\'usage trouvé:', usecase.name);

    // 2. Récupérer les réponses du questionnaire
    console.log('\n📋 2. Récupération des réponses du questionnaire...');
    const { data: responses, error: responseError } = await supabase
      .from('usecase_responses')
      .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values, answered_by')
      .eq('usecase_id', usecaseId);

    if (responseError) {
      console.error('❌ Erreur récupération réponses:', responseError?.message);
      return;
    }

    console.log('✅ Réponses trouvées:', responses?.length || 0);

    // 3. Extraire les informations d'entreprise et modèle
    const company = Array.isArray(usecase.companies) ? usecase.companies[0] : usecase.companies;
    const model = Array.isArray(usecase.compl_ai_models) ? usecase.compl_ai_models[0] : usecase.compl_ai_models;
    const respondentEmail = responses?.[0]?.answered_by || 'Non disponible';

    console.log('🏢 Entreprise:', company?.name || 'Non spécifiée');
    console.log('🤖 Modèle:', model?.model_name || 'Non spécifié');

    // 4. Transformer les données pour OpenAI
    console.log('\n🔄 3. Transformation des données pour OpenAI...');
    const transformedData = transformToOpenAIFormatComplete(
      usecase as any,
      company,
      model,
      responses || [],
      respondentEmail
    );

    // 5. Sauvegarder les données dans des fichiers
    console.log('\n💾 4. Sauvegarde des données...');
    
    // Données brutes
    fs.writeFileSync('usecase_raw_data.json', JSON.stringify(usecase, null, 2));
    fs.writeFileSync('responses_raw_data.json', JSON.stringify(responses, null, 2));
    
    // Données transformées pour OpenAI
    fs.writeFileSync('openai_input_data.json', JSON.stringify(transformedData, null, 2));
    
    // Données de l'entreprise et modèle
    fs.writeFileSync('company_model_data.json', JSON.stringify({
      company,
      model,
      respondentEmail
    }, null, 2));

    console.log('✅ Fichiers générés:');
    console.log('   - usecase_raw_data.json (données brutes du cas d\'usage)');
    console.log('   - responses_raw_data.json (réponses du questionnaire)');
    console.log('   - openai_input_data.json (données transformées pour OpenAI)');
    console.log('   - company_model_data.json (entreprise et modèle)');

    // 6. Afficher un résumé
    console.log('\n📋 5. Résumé des données:');
    console.log('   - Nom du cas d\'usage:', usecase.name);
    console.log('   - Description:', usecase.description?.substring(0, 100) + '...');
    console.log('   - Niveau de risque:', usecase.risk_level);
    console.log('   - Catégorie IA:', usecase.ai_category);
    console.log('   - Nombre de réponses:', responses?.length || 0);
    console.log('   - Entreprise:', company?.name);
    console.log('   - Modèle:', model?.model_name);

    // 7. Afficher la structure des données transformées
    console.log('\n🔍 6. Structure des données transformées:');
    console.log('   - usecase_context_fields:', !!transformedData.usecase_context_fields);
    console.log('   - questionnaire_questions:', transformedData.questionnaire_questions?.length || 0);
    console.log('   - questionnaire_questions count:', transformedData.questionnaire_questions ? Object.keys(transformedData.questionnaire_questions).length : 0);

    console.log('\n🎯 JSON d\'entrée prêt pour l\'assistant OpenAI !');
    console.log('📁 Consultez le fichier openai_input_data.json pour voir la structure complète.');

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données:', error);
  }
}

// Exécution du script
if (require.main === module) {
  fetchUsecaseData().catch(console.error);
}

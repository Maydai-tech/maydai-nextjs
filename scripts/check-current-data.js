#!/usr/bin/env node

// Script pour vérifier les données COMPL-AI actuelles dans Supabase
// Usage: node scripts/check-current-data.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkCurrentData() {
  console.log('🔍 Checking current COMPL-AI data in Supabase...');
  console.log('');

  // Initialiser le client Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Récupérer les données pour gpt-4-1106-preview dans la catégorie diversity
    console.log('📊 Getting data for gpt-4-1106-preview in diversity category...');
    
    const { data: evaluations, error } = await supabase
      .from('compl_ai_evaluations')
      .select(`
        id,
        score,
        score_text,
        evaluation_date,
        raw_data,
        compl_ai_models!inner (
          model_name,
          model_provider
        ),
        compl_ai_principles!inner (
          name,
          code,
          category
        )
      `)
      .eq('compl_ai_models.model_name', 'gpt-4-1106-preview')
      .eq('compl_ai_principles.code', 'diversity_non_discrimination_fairness')
      .order('evaluation_date', { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    if (!evaluations || evaluations.length === 0) {
      console.log('❌ No data found for gpt-4-1106-preview in diversity category');
      return;
    }

    console.log(`✅ Found ${evaluations.length} evaluation(s)`);
    console.log('');

    for (const evaluation of evaluations) {
      console.log('📋 Evaluation details:');
      console.log(`   ID: ${evaluation.id}`);
      console.log(`   Model: ${evaluation.compl_ai_models.model_name}`);
      console.log(`   Principle: ${evaluation.compl_ai_principles.name}`);
      console.log(`   Score: ${evaluation.score}`);
      console.log(`   Date: ${evaluation.evaluation_date}`);
      console.log('');

      if (evaluation.raw_data) {
        console.log('🔍 Raw data analysis:');
        const rawData = evaluation.raw_data;
        
        if (rawData.benchmark_details) {
          console.log('   Benchmark details:');
          for (const benchmark of rawData.benchmark_details) {
            console.log(`     - ${benchmark.name}: ${benchmark.score}`);
          }
        }
        
        if (rawData.detailed_scores) {
          console.log('   Detailed scores:');
          for (const score of rawData.detailed_scores) {
            console.log(`     - ${score.name}: ${score.score}`);
          }
        }
        
        console.log('');
      }
    }

    // Vérifier aussi toutes les catégories pour ce modèle
    console.log('📊 All categories for gpt-4-1106-preview:');
    
    const { data: allEvaluations, error: allError } = await supabase
      .from('compl_ai_evaluations')
      .select(`
        score,
        compl_ai_models!inner (model_name),
        compl_ai_principles!inner (name, code)
      `)
      .eq('compl_ai_models.model_name', 'gpt-4-1106-preview')
      .order('compl_ai_principles.code');

    if (allError) {
      throw allError;
    }

    for (const evaluation of allEvaluations) {
      console.log(`   ${evaluation.compl_ai_principles.code}: ${evaluation.score}`);
    }

  } catch (error) {
    console.error('❌ Error checking data:', error);
  }
}

// Fonction pour vérifier la structure des principes
async function checkPrinciples() {
  console.log('');
  console.log('🎯 Checking available principles...');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: principles, error } = await supabase
    .from('compl_ai_principles')
    .select('*')
    .order('code');

  if (error) {
    console.error('❌ Error getting principles:', error);
    return;
  }

  console.log('📋 Available principles:');
  for (const principle of principles) {
    console.log(`   ${principle.code}: ${principle.name}`);
  }
}

async function main() {
  await checkCurrentData();
  await checkPrinciples();
  
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. If data looks incorrect, deploy the fixed Edge function');
  console.log('   2. Resync data using the admin interface');
  console.log('   3. Check the new results');
}

main().catch(console.error);
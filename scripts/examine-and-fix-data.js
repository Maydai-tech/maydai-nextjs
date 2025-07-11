#!/usr/bin/env node

// Script pour examiner et corriger manuellement les données COMPL-AI
// Usage: node scripts/examine-and-fix-data.js

const https = require('https');

const SUPABASE_URL = "https://kzdolxpjysirikcpusrv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6ZG9seHBqeXNpcmlrY3B1c3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzI0OTksImV4cCI6MjA2MDgwODQ5OX0.47DS18wnPjClHoSXY2S6ey3SpmBU_CmPjM3D_-o76LE";

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'kzdolxpjysirikcpusrv.supabase.co',
      port: 443,
      path: `/rest/v1${path}`,
      method: method,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function examineCurrentData() {
  console.log('🔍 Examining current COMPL-AI data...');
  console.log('');

  try {
    // Récupérer les évaluations pour gpt-4-1106-preview diversity
    const response = await makeRequest('GET', 
      '/compl_ai_evaluations?select=id,score,raw_data,compl_ai_models!inner(model_name),compl_ai_principles!inner(name,code)&compl_ai_models.model_name=eq.gpt-4-1106-preview&compl_ai_principles.code=eq.diversity_non_discrimination_fairness'
    );

    if (response.status !== 200) {
      console.error('❌ Error fetching data:', response.status, response.data);
      return null;
    }

    const data = response.data;
    console.log(`✅ Found ${data.length} evaluation(s) for gpt-4-1106-preview diversity`);

    if (data.length > 0) {
      const evaluation = data[0];
      console.log('');
      console.log('📋 Current evaluation:');
      console.log(`   ID: ${evaluation.id}`);
      console.log(`   Score: ${evaluation.score}`);
      console.log('');

      if (evaluation.raw_data?.benchmark_details) {
        console.log('📊 Current benchmark details:');
        evaluation.raw_data.benchmark_details.forEach((benchmark, index) => {
          console.log(`   ${index + 1}. ${benchmark.name}: ${benchmark.score}`);
          
          if (benchmark.name.includes('Representation Bias')) {
            if (benchmark.score === 0.98) {
              console.log('      ❌ PROBLEM: This should be N/A, not 0.98');
            }
          }
        });
        
        console.log('');
        console.log('🎯 Expected correct mapping:');
        console.log('   1. Representation Bias: RedditBias -> N/A (score: -1)');
        console.log('   2. Prejudiced Answers: BBQ -> 0.98');
        console.log('   3. Biased Completions: BOLD -> 0.74');
        console.log('   4. Income Fairness: DecodingTrust -> 0.88');
        console.log('   5. Recommendation Consistency: FaiRLLM -> 0.13');
      }

      return evaluation;
    } else {
      console.log('❌ No data found for gpt-4-1106-preview diversity');
      return null;
    }

  } catch (error) {
    console.error('❌ Error examining data:', error);
    return null;
  }
}

async function fixDataManually(evaluationId) {
  console.log('');
  console.log('🔧 Attempting to fix data manually...');

  // Données corrigées basées sur notre analyse de l'API COMPL-AI
  const correctedBenchmarkDetails = [
    {
      "name": "Representation Bias: RedditBias",
      "key": "reddit_bias_score", 
      "category": "bias",
      "score": -1,  // N/A
      "position": 0
    },
    {
      "name": "Prejudiced Answers: BBQ",
      "key": "bbq_prejudice_score",
      "category": "bias", 
      "score": 0.98,
      "position": 1
    },
    {
      "name": "Biased Completions: BOLD",
      "key": "bold_completions_score",
      "category": "bias",
      "score": 0.74,
      "position": 2
    },
    {
      "name": "Income Fairness: DecodingTrust", 
      "key": "income_fairness_score",
      "category": "fairness",
      "score": 0.88,
      "position": 3
    },
    {
      "name": "Recommendation Consistency: FaiRLLM",
      "key": "recommendation_consistency_score", 
      "category": "fairness",
      "score": 0.13,
      "position": 4
    }
  ];

  // Calculer le nouveau score moyen (sans les N/A)
  const validScores = correctedBenchmarkDetails.filter(b => b.score !== -1).map(b => b.score);
  const newAverageScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;

  const updatedRawData = {
    scores: validScores,
    benchmarks_count: validScores.length,
    average_score: newAverageScore,
    category_code: "diversity_non_discrimination_fairness",
    gradio_endpoint: "/partial_9",
    detailed_scores: correctedBenchmarkDetails,
    benchmark_details: correctedBenchmarkDetails,
    sync_metadata: {
      sync_date: new Date().toISOString().split('T')[0],
      mapping_method: 'manual_correction',
      total_benchmarks_mapped: correctedBenchmarkDetails.length,
      model_parsed_name: 'gpt-4-1106-preview',
      model_parsed_provider: 'OpenAI',
      correction_reason: 'Fixed header-based mapping issue'
    }
  };

  try {
    const response = await makeRequest('PATCH', 
      `/compl_ai_evaluations?id=eq.${evaluationId}`,
      {
        score: newAverageScore,
        score_text: newAverageScore.toFixed(3),
        raw_data: updatedRawData
      }
    );

    if (response.status === 204) {
      console.log('✅ Data corrected successfully!');
      console.log(`   New average score: ${newAverageScore.toFixed(3)}`);
      console.log('   Representation Bias now shows N/A (-1)');
      console.log('   BBQ now correctly shows 0.98');
      return true;
    } else {
      console.error('❌ Failed to update data:', response.status, response.data);
      return false;
    }

  } catch (error) {
    console.error('❌ Error updating data:', error);
    return false;
  }
}

async function main() {
  const evaluation = await examineCurrentData();
  
  if (evaluation) {
    console.log('');
    console.log('💡 Options:');
    console.log('   1. The data shows the old incorrect mapping');
    console.log('   2. We can fix it manually with the correct values');
    console.log('   3. Or wait to deploy the corrected Edge function');
    console.log('');
    
    // Auto-fix pour démonstration
    console.log('🔄 Proceeding with manual fix...');
    const success = await fixDataManually(evaluation.id);
    
    if (success) {
      console.log('');
      console.log('🎉 Manual correction completed!');
      console.log('   Now check the admin interface - it should show:');
      console.log('   - Representation Bias: N/A');
      console.log('   - Prejudiced Answers BBQ: 0.98');
    }
  }
}

main().catch(console.error);
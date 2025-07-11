// Script pour examiner les données actuelles dans Supabase
// À exécuter dans la console du navigateur sur une page avec Supabase

console.log('🔍 Examining current COMPL-AI data...');

// Fonction à exécuter dans la console browser
async function checkCurrentScores() {
  try {
    // Récupérer les évaluations pour gpt-4-1106-preview
    const response = await fetch('https://kzdolxpjysirikcpusrv.supabase.co/rest/v1/compl_ai_evaluations?select=id,score,raw_data,compl_ai_models!inner(model_name),compl_ai_principles!inner(name,code)&compl_ai_models.model_name=eq.gpt-4-1106-preview&compl_ai_principles.code=eq.diversity_non_discrimination_fairness', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6ZG9seHBqeXNpcmlrY3B1c3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzI0OTksImV4cCI6MjA2MDgwODQ5OX0.47DS18wnPjClHoSXY2S6ey3SpmBU_CmPjM3D_-o76LE',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6ZG9seHBqeXNpcmlrY3B1c3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzI0OTksImV4cCI6MjA2MDgwODQ5OX0.47DS18wnPjClHoSXY2S6ey3SpmBU_CmPjM3D_-o76LE'
      }
    });
    
    const data = await response.json();
    
    console.log('📊 Data found:', data);
    
    if (data.length > 0) {
      const evaluation = data[0];
      console.log('🎯 Diversity evaluation for gpt-4-1106-preview:');
      console.log('   Score:', evaluation.score);
      console.log('   Raw data:', evaluation.raw_data);
      
      if (evaluation.raw_data?.benchmark_details) {
        console.log('   📋 Benchmark details:');
        evaluation.raw_data.benchmark_details.forEach(benchmark => {
          console.log(`     - ${benchmark.name}: ${benchmark.score}`);
          
          if (benchmark.name.includes('Representation Bias')) {
            if (benchmark.score === -1) {
              console.log('       ✅ CORRECT: Shows -1 for N/A');
            } else if (benchmark.score === 0.98) {
              console.log('       ❌ WRONG: Still shows 0.98 (should be N/A)');
            } else {
              console.log(`       ⚠️  UNEXPECTED: Shows ${benchmark.score}`);
            }
          }
        });
      }
    } else {
      console.log('❌ No data found for gpt-4-1106-preview diversity');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCurrentScores();
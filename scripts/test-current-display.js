// Script pour tester l'affichage actuel des données COMPL-AI
// À exécuter dans la console du navigateur sur la page admin

(async function testCurrentDisplay() {
  console.log('🔍 Testing current COMPL-AI data display...');
  
  try {
    // Utiliser le client Supabase global de l'app
    const { supabase } = window;
    
    if (!supabase) {
      console.error('❌ Supabase client not found. Run this in the admin page.');
      return;
    }
    
    // Récupérer les données comme dans la page admin
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
          model_provider,
          model_type,
          version
        ),
        compl_ai_principles!inner (
          name,
          code,
          category
        )
      `)
      .order('evaluation_date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching data:', error);
      return;
    }

    console.log(`✅ Found ${evaluations.length} evaluations`);
    
    // Filtrer pour gpt-4-1106-preview
    const gpt4Evaluations = evaluations.filter(ev => 
      ev.compl_ai_models.model_name === 'gpt-4-1106-preview'
    );
    
    console.log(`🎯 Found ${gpt4Evaluations.length} evaluations for gpt-4-1106-preview`);
    
    // Analyser chaque évaluation
    for (const evaluation of gpt4Evaluations) {
      console.log('');
      console.log(`📋 Principle: ${evaluation.compl_ai_principles.name}`);
      console.log(`   Code: ${evaluation.compl_ai_principles.code}`);
      console.log(`   Score: ${evaluation.score}`);
      console.log(`   Date: ${evaluation.evaluation_date}`);
      
      if (evaluation.raw_data?.benchmark_details) {
        console.log('   📊 Benchmark details:');
        for (const benchmark of evaluation.raw_data.benchmark_details) {
          console.log(`     - ${benchmark.name}: ${benchmark.score}`);
        }
      }
      
      // Vérifier spécifiquement la catégorie diversity
      if (evaluation.compl_ai_principles.code === 'diversity_non_discrimination_fairness') {
        console.log('');
        console.log('🔍 DIVERSITY CATEGORY ANALYSIS:');
        console.log('   This is the problematic category!');
        
        if (evaluation.raw_data?.benchmark_details) {
          const repBias = evaluation.raw_data.benchmark_details.find(b => 
            b.name.includes('Representation Bias')
          );
          const bbq = evaluation.raw_data.benchmark_details.find(b => 
            b.name.includes('BBQ')
          );
          
          console.log(`   Representation Bias: ${repBias ? repBias.score : 'NOT FOUND'}`);
          console.log(`   BBQ: ${bbq ? bbq.score : 'NOT FOUND'}`);
          
          if (repBias && repBias.score === 0.98) {
            console.log('   ❌ PROBLEM CONFIRMED: Representation Bias shows 0.98 instead of N/A');
          } else if (repBias && repBias.score === -1) {
            console.log('   ✅ FIXED: Representation Bias correctly shows N/A (-1)');
          }
        }
      }
    }
    
    console.log('');
    console.log('💡 Summary:');
    console.log('   - If you see 0.98 for Representation Bias, the old data is still there');
    console.log('   - If you see -1 or N/A, the fix is working');
    console.log('   - You may need to resync data to get the corrected mapping');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
})();

console.log('📋 Copy and paste this script in the browser console on the admin page:');
console.log('   1. Go to /admin/compl-ai-scores');
console.log('   2. Open browser dev tools (F12)');
console.log('   3. Paste this script in the console');
console.log('   4. Check the results');
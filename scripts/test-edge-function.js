#!/usr/bin/env node

/**
 * Script Node.js pour tester l'edge function COMPL-AI
 * Usage: node scripts/test-edge-function.js
 */

async function testComplAISync() {
  console.log('🧪 Test de l\'edge function COMPL-AI...\n');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch('https://kzdolxpjysirikcpusrv.supabase.co/functions/v1/compl-ai-sync', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6ZG9seHBqeXNpcmlrY3B1c3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzI0OTksImV4cCI6MjA2MDgwODQ5OX0.47DS18wnPjClHoSXY2S6ey3SpmBU_CmPjM3D_-o76LE',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    const totalTime = Date.now() - startTime;

    console.log('📊 Réponse de l\'edge function:');
    console.log(JSON.stringify(data, null, 2));
    console.log();

    if (data.success) {
      console.log('✅ Edge function exécutée avec succès !');
      console.log(`📈 Statistiques:`);
      console.log(`   • Modèles synchronisés: ${data.models_synced}`);
      console.log(`   • Évaluations créées: ${data.evaluations_created}`);
      console.log(`   • Catégories traitées: ${data.categories_processed}/5`);
      console.log(`   • Temps d'exécution: ${data.execution_time_ms}ms`);
      console.log(`   • Temps total (réseau inclus): ${totalTime}ms`);
      
      if (data.errors && data.errors.length > 0) {
        console.log(`⚠️  Erreurs: ${data.errors.join(', ')}`);
      } else {
        console.log('✨ Aucune erreur !');
      }
    } else {
      console.log('❌ Échec de l\'edge function');
      console.log(`💥 Erreur: ${data.error || 'Erreur inconnue'}`);
    }

  } catch (error) {
    console.error('💥 Erreur lors du test:', error.message);
    process.exit(1);
  }
}

// Exécuter le test
testComplAISync();
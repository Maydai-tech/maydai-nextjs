#!/usr/bin/env node

// Script pour tester le nettoyage des modèles HTML
const { createClient } = require('@supabase/supabase-js');

async function testCleanHTML() {
  // Configuration Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Variables d\'environnement manquantes');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🧹 Début du nettoyage des modèles HTML...');
    
    // Appeler l'edge function de nettoyage
    const { data, error } = await supabase.functions.invoke('clean-html-models', {
      method: 'POST'
    });

    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }

    if (data?.success) {
      console.log('✅ Nettoyage réussi !');
      console.log(`📊 ${data.deleted_models} modèles supprimés`);
      console.log(`📊 ${data.deleted_evaluations} évaluations supprimées`);
      if (data.cleaned_model_names?.length > 0) {
        console.log('🗑️ Modèles nettoyés:');
        data.cleaned_model_names.forEach(name => console.log(`  - ${name}`));
      }
    } else {
      console.error('❌ Nettoyage échoué:', data?.error);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error.message);
  }
}

testCleanHTML();
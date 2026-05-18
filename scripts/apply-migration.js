#!/usr/bin/env node

/**
 * Script pour appliquer la migration SQL dans Supabase
 * Usage: node scripts/apply-migration.js
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

async function applyMigration() {
  console.log('🔧 Application de la migration SQL pour les rapports OpenAI')
  console.log('─'.repeat(60))

  try {
    // SQL de la migration
    const migrationSQL = `
      -- Ajouter les champs pour stocker les rapports d'analyse IA
      ALTER TABLE usecases 
      ADD COLUMN IF NOT EXISTS report_summary TEXT,
      ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMPTZ;

      -- Index pour les performances sur la recherche de rapports
      CREATE INDEX IF NOT EXISTS idx_usecases_report_generated_at ON usecases(report_generated_at);

      -- Commentaires pour la documentation
      COMMENT ON COLUMN usecases.report_summary IS 'Rapport d''analyse de conformité IA Act généré par OpenAI';
      COMMENT ON COLUMN usecases.report_generated_at IS 'Date et heure de génération du rapport d''analyse';
    `

    console.log('📝 Exécution de la migration SQL...')
    
    // Exécuter la migration via l'API Supabase
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Erreur lors de l\'exécution de la migration:', error.message)
      
      // Essayer une approche alternative avec des requêtes individuelles
      console.log('\n🔄 Tentative avec des requêtes individuelles...')
      
      try {
        // Vérifier si les colonnes existent déjà
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'usecases')
          .in('column_name', ['report_summary', 'report_generated_at'])

        if (columnsError) {
          console.log('⚠️ Impossible de vérifier les colonnes existantes')
        } else {
          console.log('📊 Colonnes existantes:', columns?.map(c => c.column_name) || [])
        }

        // Essayer d'ajouter les colonnes une par une
        console.log('\n📝 Note: La migration doit être appliquée manuellement dans Supabase')
        console.log('1. Aller sur https://supabase.com/dashboard')
        console.log('2. Sélectionner votre projet')
        console.log('3. Aller dans SQL Editor')
        console.log('4. Exécuter le SQL suivant:')
        console.log('\n' + migrationSQL)
        
      } catch (altError) {
        console.error('❌ Erreur alternative:', altError.message)
      }
      
      return false
    }

    console.log('✅ Migration appliquée avec succès')
    console.log('📊 Résultat:', data)
    return true

  } catch (error) {
    console.error('❌ Erreur générale:', error.message)
    return false
  }
}

// Fonction pour vérifier si la migration a été appliquée
async function checkMigration() {
  console.log('\n🔍 Vérification de la migration...')
  
  try {
    // Tenter de sélectionner les nouvelles colonnes
    const { data, error } = await supabase
      .from('usecases')
      .select('id, name, report_summary, report_generated_at')
      .limit(1)

    if (error) {
      console.log('❌ Migration non appliquée:', error.message)
      return false
    }

    console.log('✅ Migration appliquée - colonnes disponibles')
    return true

  } catch (error) {
    console.log('❌ Erreur de vérification:', error.message)
    return false
  }
}

async function main() {
  // Vérifier d'abord si la migration est déjà appliquée
  const isApplied = await checkMigration()
  
  if (isApplied) {
    console.log('🎉 Migration déjà appliquée!')
    return
  }

  // Appliquer la migration
  const success = await applyMigration()
  
  if (success) {
    // Vérifier à nouveau
    await checkMigration()
  }
}

main()


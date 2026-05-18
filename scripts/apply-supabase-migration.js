#!/usr/bin/env node

/**
 * Script pour appliquer la migration SQL dans Supabase
 * Usage: node scripts/apply-supabase-migration.js
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
    // Vérifier d'abord si les colonnes existent déjà
    console.log('\n1️⃣ Vérification des colonnes existantes...')
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('usecases')
        .select('id, name, report_summary, report_generated_at')
        .limit(1)

      if (testError && testError.message.includes('report_summary')) {
        console.log('❌ Colonnes manquantes, migration nécessaire')
      } else {
        console.log('✅ Colonnes déjà présentes')
        return true
      }
    } catch (error) {
      console.log('❌ Colonnes manquantes, migration nécessaire')
    }

    // Essayer d'ajouter les colonnes une par une
    console.log('\n2️⃣ Ajout des colonnes...')
    
    try {
      // Ajouter report_summary
      const { error: error1 } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE usecases ADD COLUMN IF NOT EXISTS report_summary TEXT;'
      })
      
      if (error1) {
        console.log('⚠️ Erreur ajout report_summary:', error1.message)
      } else {
        console.log('✅ Colonne report_summary ajoutée')
      }

      // Ajouter report_generated_at
      const { error: error2 } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE usecases ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMPTZ;'
      })
      
      if (error2) {
        console.log('⚠️ Erreur ajout report_generated_at:', error2.message)
      } else {
        console.log('✅ Colonne report_generated_at ajoutée')
      }

    } catch (error) {
      console.log('❌ Erreur lors de l\'ajout des colonnes:', error.message)
    }

    // Vérifier à nouveau
    console.log('\n3️⃣ Vérification finale...')
    
    try {
      const { data: finalTest, error: finalError } = await supabase
        .from('usecases')
        .select('id, name, report_summary, report_generated_at')
        .limit(1)

      if (finalError) {
        console.log('❌ Migration échouée:', finalError.message)
        console.log('\n📝 Instructions manuelles:')
        console.log('1. Aller sur https://supabase.com/dashboard')
        console.log('2. Sélectionner votre projet')
        console.log('3. Aller dans SQL Editor')
        console.log('4. Exécuter le SQL suivant:')
        console.log('\nALTER TABLE usecases ADD COLUMN IF NOT EXISTS report_summary TEXT;')
        console.log('ALTER TABLE usecases ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMPTZ;')
        console.log('CREATE INDEX IF NOT EXISTS idx_usecases_report_generated_at ON usecases(report_generated_at);')
        return false
      } else {
        console.log('✅ Migration réussie!')
        return true
      }

    } catch (error) {
      console.log('❌ Erreur de vérification:', error.message)
      return false
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message)
    return false
  }
}

async function main() {
  const success = await applyMigration()
  
  if (success) {
    console.log('\n🎉 Migration terminée avec succès!')
    console.log('🔄 Vous pouvez maintenant tester l\'API complète')
  } else {
    console.log('\n⚠️ Migration échouée, suivez les instructions manuelles')
  }
}

main()


#!/usr/bin/env node

/**
 * Script de migration pour ajouter les scores par catégorie aux anciens use cases
 * 
 * Usage: node scripts/migrate-scores.js
 * 
 * Ce script :
 * 1. Trouve tous les use cases existants
 * 2. Recalcule leur score avec les nouvelles catégories
 * 3. Met à jour les enregistrements en base
 */

const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your-admin-secret-here'
const API_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function migrateScores() {
  console.log('🔄 Migration des scores par catégorie')
  console.log('=====================================')
  
  try {
    console.log('📡 Lancement de la migration...')
    
    const response = await fetch(`${API_URL}/api/admin/recalculate-scores`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer admin-secret-${ADMIN_SECRET}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Erreur API: ${errorData.error}`)
    }

    const result = await response.json()
    
    console.log('✅ Migration terminée!')
    console.log(`📊 Statistiques:`)
    console.log(`   - Total traité: ${result.total_processed}`)
    console.log(`   - Succès: ${result.success_count}`)
    console.log(`   - Erreurs: ${result.error_count}`)
    
    if (result.error_count > 0) {
      console.log('\n❌ Erreurs détectées:')
      result.results
        .filter(r => r.status === 'error')
        .forEach(r => {
          console.log(`   - Use case ${r.usecase_id}: ${r.error}`)
        })
    }

    if (result.success_count > 0) {
      console.log('\n✅ Succès:')
      result.results
        .filter(r => r.status === 'success')
        .slice(0, 5) // Afficher seulement les 5 premiers
        .forEach(r => {
          console.log(`   - Use case ${r.usecase_id}: Score ${r.score}, ${r.category_count} catégories`)
        })
      
      if (result.success_count > 5) {
        console.log(`   ... et ${result.success_count - 5} autres`)
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message)
    process.exit(1)
  }
}

// Demander confirmation avant d'exécuter
rl.question('Voulez-vous migrer tous les scores existants ? (y/N) ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    migrateScores()
      .then(() => {
        console.log('\n🎉 Migration terminée avec succès!')
        rl.close()
      })
      .catch(error => {
        console.error('\n💥 Erreur fatale:', error)
        rl.close()
        process.exit(1)
      })
  } else {
    console.log('❌ Migration annulée')
    rl.close()
  }
}) 
/**
 * Script d'import CSV pour compl_ai_models
 * 
 * Ce script télécharge un CSV depuis une URL Supabase Storage
 * et met à jour la table compl_ai_models avec toutes les colonnes.
 * Utilise l'ID (UUID) pour identifier et mettre à jour les modèles existants.
 * 
 * Usage :
 *   npx tsx scripts/import-compl-ai-models-from-url.ts
 *   npx tsx scripts/import-compl-ai-models-from-url.ts "https://autre-url.csv"
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DEFAULT_CSV_URL = 'https://kzdolxpjysirikcpusrv.supabase.co/storage/v1/object/public/LLM%20Maj%2012/compl_ai_models_rows%20-%20compl_ai_models_rows.csv'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables d\'environnement manquantes')
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis')
  console.error('\nPour obtenir SUPABASE_SERVICE_ROLE_KEY:')
  console.error('1. Allez dans Supabase Dashboard → Settings → API')
  console.error('2. Copiez la "service_role" key (⚠️  gardez-la secrète!)')
  console.error('3. Ajoutez-la dans .env.local:')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface CSVRow {
  id: string
  model_name: string
  model_provider?: string
  model_type?: string
  version?: string
  created_at?: string
  updated_at?: string
  model_provider_id?: string
  short_name?: string
  long_name?: string
  launch_date?: string
  notes_short?: string
  notes_long?: string
  variants?: string
}

function parseVariants(variantsStr: string | undefined): any[] {
  if (!variantsStr || variantsStr.trim() === '' || variantsStr === '[]') {
    return []
  }
  try {
    // Gérer les guillemets échappés dans le CSV ("" devient ")
    const cleaned = variantsStr.replace(/""/g, '"')
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn(`⚠️  Erreur parsing variants: ${variantsStr}, utilisation de []`)
    return []
  }
}

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null
  
  // Gérer différents formats de date
  // Format PostgreSQL: 2024-07-23
  // Format avec timestamp: 2024-07-23 12:00:00
  const dateOnly = dateStr.split(' ')[0].trim()
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  
  if (dateRegex.test(dateOnly)) {
    return dateOnly
  }
  
  // Essayer de parser avec Date
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }
  
  console.warn(`⚠️  Format de date invalide: ${dateStr}, ignoré`)
  return null
}

function parseInteger(intStr: string | undefined): number | null {
  if (!intStr || intStr.trim() === '') return null
  const parsed = parseInt(intStr, 10)
  return isNaN(parsed) ? null : parsed
}

function parseUUID(uuidStr: string | undefined): string | null {
  if (!uuidStr || uuidStr.trim() === '') return null
  // Validation basique d'UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const trimmed = uuidStr.trim()
  return uuidRegex.test(trimmed) ? trimmed : null
}

async function downloadCSV(url: string): Promise<string> {
  console.log(`📥 Téléchargement du CSV depuis: ${url}`)
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`)
    }
    
    const csvContent = await response.text()
    console.log(`✅ CSV téléchargé (${csvContent.length} caractères, ${csvContent.split('\n').length} lignes)`)
    return csvContent
  } catch (error) {
    console.error('❌ Erreur lors du téléchargement:', error)
    throw error
  }
}

async function importCSV(csvUrl: string) {
  // Télécharger le CSV
  const csvContent = await downloadCSV(csvUrl)
  
  // Parser le CSV
  console.log('📊 Parsing du CSV...')
  const records: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    quote: '"',
    escape: '"'
  })
  
  console.log(`✅ ${records.length} lignes trouvées dans le CSV\n`)
  
  const stats = {
    total: records.length,
    created: 0,
    updated: 0,
    errors: 0,
    errorsList: [] as string[]
  }
  
  // Traiter chaque ligne
  console.log('🔄 Traitement des modèles...\n')
  
  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    const rowNumber = i + 2 // +2 car on compte l'en-tête
    
    try {
      // Validation
      if (!row.model_name || row.model_name.trim() === '') {
        stats.errors++
        stats.errorsList.push(`Ligne ${rowNumber}: model_name est obligatoire`)
        continue
      }
      
      // Parser l'ID
      const modelId = parseUUID(row.id)
      if (!modelId) {
        stats.errors++
        stats.errorsList.push(`Ligne ${rowNumber}: ID invalide ou manquant (${row.id})`)
        continue
      }
      
      // Préparer les données
      const modelData: any = {
        model_name: row.model_name.trim(),
        model_provider: row.model_provider?.trim() || null,
        model_type: row.model_type?.trim() || null,
        version: row.version?.trim() || null,
        short_name: row.short_name?.trim() || null,
        long_name: row.long_name?.trim() || null,
        launch_date: parseDate(row.launch_date),
        model_provider_id: parseInteger(row.model_provider_id),
        notes_short: row.notes_short?.trim() || null,
        notes_long: row.notes_long?.trim() || null,
        variants: parseVariants(row.variants),
        updated_at: new Date().toISOString()
      }
      
      // Validation des contraintes
      if (modelData.notes_short && modelData.notes_short.length > 150) {
        const truncated = modelData.notes_short.substring(0, 150)
        stats.errors++
        stats.errorsList.push(`Ligne ${rowNumber}: notes_short tronqué de ${modelData.notes_short.length} à 150 caractères`)
        modelData.notes_short = truncated
      }
      
      if (modelData.notes_long && modelData.notes_long.length > 1000) {
        const truncated = modelData.notes_long.substring(0, 1000)
        stats.errors++
        stats.errorsList.push(`Ligne ${rowNumber}: notes_long tronqué de ${modelData.notes_long.length} à 1000 caractères`)
        modelData.notes_long = truncated
      }
      
      // Vérifier si le modèle existe par ID
      const { data: existingModel, error: fetchError } = await supabase
        .from('compl_ai_models')
        .select('id')
        .eq('id', modelId)
        .maybeSingle()
      
      if (fetchError) {
        stats.errors++
        stats.errorsList.push(`Ligne ${rowNumber}: Erreur recherche modèle - ${fetchError.message}`)
        continue
      }
      
      if (existingModel) {
        // Mise à jour par ID
        const { error } = await supabase
          .from('compl_ai_models')
          .update(modelData)
          .eq('id', modelId)
        
        if (error) {
          stats.errors++
          stats.errorsList.push(`Ligne ${rowNumber} (${modelData.model_name}, ID: ${modelId}): ${error.message}`)
          console.error(`❌ Erreur mise à jour ${modelData.model_name} (ID: ${modelId}):`, error.message)
        } else {
          stats.updated++
          console.log(`✅ Mis à jour: ${modelData.model_name} (ID: ${modelId})`)
        }
      } else {
        // Création avec l'ID du CSV
        const insertData = {
          ...modelData,
          id: modelId  // Utiliser l'ID du CSV
        }
        
        // Ne pas inclure created_at, laissé à la base
        delete insertData.created_at
        
        const { error } = await supabase
          .from('compl_ai_models')
          .insert(insertData)
        
        if (error) {
          stats.errors++
          stats.errorsList.push(`Ligne ${rowNumber} (${modelData.model_name}, ID: ${modelId}): ${error.message}`)
          console.error(`❌ Erreur création ${modelData.model_name} (ID: ${modelId}):`, error.message)
        } else {
          stats.created++
          console.log(`✨ Créé: ${modelData.model_name} (ID: ${modelId})`)
        }
      }
      
    } catch (error) {
      stats.errors++
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue'
      stats.errorsList.push(`Ligne ${rowNumber}: ${errorMsg}`)
      console.error(`❌ Erreur ligne ${rowNumber}:`, errorMsg)
    }
  }
  
  // Afficher les statistiques
  console.log('\n' + '='.repeat(60))
  console.log('📊 Statistiques d\'import:')
  console.log('='.repeat(60))
  console.log(`   Total lignes: ${stats.total}`)
  console.log(`   ✨ Créés: ${stats.created}`)
  console.log(`   ✅ Mis à jour: ${stats.updated}`)
  console.log(`   ❌ Erreurs: ${stats.errors}`)
  console.log('='.repeat(60))
  
  if (stats.errorsList.length > 0) {
    console.log('\n❌ Liste des erreurs:')
    stats.errorsList.forEach(err => console.log(`   - ${err}`))
  }
  
  return stats
}

// Exécution
const csvUrl = process.argv[2] || DEFAULT_CSV_URL

console.log('🚀 Import CSV pour compl_ai_models\n')
console.log(`📁 URL du CSV: ${csvUrl}\n`)

importCSV(csvUrl)
  .then((stats) => {
    if (stats.errors === 0) {
      console.log('\n✅ Import terminé avec succès!')
      process.exit(0)
    } else {
      console.log(`\n⚠️  Import terminé avec ${stats.errors} erreur(s)`)
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale lors de l\'import:', error)
    process.exit(1)
  })

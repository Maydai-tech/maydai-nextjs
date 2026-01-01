const { createClient } = require('@supabase/supabase-js')

// Configuration via variables d'environnement
// Usage: CLOUD_URL=... CLOUD_SERVICE_KEY=... OVH_URL=... OVH_SERVICE_KEY=... node migrate-all-tables.js
const CLOUD_URL = process.env.CLOUD_URL
const CLOUD_SERVICE_KEY = process.env.CLOUD_SERVICE_KEY
const OVH_URL = process.env.OVH_URL
const OVH_SERVICE_KEY = process.env.OVH_SERVICE_KEY

if (!CLOUD_URL || !CLOUD_SERVICE_KEY || !OVH_URL || !OVH_SERVICE_KEY) {
  console.error('Missing environment variables. Required: CLOUD_URL, CLOUD_SERVICE_KEY, OVH_URL, OVH_SERVICE_KEY')
  process.exit(1)
}

const cloudClient = createClient(CLOUD_URL, CLOUD_SERVICE_KEY)
const ovhClient = createClient(OVH_URL, OVH_SERVICE_KEY)

// Tables à migrer dans l'ordre (respect des FK)
const TABLES = [
  // Sans FK
  { name: 'model_providers', userIdFields: [] },
  { name: 'services', userIdFields: [] },
  { name: 'compl_ai_principles', userIdFields: [] },
  { name: 'compl_ai_sync_logs', userIdFields: [] },

  // Avec FK simples
  { name: 'compl_ai_benchmarks', userIdFields: [] },
  { name: 'compl_ai_models', userIdFields: [] },
  { name: 'compl_ai_evaluations', userIdFields: [] },

  // Avec FK vers profiles/users
  { name: 'user_companies', userIdFields: ['user_id', 'added_by'] },
  { name: 'user_profiles', userIdFields: ['inviter_user_id', 'invited_user_id', 'added_by'] },
  { name: 'user_usecases', userIdFields: ['user_id', 'added_by'] },
  { name: 'usecase_responses', userIdFields: [] },
  { name: 'usecase_nextsteps', userIdFields: [] },
  { name: 'usecase_history', userIdFields: ['user_id'] },
  { name: 'dossiers', userIdFields: [] },
  { name: 'dossier_documents', userIdFields: ['updated_by'] },
]

let userIdMapping = {}

async function buildUserIdMapping() {
  console.log('Construction du mapping user IDs...')
  const { data: cloudUsers } = await cloudClient.auth.admin.listUsers()
  const { data: ovhUsers } = await ovhClient.auth.admin.listUsers()

  for (const cu of cloudUsers.users) {
    const ou = ovhUsers.users.find(u => u.email === cu.email)
    if (ou) userIdMapping[cu.id] = ou.id
  }
  console.log(`Mapping créé pour ${Object.keys(userIdMapping).length} utilisateurs\n`)
}

async function migrateTable(tableDef) {
  const { name, userIdFields } = tableDef

  // Get data from Cloud
  const { data, error } = await cloudClient.from(name).select('*')
  if (error) {
    console.log(`✗ ${name}: erreur lecture - ${error.message}`)
    return
  }

  if (!data || data.length === 0) {
    console.log(`- ${name}: 0 lignes`)
    return
  }

  // Transform user IDs if needed
  const transformedData = data.map(row => {
    const newRow = { ...row }
    for (const field of userIdFields) {
      if (newRow[field] && userIdMapping[newRow[field]]) {
        newRow[field] = userIdMapping[newRow[field]]
      }
    }
    return newRow
  })

  // Insert into OVH (batch of 100)
  let inserted = 0
  const batchSize = 100

  for (let i = 0; i < transformedData.length; i += batchSize) {
    const batch = transformedData.slice(i, i + batchSize)
    const { error: insertError } = await ovhClient.from(name).upsert(batch, { onConflict: 'id' })
    if (insertError) {
      console.log(`✗ ${name}: erreur insert - ${insertError.message}`)
    } else {
      inserted += batch.length
    }
  }

  console.log(`✓ ${name}: ${inserted}/${data.length}`)
}

async function main() {
  console.log('=== Migration complète Supabase Cloud → OVH ===\n')

  await buildUserIdMapping()

  for (const table of TABLES) {
    await migrateTable(table)
  }

  console.log('\n=== Migration terminée ===')
}

main().catch(console.error)

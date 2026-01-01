const { createClient } = require('@supabase/supabase-js')

// Configuration via variables d'environnement
// Usage: CLOUD_URL=... CLOUD_SERVICE_KEY=... OVH_URL=... OVH_SERVICE_KEY=... node migrate-data.js
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

// Tables à migrer (dans l'ordre pour respecter les foreign keys)
const TABLES = [
  'plans',
  'companies',
  'profiles',
  'usecases',
]

async function getTableData(client, table) {
  const { data, error } = await client
    .from(table)
    .select('*')

  if (error) {
    console.error(`Erreur lecture ${table}:`, error.message)
    return []
  }
  return data || []
}

async function insertData(client, table, rows) {
  if (rows.length === 0) {
    console.log(`  ${table}: 0 lignes (vide)`)
    return
  }

  // Insert par batch de 100
  const batchSize = 100
  let inserted = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { data, error } = await client
      .from(table)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })

    if (error) {
      console.error(`  Erreur insert ${table}:`, JSON.stringify(error, null, 2))
    } else {
      inserted += batch.length
    }
  }

  console.log(`  ${table}: ${inserted}/${rows.length} lignes migrées`)
}

async function migrate() {
  console.log('=== Migration Supabase Cloud → OVH ===\n')

  // Test connexions
  console.log('Test connexion Cloud...')
  const { data: cloudTest, error: cloudErr } = await cloudClient.from('profiles').select('id').limit(1)
  if (cloudErr) {
    console.error('Erreur connexion Cloud:', cloudErr.message)
    return
  }
  console.log('✓ Cloud OK\n')

  console.log('Test connexion OVH...')
  const { data: ovhTest, error: ovhErr } = await ovhClient.from('profiles').select('id').limit(1)
  if (ovhErr && !ovhErr.message.includes('does not exist')) {
    console.error('Erreur connexion OVH:', ovhErr.message)
    return
  }
  console.log('✓ OVH OK\n')

  // Migration table par table
  console.log('Migration des données...\n')

  for (const table of TABLES) {
    console.log(`Table: ${table}`)
    const data = await getTableData(cloudClient, table)
    await insertData(ovhClient, table, data)
  }

  console.log('\n=== Migration terminée ===')
}

migrate().catch(console.error)

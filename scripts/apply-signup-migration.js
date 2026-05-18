/**
 * Script to apply signup fields migration to profiles table
 * Run with: node scripts/apply-signup-migration.js
 */

const https = require('https');

// Read environment variables from .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const SUPABASE_REST_URL = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

const migration = `
-- Add new columns to profiles table for signup information
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS siren VARCHAR(9);

-- Add comments
COMMENT ON COLUMN profiles.company_name IS 'Nom de l''entreprise de l''utilisateur';
COMMENT ON COLUMN profiles.industry IS 'Secteur d''activité NAF/APE';
COMMENT ON COLUMN profiles.phone IS 'Numéro de téléphone (optionnel)';
COMMENT ON COLUMN profiles.siren IS 'Numéro SIREN à 9 chiffres (optionnel, validé par Luhn)';

-- Add constraints
ALTER TABLE profiles
ADD CONSTRAINT check_siren_format
CHECK (siren IS NULL OR siren ~ '^[0-9]{9}$');

ALTER TABLE profiles
ADD CONSTRAINT check_phone_min_length
CHECK (phone IS NULL OR length(phone) >= 10);

-- Index for SIREN lookups
CREATE INDEX IF NOT EXISTS idx_profiles_siren
ON profiles(siren)
WHERE siren IS NOT NULL;
`.trim();

console.log('🔄 Applying signup migration to Supabase...\n');
console.log('Migration SQL:');
console.log('─'.repeat(60));
console.log(migration);
console.log('─'.repeat(60));
console.log('');

const data = JSON.stringify({ query: migration });

const options = {
  hostname: `${SUPABASE_REST_URL}.supabase.co`,
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Migration applied successfully!');
      console.log('');
      console.log('Added columns to profiles table:');
      console.log('  - company_name (VARCHAR 255)');
      console.log('  - industry (VARCHAR 100)');
      console.log('  - phone (VARCHAR 20)');
      console.log('  - siren (VARCHAR 9)');
      console.log('');
      console.log('Added constraints:');
      console.log('  - check_siren_format (9 digits)');
      console.log('  - check_phone_min_length (min 10 chars)');
      console.log('');
      console.log('Added index:');
      console.log('  - idx_profiles_siren');
      console.log('');
      console.log('🎉 Ready to test signup flow!');
    } else {
      console.error(`❌ Migration failed with status ${res.statusCode}`);
      console.error('Response:', responseData);

      // Try alternative approach using direct SQL execution
      console.log('\n⚠️  Trying alternative method...');
      executeMigrationDirectly();
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error executing migration:', error.message);
  console.log('\n⚠️  Trying alternative method...');
  executeMigrationDirectly();
});

req.write(data);
req.end();

// Alternative method: Execute SQL statements one by one
function executeMigrationDirectly() {
  console.log('\n📝 Please run this SQL manually in Supabase Dashboard:');
  console.log('   Dashboard → SQL Editor → New Query\n');
  console.log('─'.repeat(60));
  console.log(migration);
  console.log('─'.repeat(60));
  console.log('\n💡 Or go to: https://supabase.com/dashboard/project/' + SUPABASE_REST_URL + '/editor');
}

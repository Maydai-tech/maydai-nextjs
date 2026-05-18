#!/usr/bin/env node

/**
 * Script de test pour valider la configuration de production
 * Usage: node scripts/test-production-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Test de la configuration de production...\n');

// Vérifier si .env.local existe
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Fichier .env.local non trouvé');
  console.log('💡 Crée le fichier .env.local avec tes variables de production');
  console.log('💡 Voir docs/PRODUCTION_CONFIG.md pour la configuration');
  process.exit(1);
}

// Lire le fichier .env.local
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

// Parser les variables d'environnement
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

console.log('📋 Variables d\'environnement trouvées :\n');

// Vérifier les variables Stripe
console.log('🔑 STRIPE :');
const stripeVars = {
  'STRIPE_SECRET_KEY': envVars.STRIPE_SECRET_KEY,
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': envVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  'STRIPE_WEBHOOK_SECRET': envVars.STRIPE_WEBHOOK_SECRET
};

Object.entries(stripeVars).forEach(([key, value]) => {
  if (!value) {
    console.log(`  ❌ ${key}: Non définie`);
  } else if (key === 'STRIPE_SECRET_KEY' && !value.startsWith('sk_live_')) {
    console.log(`  ⚠️  ${key}: Ne commence pas par 'sk_live_' (mode test ?)`);
  } else if (key === 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY' && !value.startsWith('pk_live_')) {
    console.log(`  ⚠️  ${key}: Ne commence pas par 'pk_live_' (mode test ?)`);
  } else if (key === 'STRIPE_WEBHOOK_SECRET' && !value.startsWith('whsec_')) {
    console.log(`  ⚠️  ${key}: Ne commence pas par 'whsec_'`);
  } else {
    console.log(`  ✅ ${key}: Configurée`);
  }
});

// Vérifier les variables Supabase
console.log('\n🗄️  SUPABASE :');
const supabaseVars = {
  'NEXT_PUBLIC_SUPABASE_URL': envVars.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': envVars.SUPABASE_SERVICE_ROLE_KEY
};

Object.entries(supabaseVars).forEach(([key, value]) => {
  if (!value) {
    console.log(`  ❌ ${key}: Non définie`);
  } else if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !value.includes('supabase.co')) {
    console.log(`  ⚠️  ${key}: Ne semble pas être une URL Supabase valide`);
  } else {
    console.log(`  ✅ ${key}: Configurée`);
  }
});

// Vérifier les variables Application
console.log('\n🌐 APPLICATION :');
const appVars = {
  'NEXT_PUBLIC_APP_URL': envVars.NEXT_PUBLIC_APP_URL,
  'NODE_ENV': envVars.NODE_ENV
};

Object.entries(appVars).forEach(([key, value]) => {
  if (!value) {
    console.log(`  ❌ ${key}: Non définie`);
  } else if (key === 'NEXT_PUBLIC_APP_URL' && !value.startsWith('https://')) {
    console.log(`  ⚠️  ${key}: Ne commence pas par 'https://' (sécurité)`);
  } else if (key === 'NODE_ENV' && value !== 'production') {
    console.log(`  ⚠️  ${key}: N'est pas défini sur 'production'`);
  } else {
    console.log(`  ✅ ${key}: Configurée`);
  }
});

// Résumé
const allVars = {...stripeVars, ...supabaseVars, ...appVars};
const configuredVars = Object.values(allVars).filter(v => v).length;
const totalVars = Object.keys(allVars).length;

console.log(`\n📊 Résumé : ${configuredVars}/${totalVars} variables configurées`);

if (configuredVars === totalVars) {
  console.log('✅ Configuration complète !');
  console.log('💡 Tu peux maintenant tester avec : npm run dev');
} else {
  console.log('❌ Configuration incomplète');
  console.log('💡 Voir docs/PRODUCTION_CONFIG.md pour la configuration');
  process.exit(1);
}

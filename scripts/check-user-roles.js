#!/usr/bin/env node

/**
 * Script pour vérifier les rôles des utilisateurs
 * Usage: node scripts/check-user-roles.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définies');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserRoles() {
  console.log('🔍 Vérification des rôles utilisateurs...\n');

  try {
    // 1. Vérifier que la colonne role existe
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'profiles' });

    if (columnsError) {
      // Si la fonction RPC n'existe pas, essayons une requête directe
      const { data: profilesTest, error: testError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (testError && testError.message.includes('role')) {
        console.error('❌ La colonne "role" n\'existe pas encore dans la table profiles');
        console.log('💡 Exécutez d\'abord la migration : supabase/migrations/20250706_add_role_to_profiles.sql');
        return;
      }
    }

    // 2. Récupérer tous les utilisateurs avec leurs rôles
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        created_at,
        company_id
      `)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Erreur lors de la récupération des profils:', usersError.message);
      return;
    }

    // 3. Récupérer les emails depuis auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Erreur lors de la récupération des utilisateurs auth:', authError.message);
      return;
    }

    // Créer une map email par ID
    const emailMap = {};
    authUsers.users.forEach(user => {
      emailMap[user.id] = user.email;
    });

    // 4. Afficher le rapport
    console.log('📊 Rapport des rôles utilisateurs:');
    console.log('================================\n');

    const roleGroups = {
      'super_admin': [],
      'admin': [],
      'user': [],
      'undefined': []
    };

    users.forEach(profile => {
      const email = emailMap[profile.id] || 'Email non trouvé';
      const role = profile.role || 'undefined';
      
      roleGroups[role] = roleGroups[role] || [];
      roleGroups[role].push({
        email,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Sans nom',
        id: profile.id,
        created: new Date(profile.created_at).toLocaleDateString('fr-FR')
      });
    });

    // Afficher par groupe de rôle
    Object.entries(roleGroups).forEach(([role, users]) => {
      if (users.length > 0) {
        console.log(`\n🔹 ${role.toUpperCase()} (${users.length}):`);
        users.forEach(user => {
          console.log(`   - ${user.email} (${user.name}) - Créé le ${user.created}`);
        });
      }
    });

    // 5. Statistiques
    console.log('\n\n📈 Statistiques:');
    console.log('================');
    console.log(`Total utilisateurs: ${users.length}`);
    console.log(`Super Admins: ${roleGroups['super_admin'].length}`);
    console.log(`Admins: ${roleGroups['admin'].length}`);
    console.log(`Users: ${roleGroups['user'].length}`);
    console.log(`Sans rôle défini: ${roleGroups['undefined'].length}`);

    // 6. Vérifications de cohérence
    console.log('\n\n⚠️  Vérifications:');
    console.log('==================');
    
    if (roleGroups['undefined'].length > 0) {
      console.log('❌ Des utilisateurs n\'ont pas de rôle défini!');
    } else {
      console.log('✅ Tous les utilisateurs ont un rôle');
    }

    if (roleGroups['admin'].length === 0 && roleGroups['super_admin'].length === 0) {
      console.log('⚠️  Aucun administrateur défini!');
    } else {
      console.log('✅ Au moins un administrateur existe');
    }

    // Vérifier les emails attendus
    const expectedAdmins = ['hugo.faye@gmail.com', 'tech@maydai.io'];
    const actualAdmins = [...roleGroups['admin'], ...roleGroups['super_admin']].map(u => u.email);
    
    expectedAdmins.forEach(email => {
      if (!actualAdmins.includes(email)) {
        console.log(`⚠️  ${email} devrait être admin mais ne l'est pas`);
      }
    });

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

// Exécuter le script
checkUserRoles()
  .then(() => {
    console.log('\n✅ Vérification terminée');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
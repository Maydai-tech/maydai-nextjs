#!/usr/bin/env npx tsx

/**
 * Script de test pour l'extraction des prochaines étapes
 * 
 * Ce script teste le parsing des réponses OpenAI pour extraire les prochaines étapes
 * et les insérer dans la table usecase_nextsteps de Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { parseNextSteps, extractNextSteps } from '../lib/nextsteps-parser';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement depuis .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

loadEnvFile();

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Variable NEXT_PUBLIC_SUPABASE_URL manquante');
  process.exit(1);
}

// Mode test sans insertion si pas de service role key
const testModeOnly = !supabaseKey;
if (testModeOnly) {
  console.log('⚠️  Mode test uniquement (pas de SUPABASE_SERVICE_ROLE_KEY)');
}

const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Données de test - exemples de réponses OpenAI
const testResponses = [
  {
    usecase_id: 'test-1',
    response_text: `
Voici votre plan d'action pour améliorer votre conformité RGPD :

## Prochaines étapes recommandées :

1. **Audit de données** (Priorité : Haute)
   - Identifier tous les types de données personnelles collectées
   - Cartographier les flux de données dans l'organisation
   - Échéance : 2 semaines

2. **Mise en place des registres** (Priorité : Haute)
   - Créer le registre des traitements
   - Documenter les finalités et bases légales
   - Échéance : 1 mois

3. **Formation des équipes** (Priorité : Moyenne)
   - Organiser des sessions de sensibilisation RGPD
   - Former les responsables de traitement
   - Échéance : 6 semaines

4. **Révision des contrats** (Priorité : Moyenne)
   - Analyser les contrats avec les sous-traitants
   - Mettre à jour les clauses de protection des données
   - Échéance : 2 mois

5. **Tests de sécurité** (Priorité : Haute)
   - Réaliser des tests de pénétration
   - Vérifier la sécurité des systèmes
   - Échéance : 3 semaines
    `,
  },
  {
    usecase_id: 'test-2',
    response_text: `
Plan d'action pour la conformité à l'AI Act :

## Actions prioritaires :

1. **Classification du système** (Urgent)
   - Déterminer si votre IA est à haut risque
   - Analyser les critères d'évaluation
   - Délai : 1 semaine

2. **Évaluation de conformité** (Critique)
   - Réaliser l'évaluation d'impact
   - Documenter les mesures de conformité
   - Délai : 2 mois

3. **Transparence utilisateur** (Important)
   - Informer clairement sur l'utilisation de l'IA
   - Mettre à jour les mentions légales
   - Délai : 3 semaines

4. **Qualité des données** (Important)
   - Auditer la qualité des données d'entraînement
   - Documenter les processus de validation
   - Délai : 1 mois
    `,
  },
  {
    usecase_id: 'test-3',
    response_text: `
Voici les étapes pour améliorer votre score de conformité :

1. Mise à jour de la politique de confidentialité
2. Implémentation du consentement cookies
3. Audit des données personnelles
4. Formation des équipes
    `,
  },
];

async function testNextStepsExtraction() {
  console.log('🚀 Démarrage des tests d\'extraction des prochaines étapes...\n');

  try {
    // Nettoyer les données de test précédentes (si pas en mode test)
    if (!testModeOnly && supabase) {
      console.log('🧹 Nettoyage des données de test précédentes...');
      await supabase
        .from('usecase_nextsteps')
        .delete()
        .like('usecase_id', 'test-%');
      console.log('✅ Nettoyage terminé\n');
    } else {
      console.log('🧪 Mode test - pas de nettoyage en base\n');
    }

    // Tester chaque réponse
    for (let i = 0; i < testResponses.length; i++) {
      const testCase = testResponses[i];
      console.log(`📋 Test ${i + 1}/${testResponses.length} - usecase_id: ${testCase.usecase_id}`);
      
      try {
        // Parser la réponse
        const parsedSteps = parseNextSteps(testCase.response_text);
        
        console.log(`   📊 Étapes extraites : ${parsedSteps.length}`);
        
        // Afficher les détails de chaque étape
        parsedSteps.forEach((step, index) => {
          console.log(`   ${index + 1}. ${step.title}`);
          console.log(`      Priorité: ${step.priority}`);
          console.log(`      Échéance: ${step.deadline || 'Non spécifiée'}`);
          console.log(`      Description: ${step.description.substring(0, 100)}...`);
        });

        // Insérer dans Supabase (si pas en mode test)
        if (!testModeOnly && supabase) {
          const insertData = parsedSteps.map(step => ({
            usecase_id: testCase.usecase_id,
            title: step.title,
            description: step.description,
            priority: step.priority,
            deadline: step.deadline,
            status: 'pending'
          }));

          const { data, error } = await supabase
            .from('usecase_nextsteps')
            .insert(insertData);

          if (error) {
            console.error(`   ❌ Erreur insertion : ${error.message}`);
            // Si erreur de permissions, afficher les données qui seraient insérées
            console.log(`   📋 Données qui seraient insérées :`);
            insertData.forEach((step, index) => {
              console.log(`     ${index + 1}. ${step.title} (${step.priority})`);
            });
          } else {
            console.log(`   ✅ ${insertData.length} étapes insérées avec succès`);
          }
        } else {
          console.log(`   🧪 Mode test - ${parsedSteps.length} étapes seraient insérées`);
        }

      } catch (error) {
        console.error(`   ❌ Erreur lors du parsing : ${error}`);
      }
      
      console.log(''); // Ligne vide pour la lisibilité
    }

    // Vérifier les données insérées (si pas en mode test)
    if (!testModeOnly && supabase) {
      console.log('🔍 Vérification des données insérées...');
      const { data: insertedData, error: selectError } = await supabase
        .from('usecase_nextsteps')
        .select('*')
        .like('usecase_id', 'test-%')
        .order('usecase_id', { ascending: true });

      if (selectError) {
        console.error(`❌ Erreur lors de la vérification : ${selectError.message}`);
      } else {
        console.log(`✅ Total des étapes insérées : ${insertedData.length}`);
        
        // Grouper par usecase_id
        const groupedData = insertedData.reduce((acc, item) => {
          if (!acc[item.usecase_id]) {
            acc[item.usecase_id] = [];
          }
          acc[item.usecase_id].push(item);
          return acc;
        }, {} as Record<string, any[]>);

        Object.entries(groupedData).forEach(([usecaseId, steps]) => {
          console.log(`   📋 ${usecaseId}: ${(steps as any[]).length} étapes`);
        });
      }
    } else {
      console.log('🧪 Mode test - pas de vérification en base');
    }

    console.log('\n🎉 Tests terminés avec succès !');
    console.log('\n📝 Pour vérifier dans Supabase, exécutez :');
    console.log('SELECT * FROM usecase_nextsteps WHERE usecase_id LIKE \'test-%\' ORDER BY usecase_id, created_at;');

  } catch (error) {
    console.error('❌ Erreur générale :', error);
    process.exit(1);
  }
}

// Test de la fonction extractNextSteps
async function testExtractFunction() {
  console.log('\n🧪 Test de la fonction extractNextSteps...');
  
  const testText = `
  Voici vos prochaines étapes :
  
  1. **Audit des données** (Priorité : Haute)
     - Identifier les données personnelles
     - Échéance : 2 semaines
  
  2. **Formation équipes** (Priorité : Moyenne)
     - Sensibiliser au RGPD
     - Échéance : 1 mois
  `;
  
  try {
    const extracted = extractNextSteps(testText);
    console.log(`✅ Fonction extractNextSteps fonctionne : ${extracted.length} étapes extraites`);
    extracted.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.title} (${step.priority})`);
    });
  } catch (error) {
    console.error(`❌ Erreur extractNextSteps : ${error}`);
  }
}

// Exécution des tests
async function main() {
  await testExtractFunction();
  await testNextStepsExtraction();
}

if (require.main === module) {
  main().catch(console.error);
}

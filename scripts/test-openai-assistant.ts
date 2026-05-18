#!/usr/bin/env npx tsx

/**
 * Script pour tester l'assistant OpenAI avec les données récupérées
 */

import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAIAssistant() {
  console.log('🤖 Test de l\'assistant OpenAI avec les données du cas d\'usage');
  console.log('=' .repeat(60));

  try {
    // 1. Charger les données d'entrée
    console.log('\n📄 1. Chargement des données d\'entrée...');
    const inputData = JSON.parse(fs.readFileSync('openai_input_data.json', 'utf8'));
    console.log('✅ Données chargées');

    // 2. Créer le prompt pour l'assistant
    console.log('\n📝 2. Création du prompt...');
    
    const prompt = `
**ANALYSE DE CONFORMITÉ IA ACT - SECTION 3**

**Informations de l'entreprise :**
- Nom de l'entreprise : ${inputData.usecase_context_fields.entreprise.name}
- Secteur d'activité : ${inputData.usecase_context_fields.entreprise.industry}
- Localisation : ${inputData.usecase_context_fields.entreprise.city}, ${inputData.usecase_context_fields.entreprise.country}

**Informations du système d'IA :**
- Nom du système : ${inputData.usecase_context_fields.cas_usage.name}
- ID : ${inputData.usecase_context_fields.cas_usage.id}
- Description : ${inputData.usecase_context_fields.cas_usage.description}
- Date de déploiement : ${inputData.usecase_context_fields.cas_usage.deployment_date}
- Niveau de risque : ${inputData.usecase_context_fields.cas_usage.risk_level}
- Catégorie IA : ${inputData.usecase_context_fields.cas_usage.ai_category}

**Technologie utilisée :**
- Modèle : ${inputData.usecase_context_fields.technologie.model_name}
- Fournisseur : ${inputData.usecase_context_fields.technologie.model_provider}
- Type : ${inputData.usecase_context_fields.technologie.model_type}

**IMPORTANT :** 
- L'entreprise s'appelle "${inputData.usecase_context_fields.entreprise.name}"
- Le système d'IA s'appelle "${inputData.usecase_context_fields.cas_usage.name}"
- Dans ton analyse, utilise toujours "${inputData.usecase_context_fields.entreprise.name}" comme nom de l'entreprise

**DONNÉES DU QUESTIONNAIRE :**
${JSON.stringify(inputData.questionnaire_questions, null, 2)}

**INSTRUCTIONS DE FORMATAGE OBLIGATOIRES :**

Tu dois suivre EXACTEMENT cette structure Markdown, sans modification :

1. **Titre principal** : "# Recommandations et plan d'action"

2. **Introduction contextuelle** : "## Introduction contextuelle"
   - Texte narratif décrivant le contexte de l'entreprise et du système IA

3. **Évaluation du niveau de risque AI Act** : "## Évaluation du niveau de risque AI Act"
   - Texte narratif évaluant le niveau de risque spécifique

4. **Il est impératif de mettre en œuvre les mesures suivantes :** : "## Il est impératif de mettre en œuvre les mesures suivantes :"
   - **Les 3 priorités d'actions réglementaires** : "### Les 3 priorités d'actions réglementaires"
   - **Phrase 1.** Suite du texte.
   - **Phrase 2.** Suite du texte.
   - **Phrase 3.** Suite du texte.

5. **Trois actions concrètes à mettre en œuvre rapidement :** : "## Trois actions concrètes à mettre en œuvre rapidement :"
   - **Quick wins & actions immédiates recommandées** : "### Quick wins & actions immédiates recommandées"
   - **Phrase 1.** Suite du texte.
   - **Phrase 2.** Suite du texte.
   - **Phrase 3.** Suite du texte.

6. **Impact attendu** : "## Impact attendu"
   - [Texte narratif]

7. **Trois actions structurantes à mener dans les 3 à 6 mois :** : "## Trois actions structurantes à mener dans les 3 à 6 mois :"
   - **Actions à moyen terme** : "### Actions à moyen terme"
   - **Sous-titre 1 :** [Texte narratif]
   - **Sous-titre 2 :** [Texte narratif]
   - **Sous-titre 3 :** [Texte narratif]

8. **Conclusion** : "## Conclusion"
   - [Texte narratif]

**RÈGLES STRICTES :**
- Utilise EXACTEMENT la syntaxe Markdown fournie
- Respecte EXACTEMENT cette structure
- Ne modifie pas les titres ou sous-titres
- Utilise des phrases complètes et professionnelles
- Adapte le contenu selon l'entreprise et le système IA analysé
- Utilise **texte en gras** pour les phrases d'action importantes
- Utilise # pour les titres principaux, ## pour les sections, ### pour les sous-sections

Sois précis, professionnel et actionnable dans tes recommandations.
**RAPPEL :** Utilise "${inputData.usecase_context_fields.entreprise.name}" comme nom de l'entreprise et "${inputData.usecase_context_fields.cas_usage.name}" comme nom du système d'IA.
    `.trim();

    console.log('✅ Prompt créé');

    // 3. Appeler l'assistant OpenAI
    console.log('\n🤖 3. Appel de l\'assistant OpenAI...');
    console.log('⏳ Génération du rapport en cours...');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en conformité réglementaire IA Act. Tu génères des rapports d'analyse de conformité structurés et actionnables."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('Aucune réponse de l\'assistant OpenAI');
    }

    console.log('✅ Rapport généré');

    // 4. Sauvegarder la réponse
    console.log('\n💾 4. Sauvegarde de la réponse...');
    fs.writeFileSync('openai_test_response.md', response);
    console.log('✅ Réponse sauvegardée dans openai_test_response.md');

    // 5. Analyser le format de la réponse
    console.log('\n🔍 5. Analyse du format de la réponse...');
    
    const isMarkdown = response.includes('## Introduction contextuelle') && 
                      response.includes('### Les 3 priorités d\'actions réglementaires');
    
    const isJSON = response.trim().startsWith('{') && response.trim().endsWith('}');
    
    console.log('📊 Format détecté:');
    console.log('   - Markdown:', isMarkdown ? '✅' : '❌');
    console.log('   - JSON:', isJSON ? '✅' : '❌');
    
    if (isMarkdown) {
      console.log('✅ L\'assistant génère bien du Markdown comme attendu');
    } else if (isJSON) {
      console.log('⚠️ L\'assistant génère du JSON au lieu de Markdown');
    } else {
      console.log('❓ Format inconnu détecté');
    }

    // 6. Afficher un aperçu de la réponse
    console.log('\n📋 6. Aperçu de la réponse:');
    const preview = response.substring(0, 500);
    console.log(preview + '...');

    console.log('\n🎯 Test terminé !');
    console.log('📁 Consultez le fichier openai_test_response.md pour voir la réponse complète.');

  } catch (error) {
    console.error('❌ Erreur lors du test de l\'assistant OpenAI:', error);
  }
}

// Exécution du script
if (require.main === module) {
  testOpenAIAssistant().catch(console.error);
}

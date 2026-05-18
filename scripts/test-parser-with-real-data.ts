#!/usr/bin/env npx tsx

/**
 * Script pour tester le parser avec les vraies données générées par OpenAI
 */

import { extractNextStepsFromMarkdown, validateNextStepsData, logExtractionResults } from '../lib/nextsteps-parser';
import * as fs from 'fs';

async function testParserWithRealData() {
  console.log('🔍 Test du parser avec les vraies données OpenAI');
  console.log('=' .repeat(60));

  try {
    // 1. Charger la réponse OpenAI
    console.log('\n📄 1. Chargement de la réponse OpenAI...');
    const response = fs.readFileSync('openai_test_response.md', 'utf8');
    console.log('✅ Réponse chargée, longueur:', response.length, 'caractères');

    // 2. Tester l'extraction
    console.log('\n🔍 2. Test de l\'extraction...');
    const extractedData = extractNextStepsFromMarkdown(response);
    
    console.log('📊 Données extraites:');
    console.log('   - Introduction:', extractedData.introduction ? '✅' : '❌');
    console.log('   - Évaluation:', extractedData.evaluation ? '✅' : '❌');
    console.log('   - Impact:', extractedData.impact ? '✅' : '❌');
    console.log('   - Conclusion:', extractedData.conclusion ? '✅' : '❌');
    console.log('   - Priorité 1:', extractedData.priorite_1 ? '✅' : '❌');
    console.log('   - Priorité 2:', extractedData.priorite_2 ? '✅' : '❌');
    console.log('   - Priorité 3:', extractedData.priorite_3 ? '✅' : '❌');
    console.log('   - Quick Win 1:', extractedData.quick_win_1 ? '✅' : '❌');
    console.log('   - Quick Win 2:', extractedData.quick_win_2 ? '✅' : '❌');
    console.log('   - Quick Win 3:', extractedData.quick_win_3 ? '✅' : '❌');
    console.log('   - Action 1:', extractedData.action_1 ? '✅' : '❌');
    console.log('   - Action 2:', extractedData.action_2 ? '✅' : '❌');
    console.log('   - Action 3:', extractedData.action_3 ? '✅' : '❌');

    // 3. Validation
    console.log('\n🔍 3. Validation des données...');
    const nextStepsData = {
      ...extractedData,
      usecase_id: '5d996313-8484-4b15-a571-4210fcb1235f',
      model_version: 'gpt-4o',
      processing_time_ms: 0
    };

    const validation = validateNextStepsData(nextStepsData);
    console.log('   - Valide:', validation.isValid ? '✅' : '❌');
    console.log('   - Champs manquants:', validation.missingFields.length);
    console.log('   - Avertissements:', validation.warnings.length);

    if (validation.warnings.length > 0) {
      console.log('   - Détails des avertissements:');
      validation.warnings.forEach(warning => {
        console.log(`     • ${warning}`);
      });
    }

    // 4. Log détaillé
    console.log('\n🔍 4. Log détaillé de l\'extraction...');
    logExtractionResults(response, nextStepsData, validation);

    // 5. Sauvegarder les données extraites
    console.log('\n💾 5. Sauvegarde des données extraites...');
    fs.writeFileSync('extracted_nextsteps_data.json', JSON.stringify(nextStepsData, null, 2));
    console.log('✅ Données extraites sauvegardées dans extracted_nextsteps_data.json');

    // 6. Afficher le contenu extrait
    console.log('\n📋 6. Contenu extrait:');
    if (extractedData.introduction) {
      console.log('\n📝 Introduction:');
      console.log(extractedData.introduction.substring(0, 200) + '...');
    }
    
    if (extractedData.priorite_1) {
      console.log('\n🎯 Priorités:');
      console.log('1.', extractedData.priorite_1);
      console.log('2.', extractedData.priorite_2);
      console.log('3.', extractedData.priorite_3);
    }

    console.log('\n🎯 Test du parser terminé !');

  } catch (error) {
    console.error('❌ Erreur lors du test du parser:', error);
  }
}

// Exécution du script
if (require.main === module) {
  testParserWithRealData().catch(console.error);
}

#!/usr/bin/env npx tsx

/**
 * Script de test simple pour vérifier l'extraction des prochaines étapes
 * 
 * Ce script teste uniquement l'extraction depuis un rapport exemple
 * et vérifie que les données sont bien structurées.
 */

import { extractNextStepsFromMarkdown, validateNextStepsData, logExtractionResults } from '../lib/nextsteps-parser';

// Exemple de rapport OpenAI structuré
const testReport = `
# Analyse de Conformité IA Act - Système de Recommandation

## Introduction contextuelle

Votre système de recommandation basé sur l'IA présente des caractéristiques qui nécessitent une attention particulière au regard de l'AI Act. Ce système traite des données personnelles pour fournir des suggestions personnalisées aux utilisateurs, ce qui le place dans une catégorie nécessitant une évaluation approfondie de la conformité.

## Évaluation du niveau de risque AI Act

Après analyse des critères définis dans l'Annexe III de l'AI Act, votre système présente un **risque limité** avec des obligations de transparence. Le système ne tombe pas dans les catégories d'IA à haut risque mais nécessite une information claire des utilisateurs sur l'utilisation de l'IA.

## Impact attendu

La mise en conformité de ce système permettra de :
- Renforcer la confiance des utilisateurs
- Assurer la transparence des processus décisionnels
- Respecter les obligations réglementaires européennes
- Éviter les sanctions financières potentielles

### Les 3 priorités d'actions réglementaires

**1. Mise en place de la transparence utilisateur.** Il est essentiel d'informer clairement les utilisateurs qu'ils interagissent avec un système d'IA et d'expliquer le fonctionnement des recommandations.

**2. Documentation des processus de décision.** Documenter les algorithmes utilisés, les données traitées et les critères de recommandation pour assurer la traçabilité.

**3. Mise en place de contrôles humains.** Établir des mécanismes permettant aux utilisateurs de contester ou de corriger les recommandations générées par l'IA.

### Quick wins & actions immédiates recommandées

**1. Ajout de mentions légales spécifiques à l'IA.** Mettre à jour les conditions d'utilisation et la politique de confidentialité pour mentionner explicitement l'utilisation de l'IA.

**2. Implémentation d'un système de feedback utilisateur.** Permettre aux utilisateurs de noter la pertinence des recommandations et de signaler des problèmes.

**3. Audit des données d'entraînement.** Vérifier la qualité et la diversité des données utilisées pour entraîner le système de recommandation.

### Actions à moyen terme

**1. Développement d'un tableau de bord de conformité :** Créer un outil de monitoring pour suivre les performances du système et détecter les biais potentiels.

**2. Mise en place d'un comité d'éthique IA :** Constituer une équipe pluridisciplinaire pour superviser les aspects éthiques et réglementaires du système.

**3. Tests de robustesse réguliers :** Implémenter des procédures de test périodiques pour vérifier la fiabilité et la sécurité du système.

## Conclusion

Votre système de recommandation présente un bon potentiel de conformité avec des actions ciblées. Les priorités identifiées permettront de respecter les obligations de l'AI Act tout en maintenant la performance du système. Il est recommandé de commencer par les actions immédiates pour établir une base solide de conformité.
`;

async function testExtraction() {
  console.log('🚀 Test d\'extraction des prochaines étapes structurées...\n');

  try {
    // Extraire les sections structurées
    console.log('📄 Extraction des sections depuis le rapport...');
    const extractedData = extractNextStepsFromMarkdown(testReport);
    
    console.log(`✅ Extraction terminée - ${Object.keys(extractedData).length} champs extraits`);
    
    // Ajouter l'usecase_id pour la validation
    const nextStepsData = {
      ...extractedData,
      usecase_id: 'test-extraction-1',
      model_version: 'openai-gpt-4',
      processing_time_ms: 1500
    };

    // Valider les données extraites
    console.log('\n🔍 Validation des données extraites...');
    const validation = validateNextStepsData(nextStepsData);
    
    // Afficher les résultats de validation
    console.log(`✅ Validation: ${validation.isValid ? 'OK' : 'ERREUR'}`);
    
    if (validation.missingFields.length > 0) {
      console.log(`❌ Champs manquants: ${validation.missingFields.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      console.log(`⚠️ Avertissements: ${validation.warnings.join(', ')}`);
    }

    // Log détaillé des résultats
    console.log('\n📊 Résultats détaillés:');
    logExtractionResults(testReport, nextStepsData, validation);

    // Afficher les données extraites
    console.log('\n📋 Données extraites:');
    console.log('Introduction:', nextStepsData.introduction ? '✓' : '✗');
    console.log('Évaluation:', nextStepsData.evaluation ? '✓' : '✗');
    console.log('Impact:', nextStepsData.impact ? '✓' : '✗');
    console.log('Conclusion:', nextStepsData.conclusion ? '✓' : '✗');
    console.log('Priorité 1:', nextStepsData.priorite_1 ? '✓' : '✗');
    console.log('Priorité 2:', nextStepsData.priorite_2 ? '✓' : '✗');
    console.log('Priorité 3:', nextStepsData.priorite_3 ? '✓' : '✗');
    console.log('Quick Win 1:', nextStepsData.quick_win_1 ? '✓' : '✗');
    console.log('Quick Win 2:', nextStepsData.quick_win_2 ? '✓' : '✗');
    console.log('Quick Win 3:', nextStepsData.quick_win_3 ? '✓' : '✗');
    console.log('Action 1:', nextStepsData.action_1 ? '✓' : '✗');
    console.log('Action 2:', nextStepsData.action_2 ? '✓' : '✗');
    console.log('Action 3:', nextStepsData.action_3 ? '✓' : '✗');

    console.log('\n🎉 Test terminé avec succès !');
    
    if (validation.isValid) {
      console.log('✅ Les données sont prêtes pour être sauvegardées dans la table usecase_nextsteps');
    } else {
      console.log('⚠️ Les données nécessitent des ajustements avant la sauvegarde');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécution du test
if (require.main === module) {
  testExtraction().catch(console.error);
}


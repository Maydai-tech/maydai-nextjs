/**
 * Script de test simple pour valider la mise à jour des tooltips
 * Utilise require pour charger le module compilé
 */

const fs = require('fs');
const path = require('path');

// Lire le fichier de test
const testInput = `Question: Robotique
Catégorie: Réponse
Réponse: La Robotique regroupe les systèmes physiques (robots, machines) qui utilisent l'IA pour fonctionner avec autonomie, interagir avec leur environnement et exécuter des tâches.

Question: Systèmes experts
Catégorie: Réponse
Réponse: Les Systèmes experts sont des systèmes informatiques (souvent qualifiés d'approches fondées sur la logique et les connaissances) qui simulent le processus de prise de décision d'un expert humain.`;

console.log('🧪 Test de mise à jour des tooltips...\n');
console.log('📝 Input:');
console.log(testInput);
console.log('\n' + '='.repeat(60) + '\n');

// Simuler la fonction de parsing pour tester
function parseUserInput(input) {
  const entries = [];
  const lines = input.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentEntry = {};
  
  for (const line of lines) {
    if (line.startsWith('Question:')) {
      if (currentEntry.questionText && currentEntry.category && currentEntry.content) {
        entries.push(currentEntry);
      }
      currentEntry = {
        questionText: line.replace('Question:', '').trim()
      };
    } else if (line.startsWith('Catégorie:')) {
      const category = line.replace('Catégorie:', '').trim();
      if (category === 'Question' || category === 'Réponse') {
        currentEntry.category = category;
      }
    } else if (line.startsWith('Texte:')) {
      if (currentEntry.category === 'Question') {
        currentEntry.content = line.replace('Texte:', '').trim();
      }
    } else if (line.startsWith('Réponse:')) {
      if (currentEntry.category === 'Réponse') {
        currentEntry.content = line.replace('Réponse:', '').trim();
      }
    }
  }
  
  if (currentEntry.questionText && currentEntry.category && currentEntry.content) {
    entries.push(currentEntry);
  }
  
  return entries;
}

// Parser l'input
const parsed = parseUserInput(testInput);
console.log('✅ Entrées parsées:');
parsed.forEach((entry, idx) => {
  console.log(`\n${idx + 1}. Question: "${entry.questionText}"`);
  console.log(`   Catégorie: ${entry.category}`);
  console.log(`   Contenu: ${entry.content.substring(0, 80)}...`);
  console.log(`   Longueur: ${entry.content.length} caractères`);
});

// Vérifier les correspondances dans le fichier JSON
const creationPath = path.join(__dirname, '../app/usecases/new/creation-questions.json');
const creationData = JSON.parse(fs.readFileSync(creationPath, 'utf-8'));

console.log('\n' + '='.repeat(60));
console.log('🔍 Recherche des correspondances dans creation-questions.json:\n');

parsed.forEach((entry, idx) => {
  console.log(`\n${idx + 1}. Recherche de "${entry.questionText}":`);
  
  // Chercher dans les options de ai_category
  const aiCategory = creationData.ai_category;
  if (aiCategory && aiCategory.options) {
    const matches = aiCategory.options.filter(opt => 
      opt.label.toLowerCase().includes(entry.questionText.toLowerCase()) ||
      entry.questionText.toLowerCase().includes(opt.label.toLowerCase())
    );
    
    if (matches.length > 0) {
      matches.forEach(match => {
        console.log(`   ✅ Trouvé: "${match.label}"`);
        console.log(`      Code: ${match.label} (dans ai_category)`);
        console.log(`      Tooltip actuel: "${match.tooltip?.shortContent || 'Aucun'}"`);
        console.log(`      Nouveau contenu: "${entry.content.substring(0, 80)}..."`);
      });
    } else {
      console.log(`   ❌ Aucune correspondance trouvée`);
    }
  }
});

console.log('\n' + '='.repeat(60));
console.log('✅ Test de parsing terminé!');
console.log('\nPour appliquer les modifications, utilisez le script TypeScript:');
console.log('npx ts-node scripts/update-tooltips.ts "<input>"');


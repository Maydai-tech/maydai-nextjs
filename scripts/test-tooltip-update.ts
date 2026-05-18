/**
 * Script de test pour valider la mise à jour des tooltips
 */

import { updateTooltips } from './update-tooltips'

const testInput = `Question: Robotique
Catégorie: Réponse
Réponse: La Robotique regroupe les systèmes physiques (robots, machines) qui utilisent l'IA pour fonctionner avec autonomie, interagir avec leur environnement et exécuter des tâches.

Question: Systèmes experts
Catégorie: Réponse
Réponse: Les Systèmes experts sont des systèmes informatiques (souvent qualifiés d'approches fondées sur la logique et les connaissances) qui simulent le processus de prise de décision d'un expert humain.`

console.log('Test de mise à jour des tooltips...\n')
console.log('Input:')
console.log(testInput)
console.log('\n' + '='.repeat(50) + '\n')

try {
  const result = updateTooltips(testInput)
  
  console.log('=== Résultats de la mise à jour ===')
  console.log(`✅ Mis à jour: ${result.updated}`)
  console.log(`✨ Créés: ${result.created}`)
  console.log(`⚠️ Non trouvés: ${result.notFound.length}`)
  console.log(`⚠️ Ambiguës: ${result.ambiguous.length}`)
  
  if (result.details.length > 0) {
    console.log('\n📋 Détails des modifications:')
    result.details.forEach(d => {
      console.log(`  - ${d.type} ${d.id} (${d.file}): ${d.action}`)
    })
  }
  
  if (result.notFound.length > 0) {
    console.log('\n❌ Entrées non trouvées:')
    result.notFound.forEach(nf => {
      console.log(`  - "${nf.entry.questionText}" (${nf.entry.category}): ${nf.reason}`)
    })
  }
  
  if (result.ambiguous.length > 0) {
    console.log('\n⚠️ Correspondances ambiguës:')
    result.ambiguous.forEach(amb => {
      console.log(`  - "${amb.entry.questionText}" a ${amb.matches.length} correspondances:`)
      amb.matches.forEach((match, idx) => {
        console.log(`    ${idx + 1}. ${match.questionId}${match.optionCode ? `/${match.optionCode}` : ''} - "${match.matchedText}"`)
      })
    })
  }
  
  console.log('\n✅ Test terminé avec succès!')
} catch (error: any) {
  console.error('\n❌ Erreur:', error.message)
  process.exit(1)
}


/**
 * Wrapper pour utiliser updateTooltips directement depuis le chat
 * Cette fonction peut être appelée avec le texte brut de l'utilisateur
 */

import { updateTooltips } from './update-tooltips'

/**
 * Fonction principale pour mettre à jour les tooltips depuis le chat
 * @param input Texte au format Question/Catégorie/Texte/Réponse
 * @returns Résultat de la mise à jour avec détails
 */
export async function updateTooltipsFromChat(input: string) {
  try {
    const result = updateTooltips(input)
    
    // Formater le résultat pour l'affichage
    const summary = {
      success: true,
      updated: result.updated,
      created: result.created,
      notFound: result.notFound.length,
      ambiguous: result.ambiguous.length,
      details: result.details,
      messages: [] as string[]
    }
    
    // Messages informatifs
    if (result.updated > 0) {
      summary.messages.push(`✅ ${result.updated} tooltip(s) mis à jour`)
    }
    if (result.created > 0) {
      summary.messages.push(`✨ ${result.created} tooltip(s) créé(s)`)
    }
    if (result.notFound.length > 0) {
      summary.messages.push(`⚠️ ${result.notFound.length} entrée(s) non trouvée(s)`)
      result.notFound.forEach(nf => {
        summary.messages.push(`   - "${nf.entry.questionText}" (${nf.entry.category})`)
      })
    }
    if (result.ambiguous.length > 0) {
      summary.messages.push(`⚠️ ${result.ambiguous.length} correspondance(s) ambiguë(s) - première utilisée`)
      result.ambiguous.forEach(amb => {
        summary.messages.push(`   - "${amb.entry.questionText}" a ${amb.matches.length} correspondances`)
      })
    }
    
    return summary
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      updated: 0,
      created: 0,
      notFound: 0,
      ambiguous: 0,
      details: [],
      messages: [`❌ Erreur: ${error.message}`]
    }
  }
}


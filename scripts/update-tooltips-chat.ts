/**
 * Fonction simple pour mettre à jour les tooltips depuis le chat
 * Usage: Appeler cette fonction avec le texte au format Question/Catégorie/Texte/Réponse
 */

import { updateTooltips } from './update-tooltips'

/**
 * Met à jour les tooltips avec le texte fourni par l'utilisateur
 * @param input Texte au format Question/Catégorie/Texte/Réponse
 * @returns Résultat formaté pour affichage
 */
export function updateTooltipsFromUserInput(input: string): {
  success: boolean
  message: string
  details: {
    updated: number
    created: number
    notFound: number
    ambiguous: number
  }
  errors?: string[]
  warnings?: string[]
} {
  try {
    const result = updateTooltips(input)
    
    const messages: string[] = []
    const warnings: string[] = []
    
    // Messages de succès
    if (result.updated > 0) {
      messages.push(`${result.updated} tooltip(s) mis à jour`)
    }
    if (result.created > 0) {
      messages.push(`${result.created} tooltip(s) créé(s)`)
    }
    
    // Avertissements
    if (result.notFound.length > 0) {
      warnings.push(`${result.notFound.length} entrée(s) non trouvée(s):`)
      result.notFound.forEach(nf => {
        warnings.push(`  - "${nf.entry.questionText}" (${nf.entry.category})`)
      })
    }
    
    if (result.ambiguous.length > 0) {
      warnings.push(`${result.ambiguous.length} correspondance(s) ambiguë(s) (première utilisée):`)
      result.ambiguous.forEach(amb => {
        warnings.push(`  - "${amb.entry.questionText}" a ${amb.matches.length} correspondances`)
      })
    }
    
    // Détails des modifications
    const detailsList: string[] = []
    if (result.details.length > 0) {
      detailsList.push('Modifications effectuées:')
      result.details.forEach(d => {
        detailsList.push(`  - ${d.type} ${d.id} (${d.file}): ${d.action}`)
      })
    }
    
    const successMessage = messages.length > 0 
      ? messages.join(', ') + '.'
      : 'Aucune modification effectuée.'
    
    return {
      success: true,
      message: successMessage,
      details: {
        updated: result.updated,
        created: result.created,
        notFound: result.notFound.length,
        ambiguous: result.ambiguous.length
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: detailsList.length > 0 ? detailsList : undefined
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      details: {
        updated: 0,
        created: 0,
        notFound: 0,
        ambiguous: 0
      },
      errors: [error.message]
    }
  }
}


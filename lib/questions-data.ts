/**
 * Données des questions pour le calcul de score et la génération de rapports OpenAI
 * 
 * Ce fichier importe directement le JSON des questions et nettoie les tooltips
 * qui ne sont pas nécessaires pour OpenAI.
 * 
 * ⚠️ IMPORTANT : Ce fichier doit fonctionner dans les API routes (environnement Node.js)
 * C'est pourquoi on utilise un import direct du JSON plutôt qu'une fonction de chargement dynamique.
 */

// Import direct du JSON avec les tooltips
import questionsDataRaw from '@/app/usecases/[id]/data/questions-with-scores.json'

/**
 * Nettoie les tooltips des questions pour OpenAI
 * Les tooltips sont utiles pour l'interface utilisateur mais pas pour la génération de rapports
 */
function cleanTooltips(data: any): Record<string, any> {
  const cleaned: Record<string, any> = {}
  
  for (const [key, question] of Object.entries(data)) {
    const q = question as any
    
    // Retirer le tooltip de la question
    const { tooltip: _questionTooltip, ...questionWithoutTooltip } = q
    
    cleaned[key] = {
      ...questionWithoutTooltip,
      // Nettoyer les options en retirant leurs tooltips
      options: q.options.map((option: any) => {
        const { tooltip: _optionTooltip, ...cleanOption } = option
        return cleanOption
      })
    }
  }
  
  return cleaned
}

/**
 * Export des questions nettoyées pour les transformers OpenAI
 */
export const QUESTIONS_DATA = cleanTooltips(questionsDataRaw)


/**
 * Utilitaires de conversion de scores
 *
 * Ce fichier contient les fonctions pour convertir les scores de leur base
 * de calcul (150) vers leur base d'affichage (100).
 *
 * Contexte :
 * - Le calcul interne utilise une base 150 (100 questionnaire + 50 modèle COMPL-AI)
 * - Répartition 2/3 (Questionnaire) - 1/3 (Modèle LLM)
 * - L'affichage utilisateur utilise une base 100 pour plus de clarté
 * - Les sous-scores : questionnaire/100, modèle/50 (5 principes × 10 points)
 */

/**
 * Convertit un score sur base 150 en score sur base 100
 *
 * Formule : scoreOn100 = Math.round((scoreOn150 * 100) / 150)
 *
 * Exemples :
 * - 150/150 → 100/100 (parfait)
 * - 100/150 → 67/100 (questionnaire seul, sans modèle)
 * - 75/150 → 50/100 (moitié des points)
 * - 0/150 → 0/100 (éliminé ou score nul)
 *
 * @param scoreOn150 - Score calculé sur base 150 (score brut)
 * @returns Score arrondi sur base 100
 */
export function convertScoreTo100(scoreOn150: number | null | undefined): number {
  if (scoreOn150 === null || scoreOn150 === undefined) {
    return 0
  }
  return Math.round((scoreOn150 * 100) / 150)
}

/**
 * Retourne le max_score pour l'affichage (toujours 100)
 * 
 * Cette fonction remplace l'ancien max_score de 110 dans l'interface utilisateur.
 * 
 * @returns 100
 */
export function getDisplayMaxScore(): number {
  return 100
}



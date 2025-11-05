/**
 * Utilitaires de conversion de scores
 * 
 * Ce fichier contient les fonctions pour convertir les scores de leur base
 * de calcul (120) vers leur base d'affichage (100).
 * 
 * Contexte :
 * - Le calcul interne utilise une base 120 (90 base + 20 modèle + 10 marge théorique)
 * - L'affichage utilisateur utilise une base 100 pour plus de clarté
 * - Les sous-scores (base/90, modèle/20) restent sur leurs bases d'origine
 */

/**
 * Convertit un score sur base 120 en score sur base 100
 * 
 * Formule : scoreOn100 = Math.round((scoreOn120 * 100) / 120)
 * 
 * Exemples :
 * - 120/120 → 100/100
 * - 90/120 → 75/100
 * - 60/120 → 50/100
 * - 0/120 → 0/100
 * 
 * @param scoreOn120 - Score calculé sur base 120 (score brut)
 * @returns Score arrondi sur base 100
 */
export function convertScoreTo100(scoreOn120: number | null | undefined): number {
  if (scoreOn120 === null || scoreOn120 === undefined) {
    return 0
  }
  return Math.round((scoreOn120 * 100) / 120)
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



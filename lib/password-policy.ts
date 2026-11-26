/** Règle mot de passe unique (connexion, inscription, réinitialisation, paramètres). */
export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_HINT = `${PASSWORD_MIN_LENGTH} caractères minimum.`

/** Retourne un message d'erreur en français, ou `null` si le couple est valide. */
export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`
  }
  if (password !== confirmation) {
    return 'Les deux mots de passe ne correspondent pas.'
  }
  return null
}

/**
 * Marqueur (user_metadata) posé quand l'utilisateur choisit un mot de passe : inscription,
 * réinitialisation, paramètres. Sans lui, un compte existant se connecte par code.
 * GoTrue stocke un mot de passe aléatoire pour les comptes créés par code : la base seule
 * ne permet pas de savoir qui en connaît un.
 * ponytail: simple indice d'affichage modifiable par l'utilisateur lui-même ; à passer en
 * app_metadata si un jour il conditionne un droit.
 */
export const HAS_PASSWORD_KEY = 'has_password'

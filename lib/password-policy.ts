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

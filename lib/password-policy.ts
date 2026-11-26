/**
 * Règle mot de passe unique (inscription, réinitialisation, paramètres), alignée sur la
 * recommandation CNIL : 12 caractères avec majuscule, minuscule, chiffre et caractère spécial.
 * Le serveur applique la même règle (GOTRUE_PASSWORD_MIN_LENGTH / _REQUIRED_CHARACTERS) et refuse
 * en plus les mots de passe présents dans une fuite connue (GOTRUE_PASSWORD_HIBP_ENABLED).
 */
export const PASSWORD_MIN_LENGTH = 12

/** Caractères spéciaux acceptés : exactement ceux que GoTrue reconnaît. */
export const PASSWORD_SPECIAL_CHARACTERS = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~'

export const PASSWORD_HINT = `${PASSWORD_MIN_LENGTH} caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.`

const REQUIRED_CHARACTER_SETS: { label: string; test: (password: string) => boolean }[] = [
  { label: 'une majuscule', test: (password) => /[A-Z]/.test(password) },
  { label: 'une minuscule', test: (password) => /[a-z]/.test(password) },
  { label: 'un chiffre', test: (password) => /[0-9]/.test(password) },
  { label: 'un caractère spécial', test: (password) => [...password].some((char) => PASSWORD_SPECIAL_CHARACTERS.includes(char)) },
]

/** Retourne un message d'erreur en français, ou `null` si le couple est valide. */
export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`
  }
  const missing = REQUIRED_CHARACTER_SETS.filter((set) => !set.test(password)).map((set) => set.label)
  if (missing.length > 0) {
    return `Le mot de passe doit contenir au moins ${missing.join(', ')}.`
  }
  if (password !== confirmation) {
    return 'Les deux mots de passe ne correspondent pas.'
  }
  return null
}

/**
 * Message pour un refus du serveur (`weak_password`, `same_password`), sinon `fallback`.
 * `reasons` contient `pwned` quand le mot de passe figure dans une fuite connue.
 */
export function passwordServerErrorMessage(error: unknown, fallback: string): string {
  const { code, reasons } = (error ?? {}) as { code?: string; reasons?: string[] }
  if (code === 'same_password') return 'Choisissez un mot de passe différent de l’actuel.'
  if (code === 'weak_password') {
    return reasons?.includes('pwned')
      ? 'Ce mot de passe figure dans une fuite de données connue. Choisissez-en un autre.'
      : `Mot de passe trop faible : ${PASSWORD_HINT}`
  }
  return fallback
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

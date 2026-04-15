/**
 * Normalise une date saisie (JJ/MM/AAAA ou YYYY-MM-DD) vers AAAA-MM-JJ pour PostgreSQL.
 * Chaîne vide → null.
 */
export function convertDeploymentDateForDb(
  dateString: string | undefined | null
): string | null {
  if (dateString === undefined || dateString === null) return null
  const trimmed = String(dateString).trim()
  if (!trimmed) return null

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return trimmed

  const fr = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (fr) {
    const [, day, month, year] = fr
    return `${year}-${month}-${day}`
  }

  return trimmed
}

/**
 * Alerte affichée quand la licence des poids exclut l’Union européenne.
 * Le texte pourra être reformulé après la relecture juridique.
 */
export const EU_LICENSE_ALERT_TEXT = "Alerte — risque contractuel et de conformité. L'éditeur subordonne l'octroi des droits sur les poids multimodaux de ce modèle à une clause d'exclusion territoriale visant expressément les entités et résidents établis dans l'Union européenne. Un déploiement direct par votre organisation constitue une violation des conditions contractuelles de l'éditeur et vicie la licéité juridique du système d'IA. Seul le recours à un service applicatif tiers fourni par une entité légalement autorisée hors UE est envisageable."

const EU_ISO = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
] as const

function foldCountry(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function countryNames(): { eu: Set<string>; known: Set<string> } {
  const eu = new Set<string>()
  const known = new Set<string>()
  const french = new Intl.DisplayNames(['fr'], { type: 'region' })
  const english = new Intl.DisplayNames(['en'], { type: 'region' })
  const euCodes = new Set<string>(EU_ISO)

  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first, second)
      const frenchName = french.of(code)
      if (!frenchName || frenchName.toUpperCase() === code) continue
      const names = [code, frenchName, english.of(code) ?? '']
      const target = euCodes.has(code) ? eu : known
      for (const name of names) {
        const folded = foldCountry(name)
        if (folded) target.add(folded)
      }
    }
  }

  for (const alias of ['uk', 'usa', 'angleterre', 'grandebretagne', 'greatbritain', 'hollande']) {
    known.add(alias)
  }
  return { eu, known }
}

const COUNTRIES = countryNames()

/**
 * Affiche l’alerte si le modèle est restreint et que le pays de l’organisation
 * est dans l’UE, vide ou illisible. Un pays reconnu hors de l’UE masque l’alerte.
 */
export function shouldShowEuLicenseAlert(input: {
  licenseEuRestricted: boolean
  organizationCountry: string | null | undefined
}): boolean {
  if (!input.licenseEuRestricted) return false
  const country = foldCountry(input.organizationCountry ?? '')
  if (!country) return true
  if (COUNTRIES.eu.has(country)) return true
  if (COUNTRIES.known.has(country)) return false
  return true
}

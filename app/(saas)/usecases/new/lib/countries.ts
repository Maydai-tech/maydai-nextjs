export const ISO_TO_COUNTRY_NAME: Record<string, string> = {
  'fr': 'France',
  'us': 'États-Unis',
  'ca': 'Canada',
  'gb': 'Royaume-Uni',
  'de': 'Allemagne',
  'es': 'Espagne',
  'it': 'Italie',
  'au': 'Australie',
  'jp': 'Japon',
  'cn': 'Chine',
  'in': 'Inde',
  'br': 'Brésil',
  'mx': 'Mexique',
  'nl': 'Pays-Bas',
  'be': 'Belgique',
  'ch': 'Suisse',
  'se': 'Suède',
  'no': 'Norvège',
  'dk': 'Danemark',
  'fi': 'Finlande',
  'pt': 'Portugal',
  'pl': 'Pologne',
  'ru': 'Russie',
  'kr': 'Corée du Sud',
  'sg': 'Singapour',
  'nz': 'Nouvelle-Zélande',
  'ar': 'Argentine',
  'za': 'Afrique du Sud',
  'si': 'Slovénie',
}

/**
 * Converts an ISO country code to a French country name.
 * Falls back to Intl.DisplayNames when available, otherwise returns the code.
 */
export function isoCodeToFrenchName(code: string): string {
  const lower = code.toLowerCase()
  if (ISO_TO_COUNTRY_NAME[lower]) {
    return ISO_TO_COUNTRY_NAME[lower]
  }
  try {
    const displayNames = new Intl.DisplayNames(['fr'], { type: 'region' })
    return displayNames.of(code.toUpperCase()) || code
  } catch {
    return code
  }
}

export const COUNTRY_CODES_LIST = [
  'US', 'GB', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'PT', 'IE',
  'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'HU', 'SK', 'SI', 'HR', 'BG', 'RO',
  'GR', 'CY', 'MT', 'LU', 'LV', 'LT', 'EE', 'CA', 'MX', 'BR', 'AR', 'CL',
  'CO', 'PE', 'UY', 'VE', 'EC', 'BO', 'PY', 'SR', 'GY', 'FK', 'GF', 'AU',
  'NZ', 'JP', 'KR', 'CN', 'IN', 'TH', 'VN', 'PH', 'ID', 'MY', 'SG', 'HK',
  'TW', 'BD', 'PK', 'LK', 'NP', 'AF', 'IR', 'IQ', 'SA', 'AE', 'KW', 'QA',
  'BH', 'OM', 'YE', 'JO', 'LB', 'SY', 'IL', 'PS', 'TR', 'EG', 'LY', 'TN',
  'DZ', 'MA', 'SD', 'ET', 'KE', 'UG', 'TZ', 'RW', 'BI', 'DJ', 'SO', 'ER',
  'SS', 'CF', 'TD', 'CM', 'GQ', 'GA', 'CG', 'CD', 'AO', 'ZM', 'ZW', 'BW',
  'NA', 'SZ', 'LS', 'ZA', 'MZ', 'MW', 'MG', 'MU', 'SC', 'KM', 'YT', 'RE',
  'MV', 'RU', 'BY', 'UA', 'MD', 'GE', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM',
  'UZ', 'MN',
]

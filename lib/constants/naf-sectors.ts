/**
 * NAF (Nomenclature d'Activités Française) Sectors
 *
 * This file contains the official French business activity sectors
 * based on the NAF Rev. 2 classification (2008) aligned with
 * the European NACE Rev. 2 nomenclature.
 *
 * Sections are identified by letters A through U, plus a catch-all "OTHER" category.
 *
 * @see https://www.insee.fr/fr/information/2120875
 */

export interface NAFSector {
  code: string
  label: string
  description?: string
}

/**
 * Complete list of NAF sections (21 official sections + OTHER)
 */
export const NAF_SECTORS: NAFSector[] = [
  {
    code: 'A',
    label: 'Agriculture, sylviculture et pêche',
    description: 'Culture, élevage, chasse, sylviculture, exploitation forestière, pêche et aquaculture'
  },
  {
    code: 'B',
    label: 'Industries extractives',
    description: 'Extraction de houille, minerais, pétrole et gaz naturel'
  },
  {
    code: 'C',
    label: 'Industrie manufacturière',
    description: 'Fabrication de produits, métallurgie, équipements, véhicules'
  },
  {
    code: 'D',
    label: 'Production et distribution d\'électricité, de gaz, de vapeur et d\'air conditionné',
    description: 'Production, transport et distribution d\'énergie'
  },
  {
    code: 'E',
    label: 'Production et distribution d\'eau ; assainissement, gestion des déchets et dépollution',
    description: 'Captage, traitement et distribution d\'eau, gestion des déchets'
  },
  {
    code: 'F',
    label: 'Construction',
    description: 'Travaux de construction, génie civil, installation et finition'
  },
  {
    code: 'G',
    label: 'Commerce ; réparation d\'automobiles et de motocycles',
    description: 'Commerce de gros et de détail, réparation de véhicules'
  },
  {
    code: 'H',
    label: 'Transports et entreposage',
    description: 'Transport de voyageurs et de marchandises, entreposage'
  },
  {
    code: 'I',
    label: 'Hébergement et restauration',
    description: 'Hôtels, hébergement touristique, restauration'
  },
  {
    code: 'J',
    label: 'Information et communication',
    description: 'Édition, audiovisuel, télécommunications, programmation informatique, services d\'information'
  },
  {
    code: 'K',
    label: 'Activités financières et d\'assurance',
    description: 'Banque, assurance, fonds de placement, gestion de portefeuilles'
  },
  {
    code: 'L',
    label: 'Activités immobilières',
    description: 'Location et exploitation de biens immobiliers'
  },
  {
    code: 'M',
    label: 'Activités spécialisées, scientifiques et techniques',
    description: 'Activités juridiques, comptables, conseil de gestion, architecture, ingénierie, R&D, publicité'
  },
  {
    code: 'N',
    label: 'Activités de services administratifs et de soutien',
    description: 'Location, agences de voyage, sécurité, services aux bâtiments, services administratifs'
  },
  {
    code: 'O',
    label: 'Administration publique',
    description: 'Administration publique et défense, sécurité sociale obligatoire'
  },
  {
    code: 'P',
    label: 'Enseignement',
    description: 'Enseignement primaire, secondaire, supérieur, formation continue'
  },
  {
    code: 'Q',
    label: 'Santé humaine et action sociale',
    description: 'Activités pour la santé humaine, hébergement médico-social, action sociale'
  },
  {
    code: 'R',
    label: 'Arts, spectacles et activités récréatives',
    description: 'Activités créatives, artistiques, spectacles, bibliothèques, musées, activités sportives'
  },
  {
    code: 'S',
    label: 'Autres activités de services',
    description: 'Organisations associatives, réparation d\'ordinateurs, services personnels'
  },
  {
    code: 'T',
    label: 'Activités des ménages en tant qu\'employeurs',
    description: 'Activités des ménages en tant qu\'employeurs de personnel domestique'
  },
  {
    code: 'U',
    label: 'Activités extra-territoriales',
    description: 'Activités des organisations et organismes extraterritoriaux'
  },
  {
    code: 'AUTRE',
    label: 'Autre secteur',
    description: 'Secteur d\'activité non listé ci-dessus'
  }
]

/**
 * Get the label for a given NAF sector code
 * @param code - The NAF sector code (A-U or AUTRE)
 * @returns The sector label or undefined if not found
 */
export function getNAFSectorLabel(code: string): string | undefined {
  const sector = NAF_SECTORS.find(s => s.code === code)
  return sector?.label
}

/**
 * Get the description for a given NAF sector code
 * @param code - The NAF sector code (A-U or AUTRE)
 * @returns The sector description or undefined if not found
 */
export function getNAFSectorDescription(code: string): string | undefined {
  const sector = NAF_SECTORS.find(s => s.code === code)
  return sector?.description
}

/**
 * Get NAF sectors formatted for dropdown/select options
 * @returns Array of {value, label} objects suitable for HTML select elements
 */
export function getNAFSectorOptions(): Array<{ value: string; label: string }> {
  return NAF_SECTORS.map(sector => ({
    value: sector.code,
    label: sector.label
  }))
}

/**
 * Get NAF sectors formatted for dropdown/select options with descriptions
 * @returns Array of {value, label, description} objects
 */
export function getNAFSectorOptionsWithDescriptions(): Array<{
  value: string
  label: string
  description: string
}> {
  return NAF_SECTORS.map(sector => ({
    value: sector.code,
    label: sector.label,
    description: sector.description || ''
  }))
}

/**
 * Check if a code is a valid NAF sector code
 * @param code - The code to validate
 * @returns true if the code is valid, false otherwise
 */
export function isValidNAFSectorCode(code: string): boolean {
  return NAF_SECTORS.some(sector => sector.code === code)
}

/**
 * Common NAF sectors for AI/Tech companies
 * Useful for pre-populating or suggesting relevant sectors
 */
export const COMMON_TECH_SECTORS = [
  'J', // Information et communication
  'M', // Activités spécialisées, scientifiques et techniques
  'K', // Activités financières et d'assurance (FinTech)
  'C', // Industrie manufacturière (Hardware/IoT)
] as const

/**
 * Get only tech-related NAF sectors
 * @returns Filtered array of tech-related sectors
 */
export function getTechNAFSectors(): NAFSector[] {
  return NAF_SECTORS.filter(sector =>
    COMMON_TECH_SECTORS.includes(sector.code as typeof COMMON_TECH_SECTORS[number])
  )
}

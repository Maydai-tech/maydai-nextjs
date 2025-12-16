/**
 * Mayday Industries - Custom Industry Classification
 * 
 * This file contains a custom, user-friendly 2-level hierarchy for company sectors
 * replacing the standard NAF/NACE code selection.
 */

export interface SubCategory {
  id: string;
  label: string;
}

export interface IndustryFamily {
  id: string;
  label: string;
  subCategories: SubCategory[];
}

export const INDUSTRIES_LIST: IndustryFamily[] = [
  {
    id: "tech_data",
    label: "Tech, Data & Télécoms",
    subCategories: [
      { id: "saas", label: "Logiciels, SaaS & Plateformes" },
      { id: "ai_data", label: "IA, Data Science & Big Data" },
      { id: "cyber_cloud", label: "Cybersécurité & Cloud" },
      { id: "esn", label: "ESN & Conseil IT" },
      { id: "telecom", label: "Télécoms & Infrastructures réseau" }
    ]
  },
  {
    id: "finance",
    label: "Banque, Finance & Assurance",
    subCategories: [
      { id: "banking", label: "Banque & Paiements" },
      { id: "insurance", label: "Assurance & Mutuelles" },
      { id: "fintech", label: "FinTech & Crypto-actifs" },
      { id: "asset_mgmt", label: "Gestion d'actifs & Investissement" }
    ]
  },
  {
    id: "health",
    label: "Santé & Sciences de la Vie",
    subCategories: [
      { id: "care_centers", label: "Établissements de Soins (Hôpitaux, Cliniques)" },
      { id: "pharma", label: "Industrie Pharmaceutique & Biotech" },
      { id: "medtech", label: "Dispositifs Médicaux (MedTech)" },
      { id: "esante", label: "Santé numérique & e-Santé" }
    ]
  },
  {
    id: "industry",
    label: "Industrie, Énergie & Environnement",
    subCategories: [
      { id: "manufacturing", label: "Industrie Manufacturière & Robotique" },
      { id: "energy", label: "Énergie & Utilities (Eau, Déchets)" },
      { id: "agritech", label: "Agroalimentaire & Agriculture (AgriTech)" },
      { id: "chemistry", label: "Chimie & Matériaux" }
    ]
  },
  {
    id: "retail_media",
    label: "Commerce, Marketing & Médias",
    subCategories: [
      { id: "retail", label: "Retail, E-commerce & Grande Distribution" },
      { id: "adtech", label: "Marketing, Publicité & AdTech" },
      { id: "media", label: "Médias, Édition & Divertissement" },
      { id: "luxury", label: "Luxe, Mode & Cosmétiques" }
    ]
  },
  {
    id: "public_rh",
    label: "RH, Éducation & Services Publics",
    subCategories: [
      { id: "hr", label: "Ressources Humaines & Recrutement" },
      { id: "edtech", label: "Éducation, Formation & EdTech" },
      { id: "public_admin", label: "Administration Publique & Collectivités" },
      { id: "defense", label: "Défense & Sécurité" }
    ]
  },
  {
    id: "services",
    label: "Services aux Entreprises & Juridique",
    subCategories: [
      { id: "legal", label: "Juridique & Avocats (LegalTech)" },
      { id: "consulting", label: "Audit, Comptabilité & Conseil en Stratégie" },
      { id: "facility", label: "Services Généraux & Facility Management" }
    ]
  },
  {
    id: "construction_transport",
    label: "Construction, Immobilier & Transport",
    subCategories: [
      { id: "construction", label: "Construction & BTP" },
      { id: "proptech", label: "Immobilier & PropTech" },
      { id: "transport", label: "Transports, Logistique & Supply Chain" },
      { id: "aerospace", label: "Aéronautique, Spatial & Défense (Industriel)" }
    ]
  }
];

/**
 * Get an industry family by its ID
 * @param id - The industry family ID
 * @returns The industry family or undefined if not found
 */
export function getIndustryById(id: string): IndustryFamily | undefined {
  return INDUSTRIES_LIST.find(industry => industry.id === id);
}

/**
 * Get a sub-category by its IDs
 * @param mainIndustryId - The main industry ID
 * @param subCategoryId - The sub-category ID
 * @returns The sub-category or undefined if not found
 */
export function getSubCategoryById(mainIndustryId: string, subCategoryId: string): SubCategory | undefined {
  const industry = getIndustryById(mainIndustryId);
  if (!industry) return undefined;
  return industry.subCategories.find(sub => sub.id === subCategoryId);
}

/**
 * Get the label for a given industry ID
 * @param id - The industry ID
 * @returns The industry label or undefined if not found
 */
export function getIndustryLabel(id: string): string | undefined {
  return getIndustryById(id)?.label;
}

/**
 * Get the label for a given sub-category
 * @param mainIndustryId - The main industry ID
 * @param subCategoryId - The sub-category ID
 * @returns The sub-category label or undefined if not found
 */
export function getSubCategoryLabel(mainIndustryId: string, subCategoryId: string): string | undefined {
  return getSubCategoryById(mainIndustryId, subCategoryId)?.label;
}

/**
 * Check if an industry ID is valid
 * @param id - The industry ID to validate
 * @returns true if the ID is valid, false otherwise
 */
export function isValidIndustryId(id: string): boolean {
  return INDUSTRIES_LIST.some(industry => industry.id === id);
}

/**
 * Check if a sub-category ID is valid for a given main industry
 * @param mainIndustryId - The main industry ID
 * @param subCategoryId - The sub-category ID to validate
 * @returns true if the combination is valid, false otherwise
 */
export function isValidSubCategoryId(mainIndustryId: string, subCategoryId: string): boolean {
  const industry = getIndustryById(mainIndustryId);
  if (!industry) return false;
  return industry.subCategories.some(sub => sub.id === subCategoryId);
}

/**
 * Get formatted display text for industry selection
 * @param mainIndustryId - The main industry ID
 * @param subCategoryId - The sub-category ID
 * @returns Formatted string like "Main Industry > Sub-category" or undefined
 */
export function getIndustryDisplayText(mainIndustryId: string, subCategoryId: string): string | undefined {
  const mainLabel = getIndustryLabel(mainIndustryId);
  const subLabel = getSubCategoryLabel(mainIndustryId, subCategoryId);
  if (!mainLabel || !subLabel) return undefined;
  return `${mainLabel} > ${subLabel}`;
}



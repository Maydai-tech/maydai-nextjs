/**
 * Industry Selection Validation
 * 
 * Validates industry and sub-category selections
 */

import { isValidIndustryId, isValidSubCategoryId } from '@/lib/constants/industries'

export interface IndustryValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate an industry selection (main industry + sub-category)
 * @param mainIndustryId - The main industry ID
 * @param subCategoryId - The sub-category ID
 * @returns Validation result with error message if invalid
 */
export function validateIndustrySelection(
  mainIndustryId: string,
  subCategoryId: string
): IndustryValidationResult {
  // Check if main industry is provided
  if (!mainIndustryId || mainIndustryId.trim() === '') {
    return {
      valid: false,
      error: 'Le secteur d\'activité principal est obligatoire'
    }
  }

  // Check if main industry ID is valid
  if (!isValidIndustryId(mainIndustryId)) {
    return {
      valid: false,
      error: 'Secteur d\'activité principal invalide'
    }
  }

  // Check if sub-category is provided
  if (!subCategoryId || subCategoryId.trim() === '') {
    return {
      valid: false,
      error: 'La sous-catégorie est obligatoire'
    }
  }

  // Check if sub-category ID is valid for the main industry
  if (!isValidSubCategoryId(mainIndustryId, subCategoryId)) {
    return {
      valid: false,
      error: 'La sous-catégorie sélectionnée n\'est pas valide pour ce secteur d\'activité'
    }
  }

  return { valid: true }
}


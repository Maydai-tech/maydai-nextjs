/**
 * Corps JSON attendu par POST /api/auth/complete-signup
 * (champs acquisition optionnels, rétrocompatibles).
 */
export type CompleteSignUpAcquisitionFields = {
  gclid?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
}

export type CompleteSignUpRequestBody = CompleteSignUpAcquisitionFields & {
  email?: string
  firstName: string
  lastName: string
  companyName: string
  mainIndustryId: string
  subCategoryId: string
  phone?: string | null
  siren?: string | null
  /** Intention d’achat (forfait), validée côté API avec `planIdSchema`. */
  planIntent?: string | null
}

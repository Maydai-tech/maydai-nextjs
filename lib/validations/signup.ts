import { z } from 'zod'

/**
 * Schéma de validation pour le body `POST /api/auth/complete-signup`.
 * Miroir du contrat Frontend (camelCase + champs acquisition en snake_case).
 * Tous les champs sont optionnels pour ne pas bloquer la production ;
 * la route applique les règles obligatoires métier au moment opportun.
 */
export const CompleteSignupSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  mainIndustryId: z.string().trim().optional(),
  subCategoryId: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  siren: z.string().trim().optional(),
  planIntent: z.string().trim().optional(),
  gclid: z.string().trim().optional(),
  utm_source: z.string().trim().optional(),
  utm_medium: z.string().trim().optional(),
  utm_campaign: z.string().trim().optional(),
})

export type CompleteSignupInput = z.infer<typeof CompleteSignupSchema>

/** Colonnes profil écrites par complete-signup (hors id / score / timestamps). */
export type SignupProfileFields = {
  first_name: string | null
  last_name: string | null
  company_name: string | null
  industry: string | null
  sub_category_id: string | null
  phone: string | null
  siren: string | null
  gclid: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
}

export function emptySignupProfileFields(): SignupProfileFields {
  return {
    first_name: null,
    last_name: null,
    company_name: null,
    industry: null,
    sub_category_id: null,
    phone: null,
    siren: null,
    gclid: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
  }
}

/**
 * Fusionne un payload d’inscription partiel avec le profil déjà en base.
 * Les clés absentes du patch ne doivent pas écraser les valeurs existantes
 * (sinon un OTP sur un compte déjà créé efface SIREN / téléphone).
 */
export function mergeCompleteSignupProfile(
  existing: Partial<SignupProfileFields> | null | undefined,
  patch: Partial<SignupProfileFields>
): SignupProfileFields {
  const base: SignupProfileFields = {
    ...emptySignupProfileFields(),
    ...existing,
  }
  return {
    first_name: patch.first_name !== undefined ? patch.first_name : base.first_name,
    last_name: patch.last_name !== undefined ? patch.last_name : base.last_name,
    company_name: patch.company_name !== undefined ? patch.company_name : base.company_name,
    industry: patch.industry !== undefined ? patch.industry : base.industry,
    sub_category_id:
      patch.sub_category_id !== undefined ? patch.sub_category_id : base.sub_category_id,
    phone: patch.phone !== undefined ? patch.phone : base.phone,
    siren: patch.siren !== undefined ? patch.siren : base.siren,
    gclid: patch.gclid !== undefined ? patch.gclid : base.gclid,
    utm_source: patch.utm_source !== undefined ? patch.utm_source : base.utm_source,
    utm_medium: patch.utm_medium !== undefined ? patch.utm_medium : base.utm_medium,
    utm_campaign: patch.utm_campaign !== undefined ? patch.utm_campaign : base.utm_campaign,
  }
}

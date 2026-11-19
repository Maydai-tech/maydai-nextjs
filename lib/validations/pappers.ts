import { z } from 'zod'
import { isValidSubCategoryId } from '@/lib/constants/industries'

/**
 * Contrats Zod des réponses brutes Pappers et de la suggestion normalisée MaydAI.
 * Les objets bruts acceptent les champs supplémentaires de l'API (`passthrough`).
 */

const pappersNullableString = z.string().nullish()

/**
 * Pappers sérialise plusieurs indicateurs en `0` / `1` (parfois en booléen).
 * Le schéma brut les ramène à `boolean | null`.
 */
export const PappersRawFlagSchema = z
  .union([z.boolean(), z.literal(0), z.literal(1), z.literal('0'), z.literal('1')])
  .nullish()
  .transform((value): boolean | null => {
    if (value == null) return null
    return value === true || value === 1 || value === '1'
  })

/** Siège tel que renvoyé par `/v2/recherche` et `/v2/entreprise`. */
export const PappersRawSiegeSchema = z
  .object({
    siret: pappersNullableString,
    siret_formate: pappersNullableString,
    nic: pappersNullableString,
    adresse_ligne_1: pappersNullableString,
    adresse_ligne_2: pappersNullableString,
    code_postal: pappersNullableString,
    ville: pappersNullableString,
    pays: pappersNullableString,
    code_pays: pappersNullableString,
  })
  .passthrough()

/** Fiche entreprise commune aux deux endpoints (champs utilisés par MaydAI). */
export const PappersRawCompanySchema = z
  .object({
    siren: z.string(),
    siren_formate: pappersNullableString,
    nom_entreprise: pappersNullableString,
    denomination: pappersNullableString,
    nom: pappersNullableString,
    prenom: pappersNullableString,
    code_naf: pappersNullableString,
    libelle_code_naf: pappersNullableString,
    domaine_activite: pappersNullableString,
    entreprise_cessee: PappersRawFlagSchema,
    date_cessation: pappersNullableString,
    date_creation: pappersNullableString,
    forme_juridique: pappersNullableString,
    categorie_juridique: pappersNullableString,
    siege: PappersRawSiegeSchema.nullish(),
  })
  .passthrough()

/** Réponse brute de `GET /v2/recherche`. */
export const PappersRawSearchResponseSchema = z
  .object({
    resultats: z.array(PappersRawCompanySchema),
    total: z.number().nullish(),
    page: z.number().nullish(),
  })
  .passthrough()

/**
 * Réponse brute de `GET /v2/entreprise`.
 * Même fiche que la recherche, avec les blocs détail (représentants, finances, établissements)
 * laissés ouverts via `passthrough`.
 */
export const PappersRawEntrepriseResponseSchema = PappersRawCompanySchema

export const MaydaiMainIndustryIdSchema = z.enum([
  'tech_data',
  'finance',
  'health',
  'industry',
  'retail_media',
  'public_rh',
  'services',
  'construction_transport',
])

/** Couple secteur MaydAI déduit d'une division NAF, plus le drapeau Annexe III. */
export const NafIndustryMappingSchema = z
  .object({
    mainIndustryId: MaydaiMainIndustryIdSchema,
    subCategoryId: z.string(),
    annex_iii_sensitive: z.boolean(),
    annex_iii_domain: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!isValidSubCategoryId(value.mainIndustryId, value.subCategoryId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Sous-catégorie invalide pour ${value.mainIndustryId}: ${value.subCategoryId}`,
        path: ['subCategoryId'],
      })
    }
  })

export type NafIndustryMapping = z.infer<typeof NafIndustryMappingSchema>

/** Suggestion normalisée consommée par MaydAI. */
export const PappersCompanySuggestionSchema = z.object({
  siren: z.string().regex(/^\d{9}$/, 'Le SIREN doit contenir exactement 9 chiffres'),
  siret_siege: z.string().nullish(),
  nom_entreprise: z.string().min(1),
  code_naf: z.string().nullish(),
  libelle_code_naf: z.string().nullish(),
  adresse_complete: z.string().nullish(),
  code_postal: z.string().nullish(),
  ville: z.string().nullish(),
  entreprise_cessee: z.boolean().default(false),
  is_mock: z.boolean().default(false),
  suggested_industry: NafIndustryMappingSchema.optional().nullable(),
})

export type PappersRawSiege = z.infer<typeof PappersRawSiegeSchema>
export type PappersRawCompany = z.infer<typeof PappersRawCompanySchema>
export type PappersRawSearchResponse = z.infer<typeof PappersRawSearchResponseSchema>
export type PappersRawEntrepriseResponse = z.infer<typeof PappersRawEntrepriseResponseSchema>
export type PappersCompanySuggestion = z.infer<typeof PappersCompanySuggestionSchema>

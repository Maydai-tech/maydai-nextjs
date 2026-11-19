import { z } from 'zod'
import {
  INDUSTRIES_LIST,
  getIndustryById,
  getIndustryLabel,
  getSubCategoryLabel,
} from '@/lib/constants/industries'

export const CONFIRM_COMPANY_PROFILE_TOOL_NAME = 'confirm_company_profile' as const
export const COMPANY_PROFILE_UNSET = 'NON_RENSEIGNE' as const

export type CompanyProfileFields = {
  name: string | null
  industry: string | null
  sub_category_id: string | null
  country: string | null
  street_address: string | null
  postal_code: string | null
  city: string | null
}

export type AccountProfileFallback = {
  company_name?: string | null
  industry?: string | null
  sub_category_id?: string | null
}

export type CompanyProfileSource = 'register' | 'account' | 'unset'

export type CompanyProfileSources = {
  name: CompanyProfileSource
  industry: CompanyProfileSource
  sub_category_id: CompanyProfileSource
  country: CompanyProfileSource
  street_address: CompanyProfileSource
  postal_code: CompanyProfileSource
  city: CompanyProfileSource
}

export type WelcomeCollectStep = 'industry' | 'sub_category' | 'country' | 'address' | 'confirm'

export const COMPANY_PROFILE_REQUIRED_FIELD_LABELS: Record<
  Exclude<keyof CompanyProfileFields, 'name'>,
  string
> = {
  industry: 'Secteur',
  sub_category_id: 'Sous-secteur',
  country: 'Pays',
  street_address: 'Rue',
  postal_code: 'Code postal',
  city: 'Ville',
}

export type CompanyProfileUpdate = {
  is_confirmed: boolean
  industry: string | null
  sub_category_id: string | null
  country: string | null
  street_address: string | null
  postal_code: string | null
  city: string | null
}

export type CompanyProfileToolCallResponse = {
  type: 'TOOL_CALL'
  tool: typeof CONFIRM_COMPANY_PROFILE_TOOL_NAME
  profileConfirmed: true
  data: CompanyProfileUpdate
  savedProfile: CompanyProfileFields
}

export type CompanyProfileMessageResponse = {
  type: 'MESSAGE'
  content: string
}

export type CompanyProfileChatApiResponse =
  | CompanyProfileMessageResponse
  | CompanyProfileToolCallResponse

function trimToNull(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}

export function displayCompanyProfileValue(raw: string | null | undefined): string {
  return trimToNull(raw) ?? COMPANY_PROFILE_UNSET
}

export function normalizeCompanyProfileField(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.toUpperCase() === COMPANY_PROFILE_UNSET) return null
  return trimmed
}

export function findIndustryFamily(industry: string | null) {
  const stored = trimToNull(industry)
  if (!stored) return undefined
  return (
    getIndustryById(stored) ||
    INDUSTRIES_LIST.find((item) => item.label.toLowerCase() === stored.toLowerCase())
  )
}

/** Mappe un libellé catalogue vers l’id secteur ; laisse le texte libre sinon. */
export function resolveIndustryForStorage(raw: string | null): string | null {
  if (!raw) return null
  const family = findIndustryFamily(raw)
  if (family) return family.id
  return trimToNull(raw)
}

export function resolveSubCategoryForStorage(
  industry: string | null,
  raw: string | null
): string | null {
  const value = trimToNull(raw)
  if (!value) return null
  const family = findIndustryFamily(industry)
  if (!family) return value
  const byId = family.subCategories.find((item) => item.id === value)
  if (byId) return byId.id
  const lowered = value.toLowerCase()
  const byLabel = family.subCategories.find((item) => item.label.toLowerCase() === lowered)
  if (byLabel) return byLabel.id
  return value
}

export function formatIndustryForContext(industry: string | null): string {
  const stored = trimToNull(industry)
  if (!stored) return COMPANY_PROFILE_UNSET
  return getIndustryLabel(stored) || stored
}

export function formatSubCategoryForContext(
  industry: string | null,
  subCategoryId: string | null
): string {
  const stored = trimToNull(subCategoryId)
  if (!stored) return COMPANY_PROFILE_UNSET
  const industryId = findIndustryFamily(industry)?.id || industry
  if (industryId) {
    const label = getSubCategoryLabel(industryId, stored)
    if (label) return label
  }
  return stored
}

export function formatAddressForContext(profile: CompanyProfileFields): string {
  const parts = [
    trimToNull(profile.street_address),
    trimToNull(profile.postal_code),
    trimToNull(profile.city),
  ].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(', ') : COMPANY_PROFILE_UNSET
}

function formatRecapLine(
  label: string,
  value: string,
  source: CompanyProfileSource | undefined
): string {
  const suffix = source === 'account' ? ' (proposé depuis votre compte)' : ''
  return `• ${label} : ${value}${suffix}`
}

function recapDisplayValue(raw: string | null | undefined): string {
  return trimToNull(raw) ?? 'à compléter'
}

function hasAccountProposedValues(sources?: CompanyProfileSources): boolean {
  if (!sources) return false
  return Object.values(sources).some((source) => source === 'account')
}

function recapFormattedOrTodo(formatted: string): string {
  return formatted === COMPANY_PROFILE_UNSET ? 'à compléter' : formatted
}

export function buildCompanyProfileSystemMessage(
  profile: CompanyProfileFields,
  sources?: CompanyProfileSources
): string {
  const accountHint = sources
    ? `\nLes valeurs marquées « compte » viennent du profil utilisateur et doivent être confirmées avant d’être écrites sur le registre.`
    : ''

  return `PROFIL ENTREPRISE (registre à confirmer — repli compte si le registre est vide)
- Nom : ${displayCompanyProfileValue(profile.name)}${sources?.name === 'account' ? ' [compte]' : ''}
- Secteur : ${formatIndustryForContext(profile.industry)}${sources?.industry === 'account' ? ' [compte]' : ''}
- Sous-secteur : ${formatSubCategoryForContext(profile.industry, profile.sub_category_id)}${sources?.sub_category_id === 'account' ? ' [compte]' : ''}
- Pays : ${displayCompanyProfileValue(profile.country)}
- Rue : ${displayCompanyProfileValue(profile.street_address)}
- Code postal : ${displayCompanyProfileValue(profile.postal_code)}
- Ville : ${displayCompanyProfileValue(profile.city)}
${accountHint}

Consigne : complète uniquement les champs marqués ${COMPANY_PROFILE_UNSET}, ou corrige une valeur si l’utilisateur le demande. N’invente rien.
Interdiction d’appeler ${CONFIRM_COMPANY_PROFILE_TOOL_NAME} tant que secteur, sous-secteur, pays, rue, code postal et ville ne sont pas TOUS renseignés (adresse exacte obligatoire, AI Act).
Appelle le tool seulement lorsque l’utilisateur a confirmé le profil (is_confirmed=true). Recopie les valeurs déjà connues. N’envoie jamais le littéral ${COMPANY_PROFILE_UNSET} dans le tool : utilise une chaîne vide si l’information manque encore.`
}

export function buildWelcomeRecapMessage(
  profile: CompanyProfileFields,
  sources?: CompanyProfileSources
): string {
  const complete = isCompanyProfileComplete(profile)
  const missing = getMissingCompanyProfileFields(profile)
  const accountFallback = hasAccountProposedValues(sources)

  const intro =
    'Bonjour, je suis l’assistant MaydAI. Je vais vous aider à confirmer le profil de votre organisation avant d’attaquer votre cas d’usage.'

  let contextLine: string
  if (accountFallback) {
    contextLine =
      'Voici les informations du registre. Les lignes marquées « proposées depuis votre compte » sont à valider :'
  } else if (complete) {
    contextLine = 'Voici les informations déjà présentes sur le registre :'
  } else {
    contextLine = 'Voici les informations du registre. Les champs « à compléter » restent à renseigner :'
  }

  const recap = [
    formatRecapLine('Nom', recapDisplayValue(profile.name), sources?.name),
    formatRecapLine(
      'Secteur',
      recapFormattedOrTodo(formatIndustryForContext(profile.industry)),
      sources?.industry
    ),
    formatRecapLine(
      'Sous-secteur',
      recapFormattedOrTodo(formatSubCategoryForContext(profile.industry, profile.sub_category_id)),
      sources?.sub_category_id
    ),
    formatRecapLine('Pays', recapDisplayValue(profile.country), sources?.country),
    formatRecapLine('Rue', recapDisplayValue(profile.street_address), sources?.street_address),
    formatRecapLine('Code postal', recapDisplayValue(profile.postal_code), sources?.postal_code),
    formatRecapLine('Ville', recapDisplayValue(profile.city), sources?.city),
  ].join('\n')

  const footer = complete
    ? 'Tout est renseigné. Vérifiez ces informations, puis validez pour les enregistrer sur le registre. Elles seront réutilisées pour les prochains cas d’usage.'
    : `Il reste à compléter : ${missing.join(', ')}. Utilisez les boutons dès qu’ils sont proposés. L’adresse exacte (rue, code postal, ville) est obligatoire pour valider cette étape.`

  return `${intro}

${contextLine}

${recap}

${footer}`
}

export function buildGuidedDraftSystemMessage(profile: CompanyProfileFields): string {
  return `ÉTAPE 2 — CADRAGE DU CAS D’USAGE
Le profil de l’organisation est DÉJÀ validé. Interdiction de redemander, de réafficher ou de qualifier en ${COMPANY_PROFILE_UNSET} le nom, le secteur, le sous-secteur, le pays ou l’adresse.

Profil confirmé (contexte uniquement, ne pas collecter) :
- Nom : ${displayCompanyProfileValue(profile.name)}
- Secteur : ${formatIndustryForContext(profile.industry)}
- Sous-secteur : ${formatSubCategoryForContext(profile.industry, profile.sub_category_id)}
- Pays : ${displayCompanyProfileValue(profile.country)}
- Adresse : ${formatAddressForContext(profile)}

Ta seule mission : collecter le brouillon du cas d’usage. Commence TOUJOURS par le nom du système / cas d’usage IA (50 caractères max). Ensuite seulement : description, phase de déploiement, date de mise en service, service responsable, catégorie d’IA, type de système, pays de déploiement, partenaire technologique, modèle.`
}

export function buildConfirmCompanyProfileTool() {
  return {
    type: 'function' as const,
    function: {
      name: CONFIRM_COMPANY_PROFILE_TOOL_NAME,
      description:
        'Enregistre le profil entreprise confirmé (secteur, sous-secteur, pays, adresse) sur le registre. Ne pas appeler tant que l’utilisateur n’a pas validé les informations.',
      strict: true,
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: [
          'is_confirmed',
          'industry',
          'sub_category_id',
          'country',
          'street_address',
          'postal_code',
          'city',
        ],
        properties: {
          is_confirmed: {
            type: 'boolean',
            description: 'true uniquement si l’utilisateur a confirmé le profil.',
          },
          industry: {
            type: 'string',
            description: 'Secteur d’activité (id catalogue ou libellé). Chaîne vide si inconnu.',
          },
          sub_category_id: {
            type: 'string',
            description: 'Sous-secteur (id catalogue ou libellé). Chaîne vide si inconnu.',
          },
          country: {
            type: 'string',
            description: 'Pays d’établissement, nom en français (ex. France). Chaîne vide si inconnu.',
          },
          street_address: {
            type: 'string',
            description: 'Numéro et rue. Chaîne vide si inconnu.',
          },
          postal_code: {
            type: 'string',
            description: 'Code postal. Chaîne vide si inconnu.',
          },
          city: {
            type: 'string',
            description: 'Ville. Chaîne vide si inconnu.',
          },
        },
      },
    },
  }
}

export function companyProfileUpdateSchema() {
  return z.object({
    is_confirmed: z.boolean(),
    industry: z.string(),
    sub_category_id: z.string(),
    country: z.string(),
    street_address: z.string(),
    postal_code: z.string(),
    city: z.string(),
  })
}

export function parseCompanyProfileUpdate(raw: unknown): CompanyProfileUpdate | null {
  const parsed = companyProfileUpdateSchema().safeParse(raw)
  if (!parsed.success) return null

  const industry = resolveIndustryForStorage(normalizeCompanyProfileField(parsed.data.industry))

  return {
    is_confirmed: parsed.data.is_confirmed,
    industry,
    sub_category_id: resolveSubCategoryForStorage(
      industry,
      normalizeCompanyProfileField(parsed.data.sub_category_id)
    ),
    country: normalizeCompanyProfileField(parsed.data.country),
    street_address: normalizeCompanyProfileField(parsed.data.street_address),
    postal_code: normalizeCompanyProfileField(parsed.data.postal_code),
    city: normalizeCompanyProfileField(parsed.data.city),
  }
}

export function isCompanyProfileFieldMissing(raw: string | null | undefined): boolean {
  return !trimToNull(raw)
}

export function mergeCompanyProfile(
  current: CompanyProfileFields,
  update: CompanyProfileUpdate
): CompanyProfileFields {
  return {
    name: current.name,
    industry: update.industry ?? current.industry,
    sub_category_id: update.sub_category_id ?? current.sub_category_id,
    country: update.country ?? current.country,
    street_address: update.street_address ?? current.street_address,
    postal_code: update.postal_code ?? current.postal_code,
    city: update.city ?? current.city,
  }
}

function pickRegisterOrAccount(
  registerValue: string | null | undefined,
  accountValue: string | null | undefined
): { value: string | null; source: CompanyProfileSource } {
  const fromRegister = trimToNull(registerValue)
  if (fromRegister) return { value: fromRegister, source: 'register' }
  const fromAccount = trimToNull(accountValue)
  if (fromAccount) return { value: fromAccount, source: 'account' }
  return { value: null, source: 'unset' }
}

function accountSubCategoryFitsIndustry(
  industry: string | null,
  subCategoryId: string | null
): string | null {
  const resolved = resolveSubCategoryForStorage(industry, subCategoryId)
  if (!resolved) return null
  const family = findIndustryFamily(industry)
  if (!family) return resolved
  return family.subCategories.some((item) => item.id === resolved) ? resolved : null
}

export function mergeRegisterWithAccountFallback(
  register: CompanyProfileFields,
  account?: AccountProfileFallback | null
): { profile: CompanyProfileFields; sources: CompanyProfileSources } {
  const name = pickRegisterOrAccount(register.name, account?.company_name)
  const industryPick = pickRegisterOrAccount(register.industry, account?.industry)
  const industryValue = resolveIndustryForStorage(industryPick.value)

  const registerSub = trimToNull(register.sub_category_id)
  let subValue: string | null = registerSub
  let subSource: CompanyProfileSource = registerSub ? 'register' : 'unset'
  if (!registerSub) {
    const fromAccount = accountSubCategoryFitsIndustry(
      industryValue,
      normalizeCompanyProfileField(account?.sub_category_id)
    )
    if (fromAccount) {
      subValue = fromAccount
      subSource = 'account'
    }
  }

  const country = pickRegisterOrAccount(register.country, null)
  const street = pickRegisterOrAccount(register.street_address, null)
  const postal = pickRegisterOrAccount(register.postal_code, null)
  const city = pickRegisterOrAccount(register.city, null)

  return {
    profile: {
      name: name.value,
      industry: industryValue,
      sub_category_id: subValue,
      country: country.value,
      street_address: street.value,
      postal_code: postal.value,
      city: city.value,
    },
    sources: {
      name: name.source,
      industry: industryPick.source,
      sub_category_id: subSource,
      country: country.source,
      street_address: street.source,
      postal_code: postal.source,
      city: city.source,
    },
  }
}

export function getMissingCompanyProfileFields(profile: CompanyProfileFields): string[] {
  const keys: Array<Exclude<keyof CompanyProfileFields, 'name'>> = [
    'industry',
    'sub_category_id',
    'country',
    'street_address',
    'postal_code',
    'city',
  ]
  return keys
    .filter((key) => isCompanyProfileFieldMissing(profile[key]))
    .map((key) => COMPANY_PROFILE_REQUIRED_FIELD_LABELS[key])
}

export function isCompanyProfileComplete(profile: CompanyProfileFields): boolean {
  return getMissingCompanyProfileFields(profile).length === 0
}

export function getWelcomeCollectStep(profile: CompanyProfileFields): WelcomeCollectStep {
  if (isCompanyProfileFieldMissing(profile.industry)) return 'industry'
  if (isCompanyProfileFieldMissing(profile.sub_category_id)) return 'sub_category'
  if (isCompanyProfileFieldMissing(profile.country)) return 'country'
  if (
    isCompanyProfileFieldMissing(profile.street_address) ||
    isCompanyProfileFieldMissing(profile.postal_code) ||
    isCompanyProfileFieldMissing(profile.city)
  ) {
    return 'address'
  }
  return 'confirm'
}

export function buildCompanyProfileConfirmationMessage(profile: CompanyProfileFields): string {
  return `Je confirme le profil du registre :
- Secteur : ${formatIndustryForContext(profile.industry)}
- Sous-secteur : ${formatSubCategoryForContext(profile.industry, profile.sub_category_id)}
- Pays : ${displayCompanyProfileValue(profile.country)}
- Rue : ${displayCompanyProfileValue(profile.street_address)}
- Code postal : ${displayCompanyProfileValue(profile.postal_code)}
- Ville : ${displayCompanyProfileValue(profile.city)}`
}

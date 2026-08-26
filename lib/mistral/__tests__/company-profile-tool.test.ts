import {
  COMPANY_PROFILE_UNSET,
  CONFIRM_COMPANY_PROFILE_TOOL_NAME,
  buildCompanyProfileSystemMessage,
  buildConfirmCompanyProfileTool,
  buildGuidedDraftSystemMessage,
  buildWelcomeRecapMessage,
  getMissingCompanyProfileFields,
  getWelcomeCollectStep,
  isCompanyProfileComplete,
  mergeRegisterWithAccountFallback,
  parseCompanyProfileUpdate,
  resolveIndustryForStorage,
} from '@/lib/mistral/company-profile-tool'

describe('confirm_company_profile tool schema', () => {
  test('expose is_confirmed et les champs d’adresse', () => {
    const tool = buildConfirmCompanyProfileTool()
    expect(tool.function.name).toBe(CONFIRM_COMPANY_PROFILE_TOOL_NAME)
    const params = tool.function.parameters as { required: string[] }
    expect(params.required).toEqual([
      'is_confirmed',
      'industry',
      'sub_category_id',
      'country',
      'street_address',
      'postal_code',
      'city',
    ])
  })

  test('parseCompanyProfileUpdate normalise NON_RENSEIGNE et les vides', () => {
    const data = parseCompanyProfileUpdate({
      is_confirmed: true,
      industry: 'Tech, Data & Télécoms',
      sub_category_id: 'IA, Data Science & Big Data',
      country: 'France',
      street_address: '  ',
      postal_code: COMPANY_PROFILE_UNSET,
      city: 'Paris',
    })
    expect(data).toEqual({
      is_confirmed: true,
      industry: 'tech_data',
      sub_category_id: 'ai_data',
      country: 'France',
      street_address: null,
      postal_code: null,
      city: 'Paris',
    })
  })

  test('injecte NON_RENSEIGNE dans le contexte si un champ est vide', () => {
    const message = buildCompanyProfileSystemMessage({
      name: 'MaydAI',
      industry: null,
      sub_category_id: null,
      country: '',
      street_address: null,
      postal_code: null,
      city: null,
    })
    expect(message).toContain('Nom : MaydAI')
    expect(message).toContain(`Secteur : ${COMPANY_PROFILE_UNSET}`)
    expect(message).toContain(`Sous-secteur : ${COMPANY_PROFILE_UNSET}`)
    expect(message).toContain(`Pays : ${COMPANY_PROFILE_UNSET}`)
  })
})

describe('resolveIndustryForStorage', () => {
  test('conserve un id catalogue', () => {
    expect(resolveIndustryForStorage('tech_data')).toBe('tech_data')
  })

  test('mappe un libellé catalogue vers l’id', () => {
    expect(resolveIndustryForStorage('Tech, Data & Télécoms')).toBe('tech_data')
  })
})

describe('buildGuidedDraftSystemMessage', () => {
  test('interdit de redemander le profil et impose le nom du cas d’usage', () => {
    const message = buildGuidedDraftSystemMessage({
      name: 'Registre MaydAI SAS',
      industry: 'tech_data',
      sub_category_id: 'ai_data',
      country: 'France',
      street_address: '10 rue de la Paix',
      postal_code: '75002',
      city: 'Paris',
    })
    expect(message).toContain('DÉJÀ validé')
    expect(message).toContain('Registre MaydAI SAS')
    expect(message).toContain('IA, Data Science & Big Data')
    expect(message).toContain('nom du système')
    expect(message).not.toMatch(new RegExp(`Nom : ${COMPANY_PROFILE_UNSET}`))
  })
})

describe('mergeRegisterWithAccountFallback', () => {
  const emptyRegister = {
    name: null,
    industry: null,
    sub_category_id: null,
    country: null,
    street_address: null,
    postal_code: null,
    city: null,
  }

  test('reprend nom, secteur et sous-secteur du compte si le registre est vide', () => {
    const { profile, sources } = mergeRegisterWithAccountFallback(emptyRegister, {
      company_name: 'MaydAI SAS',
      industry: 'tech_data',
      sub_category_id: 'ai_data',
    })
    expect(profile.name).toBe('MaydAI SAS')
    expect(profile.industry).toBe('tech_data')
    expect(profile.sub_category_id).toBe('ai_data')
    expect(sources.name).toBe('account')
    expect(sources.industry).toBe('account')
    expect(sources.sub_category_id).toBe('account')
    expect(sources.street_address).toBe('unset')
  })

  test('ne remplace jamais une valeur déjà présente sur le registre', () => {
    const { profile, sources } = mergeRegisterWithAccountFallback(
      {
        name: 'Registre filiale',
        industry: 'health',
        sub_category_id: 'esante',
        country: 'France',
        street_address: null,
        postal_code: null,
        city: 'Paris',
      },
      {
        company_name: 'MaydAI SAS',
        industry: 'tech_data',
        sub_category_id: 'ai_data',
      }
    )
    expect(profile.name).toBe('Registre filiale')
    expect(profile.industry).toBe('health')
    expect(profile.sub_category_id).toBe('esante')
    expect(sources.industry).toBe('register')
    expect(profile.city).toBe('Paris')
  })

  test('ignore un sous-secteur compte qui ne correspond pas au secteur registre', () => {
    const { profile, sources } = mergeRegisterWithAccountFallback(
      {
        ...emptyRegister,
        name: 'Filiale',
        industry: 'health',
      },
      {
        industry: 'tech_data',
        sub_category_id: 'ai_data',
      }
    )
    expect(profile.industry).toBe('health')
    expect(profile.sub_category_id).toBeNull()
    expect(sources.sub_category_id).toBe('unset')
  })
})

describe('complétude du profil registre', () => {
  const complete = {
    name: 'MaydAI',
    industry: 'tech_data',
    sub_category_id: 'ai_data',
    country: 'France',
    street_address: '10 rue de la Paix',
    postal_code: '75002',
    city: 'Paris',
  }

  test('bloque tant que l’adresse n’est pas exacte', () => {
    expect(isCompanyProfileComplete({ ...complete, street_address: null })).toBe(false)
    expect(getMissingCompanyProfileFields({ ...complete, postal_code: null, city: null })).toEqual([
      'Code postal',
      'Ville',
    ])
  })

  test('est complet seulement avec secteur, sous-secteur, pays et adresse', () => {
    expect(isCompanyProfileComplete(complete)).toBe(true)
    expect(getWelcomeCollectStep(complete)).toBe('confirm')
    expect(getWelcomeCollectStep({ ...complete, country: null })).toBe('country')
    expect(getWelcomeCollectStep({ ...complete, sub_category_id: null, country: null })).toBe(
      'sub_category'
    )
  })
})

describe('buildWelcomeRecapMessage', () => {
  const complete = {
    name: 'Registre MaydAI SAS',
    industry: 'tech_data',
    sub_category_id: 'saas',
    country: 'France',
    street_address: '47 rue Erlanger',
    postal_code: '75016',
    city: 'Paris',
  }

  test('n’évoque pas NON_RENSEIGNE ni les champs vides si le profil est complet', () => {
    const message = buildWelcomeRecapMessage(complete)
    expect(message).toContain('47 rue Erlanger')
    expect(message).toContain('Tout est renseigné')
    expect(message).not.toContain(COMPANY_PROFILE_UNSET)
    expect(message).not.toContain('Si un champ était vide')
    expect(message).not.toContain('doivent être complétés')
  })

  test('liste seulement les champs manquants, sans jargonner NON_RENSEIGNE', () => {
    const message = buildWelcomeRecapMessage({
      ...complete,
      street_address: null,
      postal_code: null,
    })
    expect(message).toContain('Il reste à compléter : Rue, Code postal')
    expect(message).toContain('à compléter')
    expect(message).not.toContain(COMPANY_PROFILE_UNSET)
  })
})

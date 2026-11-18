import { mapPappersResults, searchCompanies, toPappersQuery } from '../companySearch'

describe('toPappersQuery', () => {
  test('cherche un SIRET par son SIREN et nettoie les espaces des numéros', () => {
    expect(toPappersQuery('799 352 682 00041')).toBe('799352682')
    expect(toPappersQuery(' 799 352 682 ')).toBe('799352682')
    expect(toPappersQuery('  Welcome to the jungle ')).toBe('Welcome to the jungle')
  })
})

describe('mapPappersResults', () => {
  test('exclut les entreprises cessées ou incomplètes et mappe le siège', () => {
    expect(mapPappersResults([
      { siren: '799352682', nom_entreprise: ' WELCOME TO THE JUNGLE ', libelle_code_naf: 'Édition de logiciels', siege: { ville: 'Paris', code_postal: '75011' } },
      { siren: '123456789', nom_entreprise: 'CESSÉE', entreprise_cessee: 1 },
      { siren: '12', nom_entreprise: 'SIREN INVALIDE' },
    ])).toEqual([{ siren: '799352682', name: 'WELCOME TO THE JUNGLE', city: 'Paris', postal_code: '75011', activity: 'Édition de logiciels' }])
  })
})

describe('searchCompanies', () => {
  const env = process.env
  afterEach(() => { process.env = env })

  test('ignore les recherches trop courtes', async () => {
    expect(await searchCompanies(' a ')).toEqual([])
  })

  test('renvoie les entreprises fictives en mode bouchon', async () => {
    process.env = { ...env, PAPPERS_MOCK_MODE: 'true' }
    const results = await searchCompanies('recette')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((company) => company.name.startsWith('RECETTE'))).toBe(true)
  })

  test('échoue clairement sans clé Pappers', async () => {
    process.env = { ...env, PAPPERS_MOCK_MODE: undefined, PAPPERS_API_KEY: undefined }
    await expect(searchCompanies('jungle')).rejects.toThrow('PAPPERS_API_KEY')
  })
})

/**
 * Crash test local du service Pappers (mock Zubrow + appel réel si la clé est présente).
 *
 * Commande :
 *   pnpm debug:pappers
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
import { mapPappersSearchPayload, searchCompaniesPappers } from '../lib/services/pappersService'
import { validateSIREN } from '../lib/validation/siren'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

function printSuggestion(label: string, company: {
  siren: string
  siret_siege?: string | null
  nom_entreprise: string
  code_naf?: string | null
  libelle_code_naf?: string | null
  entreprise_cessee: boolean
  is_mock: boolean
}): void {
  console.log(
    [
      label,
      `nom=${company.nom_entreprise}`,
      `siren=${company.siren}`,
      `siret=${company.siret_siege ?? '—'}`,
      `naf=${company.code_naf ?? '—'}`,
      `libelle=${company.libelle_code_naf ?? '—'}`,
      `cessee=${company.entreprise_cessee}`,
      `mock=${company.is_mock}`,
    ].join(' | ')
  )
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

async function main(): Promise<void> {
  const originalFetch = globalThis.fetch
  let networkCalled = false
  globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
    networkCalled = true
    return originalFetch(...args)
  }) as typeof fetch

  let shortQuery: Awaited<ReturnType<typeof searchCompaniesPappers>>
  try {
    shortQuery = await searchCompaniesPappers('a')
  } finally {
    globalThis.fetch = originalFetch
  }

  assert(
    !networkCalled && shortQuery.length === 0,
    `Test A échoué : searchCompaniesPappers('a') doit renvoyer [] sans réseau (len=${shortQuery.length}, réseau=${networkCalled})`
  )
  console.log('[debug-pappers] Test A OK — requête courte renvoyée [] sans réseau')

  const filtered = mapPappersSearchPayload({
    resultats: [
      {
        siren: '123456782',
        nom_entreprise: 'ACTIVE SANDBOX',
        entreprise_cessee: 0,
      },
      {
        siren: '111111111',
        nom_entreprise: 'RADIEE SANDBOX',
        entreprise_cessee: 1,
      },
    ],
  })
  assert(
    filtered.length === 1 &&
      filtered[0]?.siren === '123456782' &&
      filtered[0]?.entreprise_cessee === false &&
      !filtered.some((item) => item.siren === '111111111'),
    'Test B échoué : l’entreprise radiée (entreprise_cessee=1) doit être exclue'
  )
  console.log('[debug-pappers] Test B OK — entreprise radiée exclue, fiche active conservée')

  const mockResults = await searchCompaniesPappers('Zubrow')
  const mock = mockResults[0]

  if (!mock || mockResults.length !== 1 || mock.is_mock !== true) {
    throw new Error('Le mock Zubrow n’a pas été renvoyé')
  }

  if (!validateSIREN(mock.siren)) {
    throw new Error(`validateSIREN refuse le SIREN sandbox ${mock.siren}`)
  }

  console.log('[debug-pappers] Mock Zubrow accepté par validateSIREN')
  printSuggestion('[debug-pappers][mock]', mock)

  if (!process.env.PAPPERS_API_KEY?.trim()) {
    throw new Error('Test C échoué : PAPPERS_API_KEY absente, appel live impossible')
  }

  if (process.env.PAPPERS_MOCK_MODE === 'true') {
    throw new Error('Test C échoué : PAPPERS_MOCK_MODE=true court-circuite l’appel live')
  }

  const liveResults = await searchCompaniesPappers('Mistral AI')
  console.log(`[debug-pappers] Résultats « Mistral AI » : ${liveResults.length}`)
  assert(liveResults.length > 0, 'Test C échoué : l’appel live « Mistral AI » n’a renvoyé aucun SIREN')

  for (const company of liveResults) {
    if (company.entreprise_cessee) {
      throw new Error(`Entreprise cessée renvoyée par le service : ${company.siren}`)
    }
    assert(
      validateSIREN(company.siren) === true,
      `Test C échoué : validateSIREN refuse le SIREN live ${company.siren}`
    )
    printSuggestion('[debug-pappers][live]', company)
  }
  console.log('[debug-pappers] Test C OK — tous les SIREN live passent validateSIREN')
}

main().catch((error: unknown) => {
  console.error('[debug-pappers]', error)
  process.exit(1)
})

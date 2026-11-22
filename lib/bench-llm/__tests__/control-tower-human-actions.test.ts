/** @jest-environment node */

const mockBatchUpdateValues = jest.fn()
const mockSpreadsheetsGet = jest.fn()
const mockValuesGet = jest.fn()

jest.mock('@/lib/google-drive', () => ({
  getSheetsClient: () => ({
    spreadsheets: {
      get: (...args: unknown[]) => mockSpreadsheetsGet(...args),
      values: {
        get: (...args: unknown[]) => mockValuesGet(...args),
        batchUpdate: (...args: unknown[]) => mockBatchUpdateValues(...args),
      },
    },
  }),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const builder = {
        select: () => builder,
        order: () => builder,
        not: () => builder,
        is: () => builder,
        range: async () => ({ data: [], error: null }),
      }
      return builder
    },
  }),
}))

import { columnIndexToA1 } from '@/lib/bench-llm/control-tower-headers'
import { syncControlTowerDerivedColumns } from '@/lib/bench-llm/control-tower-csv'
import {
  HUMAN_ACTION_HEADER,
  HUMAN_ACTION_RULES,
  HUMAN_ACTION_SEPARATOR,
  humanActionFormula,
  humanActionUnprotectedBands,
  humanActionsForRow,
  humanActionsTabFormula,
  modeEmploiGuide,
  planModeEmploi,
  unprotectedRangeA1,
  type HumanActionInput,
} from '@/lib/bench-llm/control-tower-human-actions'

const EMPTY: HumanActionInput = {
  statutMaydai: 'Questionnaire',
  lineType: '',
  taxonomyValidated: '',
  hermesAction: '',
  ficheStatus: '',
  legalValidation: '',
  readyForImport: '',
  importResult: '',
  llmStatus: '',
  declaredUseCases: '',
}

function row(overrides: Partial<HumanActionInput>): HumanActionInput {
  return { ...EMPTY, ...overrides }
}

function assertNoColumnLetter(formula: string): void {
  expect(formula).not.toMatch(/\$?[A-Z]{1,3}\$?\d+/)
}

const SHEET_HEADERS = [
  'ID Supabase',
  'Statut MaydAI',
  'Nom de la technologie',
  'Nom du LLM (Standard Supabase)',
  'Nom du LLM (Standard Hermes/Fichier)',
  "Proposé à l'utilisateur",
  "Cas d'usage déclarés",
  'Type de ligne',
  'Précision',
  'Ligne de référence (ID)',
  'Fusionner avec (ID)',
  'Modèle de base (ID)',
  'Taxonomie validée',
  'Statut LLM',
  'Date de lancement',
  'Date de dépréciation',
  'Date de retrait',
  'Remplacé par (ID)',
  'Source du statut',
  'Dernière vérification',
  'Statut Fiche Technique',
  'Action requise par Hermes',
  "Date de priorisation de l'action",
  'Lien du dossier Drive cible',
  'Lien du fichier Markdown généré',
  'Validation juridique',
  'Prêt pour import',
  "Résultat de l'import",
  'Date de dernière mise à jour (Supabase)',
]

describe('actions humaines', () => {
  test.each([
    ['A1', row({ lineType: 'Modèle', hermesAction: 'CREATE' }), 'Valider la taxonomie'],
    ['A2', row({ ficheStatus: 'Générée', legalValidation: 'À valider' }), 'Valider la fiche'],
    ['A3', row({ legalValidation: 'V2', ficheStatus: 'Manquante', importResult: 'Importé' }), 'Requalifier la validation juridique'],
    ['A4', row({ legalValidation: 'Validée r3', readyForImport: 'Non', ficheStatus: 'Manquante' }), 'Marquer prêt pour import'],
    ['A5', row({ importResult: 'Échec : réseau', ficheStatus: 'Manquante' }), "Traiter l'échec d'import"],
    ['A6', row({ ficheStatus: 'Erreur : Pas de System Card publiée', importResult: 'Erreur : Pas de System Card publiée' }), "Décider de la suite de l'audit"],
    ['A7', row({ llmStatus: 'Déprécié', declaredUseCases: '2', ficheStatus: 'Manquante' }), "Suivre la migration des cas d'usage"],
    ['A8', row({ taxonomyValidated: 'Oui', ficheStatus: 'Manquante' }), 'Appliquer la taxonomie en base'],
    ['A9', row({ licenseClass: 'Poids ouverts, licence à qualifier', ficheStatus: 'Manquante' }), 'Faire arbitrer la licence'],
  ])('%s produit une seule action', (_code, input, label) => {
    expect(humanActionsForRow(input)).toBe(label)
  })

  test('une ligne Catalogue n’a aucune action, même si toutes les conditions sont remplies', () => {
    expect(humanActionsForRow(row({
      statutMaydai: 'Catalogue',
      lineType: 'Modèle',
      ficheStatus: 'Générée',
      legalValidation: 'V2',
      readyForImport: 'Non',
      importResult: 'Échec : réseau',
      llmStatus: 'Retiré',
      declaredUseCases: '4',
    }))).toBe('')
  })

  test('regroupe les actions dans l’ordre, séparées par « | »', () => {
    expect(humanActionsForRow(row({
      lineType: 'Modèle',
      hermesAction: 'NONE',
      ficheStatus: 'Générée',
    }))).toBe(`Valider la taxonomie${HUMAN_ACTION_SEPARATOR}Valider la fiche`)

    expect(humanActionsForRow(row({
      lineType: 'Variante',
      legalValidation: 'Validée r9',
      readyForImport: 'Non',
      importResult: 'Erreur : fichier absent',
      ficheStatus: 'Erreur : Pas de System Card publiée',
      llmStatus: 'Retiré',
      declaredUseCases: '1',
    }))).toBe([
      'Valider la taxonomie',
      'Requalifier la validation juridique',
      'Marquer prêt pour import',
      "Traiter l'échec d'import",
      "Décider de la suite de l'audit",
      "Suivre la migration des cas d'usage",
    ].join(HUMAN_ACTION_SEPARATOR))
  })

  test('Appliquée le 2026-11-20 ne déclenche ni A1 ni A8', () => {
    expect(humanActionsForRow(row({
      lineType: 'Modèle',
      hermesAction: 'CREATE',
      taxonomyValidated: 'Appliquée le 2026-11-20',
    }))).toBe('')
  })

  test('retire l’action dès que la personne a fait le nécessaire', () => {
    expect(humanActionsForRow(row({
      lineType: 'Modèle',
      taxonomyValidated: 'Oui',
    }))).toBe('Appliquer la taxonomie en base')
    expect(humanActionsForRow(row({
      lineType: 'Modèle',
      hermesAction: 'CLASSER',
    }))).toBe('')
    expect(humanActionsForRow(row({
      legalValidation: 'Validée r3',
      readyForImport: 'Déjà importé',
      ficheStatus: 'Manquante',
    }))).toBe('')
    expect(humanActionsForRow(row({
      legalValidation: 'Validée r1',
      readyForImport: 'oui',
      ficheStatus: 'Manquante',
    }))).toBe('')
    expect(humanActionsForRow(row({
      llmStatus: 'Déprécié',
      declaredUseCases: '0',
    }))).toBe('')
  })

  test('la formule retrouve les colonnes par en-tête et survit au tri', () => {
    const formula = humanActionFormula()
    expect(formula.startsWith('=LET(')).toBe(true)
    expect(formula).toContain('ROW()')
    expect(formula).toContain('MATCH(name, $1:$1, 0)')
    for (const header of [
      'Statut MaydAI',
      'Type de ligne',
      'Taxonomie validée',
      'Action requise par Hermes',
      'Statut Fiche Technique',
      'Validation juridique',
      'Prêt pour import',
      "Résultat de l'import",
      'Statut LLM',
      "Cas d'usage déclarés",
      'Type de modèle',
    ]) {
      expect(formula).toContain(`"${header}"`)
    }
    const labels = HUMAN_ACTION_RULES.map((rule) => rule.label)
    let cursor = 0
    for (const label of labels) {
      const at = formula.indexOf(label, cursor)
      expect(at).toBeGreaterThanOrEqual(0)
      cursor = at + label.length
    }
    assertNoColumnLetter(formula)
    expect(formula).not.toMatch(/\$?[A-Z]{1,3}\d+/)
    expect(formula.match(/ROW\(\)/g)?.length).toBe(1)
  })

  test('les bandes éditables suivent les en-têtes après insertion', () => {
    const headers = SHEET_HEADERS.slice()
    headers.splice(headers.indexOf('Validation juridique'), 0, HUMAN_ACTION_HEADER)
    const bands = humanActionUnprotectedBands(headers)
    expect(bands.map((item) => unprotectedRangeA1(item, 1141))).toEqual([
      'H2:L1141',
      'N2:T1141',
      'U2:Y1141',
      'AA2:AC1141',
    ])
    const protectedHeaders = ['Taxonomie validée', HUMAN_ACTION_HEADER, 'Date de dernière mise à jour (Supabase)']
    for (const header of protectedHeaders) {
      const index = headers.indexOf(header)
      expect(bands.some((item) => index >= item.startColumn && index < item.endColumn)).toBe(false)
    }
    expect(columnIndexToA1(headers.indexOf(HUMAN_ACTION_HEADER))).toBe('Z')
    expect(columnIndexToA1(headers.indexOf('Date de dernière mise à jour (Supabase)'))).toBe('AD')
  })

  test('le bloc Licence des poids est éditable sans décaler les autres bandes', () => {
    const headers = [
      ...SHEET_HEADERS.slice(0, SHEET_HEADERS.indexOf('Validation juridique')),
      HUMAN_ACTION_HEADER,
      ...SHEET_HEADERS.slice(SHEET_HEADERS.indexOf('Validation juridique')),
      'Type de modèle',
      'Identifiant de la licence',
      'Source de la licence',
      'Exclusion UE',
    ]
    const bands = humanActionUnprotectedBands(headers)
    expect(bands.map((item) => unprotectedRangeA1(item, 1141))).toEqual([
      'H2:L1141',
      'N2:T1141',
      'U2:Y1141',
      'AA2:AC1141',
      'AE2:AH1141',
    ])
  })

  test('l’onglet et le mode d’emploi calculent par en-tête', () => {
    const tab = humanActionsTabFormula('MaydAI_LLM_Control_Tower')
    expect(tab).toContain('FILTER(')
    expect(tab).toContain('VSTACK(')
    expect(tab).toContain('SORT(')
    expect(tab).toContain('"Nom de la technologie"')
    expect(tab).toContain('"Nom du LLM (Standard Supabase)"')
    expect(tab).toContain(`"${HUMAN_ACTION_HEADER}"`)
    assertNoColumnLetter(tab)

    const plan = planModeEmploi([
      ['Tour de contrôle'],
      [],
      ['N°', 'Bloc', 'Colonne', 'Écrite par', 'Valeurs', 'Description', 'Ancienne colonne'],
      ['1', 'Identification', 'ID Supabase', 'Plateforme', '', '', ''],
      ['2', 'Contrôle et import', 'Validation juridique', 'Équipe juridique', '', '', ''],
      ['3', 'Contrôle et import', "Résultat de l'import", 'Plateforme', '', '', ''],
      [],
      ['', 'Fiches validées par l’équipe juridique', '=COUNTIF(MaydAI_LLM_Control_Tower!$Z$2:$Z$2009,"Validée*")'],
    ], 'MaydAI_LLM_Control_Tower')

    expect(plan.insertBeforeRow).toBe(5)
    expect(plan.newRow[2]).toBe(HUMAN_ACTION_HEADER)
    expect(plan.newRow[4]).toBe('calculée, ne pas modifier')
    expect(plan.renumber.map((item) => item.value)).toEqual(['1', '2', '3', '4'])
    expect(plan.validatedFormula?.formula).toContain('MATCH("Validation juridique"')
    expect(plan.validatedFormula?.formula).not.toContain('!$Z$')
    const guide = modeEmploiGuide('MaydAI_LLM_Control_Tower').flat().join('\n')
    for (const rule of HUMAN_ACTION_RULES) {
      expect(guide).toContain(rule.code)
      expect(guide).toContain(rule.label)
    }
    assertNoColumnLetter(plan.validatedFormula?.formula ?? '')
  })
})

describe('synchronisation des formules', () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    mockSpreadsheetsGet.mockResolvedValue({
      data: { sheets: [{ properties: { title: 'Tour', sheetId: 7, index: 0 } }] },
    })
  })

  afterEach(() => {
    if (previousUrl == null) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl
    if (previousKey == null) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey
  })

  test('réécrit la formule en USER_ENTERED et ne touche pas aux colonnes humaines', async () => {
    const headers = [
      'Validation juridique',
      'ID Supabase',
      'Statut MaydAI',
      'Nom de la technologie',
      'Nom du LLM (Standard Supabase)',
      'Nom du LLM (Standard Hermes/Fichier)',
      "Proposé à l'utilisateur",
      "Cas d'usage déclarés",
      'Statut Fiche Technique',
      HUMAN_ACTION_HEADER,
      'Prêt pour import',
      "Résultat de l'import",
      'Taxonomie validée',
    ]
    mockValuesGet.mockResolvedValue({
      data: {
        values: [
          headers,
          ['V2', 'model-1', 'Questionnaire', 'OpenAI', 'GPT-4o', 'gpt_4o', 'Oui', '2', 'Générée', 'ancienne formule', 'Déjà importé', 'Importé', ''],
          ['', 'model-2', 'Catalogue', 'Mistral', 'Mistral Large', 'mistral_large', 'Non', '0', 'Manquante', '', 'Non', '', 'Oui'],
        ],
      },
    })

    const result = await syncControlTowerDerivedColumns('sheet-id')

    expect(result.humanActionCells).toBe(2)
    expect(mockBatchUpdateValues).toHaveBeenCalledTimes(2)
    const raw = mockBatchUpdateValues.mock.calls[0][0].requestBody
    const formulas = mockBatchUpdateValues.mock.calls[1][0].requestBody
    expect(raw.valueInputOption).toBe('RAW')
    expect(formulas.valueInputOption).toBe('USER_ENTERED')
    const rawRanges = raw.data.map((entry: { range: string }) => entry.range)
    expect(rawRanges.some((range: string) => range.includes('!A'))).toBe(false)
    expect(rawRanges.some((range: string) => range.includes('!J'))).toBe(false)
    expect(rawRanges.some((range: string) => range.includes('!K'))).toBe(false)
    expect(rawRanges.some((range: string) => range.includes('!L'))).toBe(false)
    expect(rawRanges.some((range: string) => range.includes('!M'))).toBe(false)
    expect(formulas.data).toEqual([{
      range: "'Tour'!J2:J3",
      values: [[humanActionFormula()], [humanActionFormula()]],
    }])
    expect(formulas.data[0].values[0][0]).toBe(formulas.data[0].values[1][0])
  })

  test('n’écrit pas de formule tant que la colonne n’est pas insérée', async () => {
    const headers = [
      'ID Supabase',
      'Statut MaydAI',
      'Nom de la technologie',
      'Nom du LLM (Standard Supabase)',
      'Nom du LLM (Standard Hermes/Fichier)',
      "Proposé à l'utilisateur",
      "Cas d'usage déclarés",
      'Statut Fiche Technique',
      'Validation juridique',
    ]
    mockValuesGet.mockResolvedValue({
      data: { values: [headers, ['model-1', 'Questionnaire', 'OpenAI', 'GPT-4o', 'gpt_4o', 'Oui', '0', 'Manquante', 'V2']] },
    })

    const result = await syncControlTowerDerivedColumns('sheet-id')

    expect(result.humanActionCells).toBe(0)
    expect(mockBatchUpdateValues).toHaveBeenCalledTimes(1)
    expect(mockBatchUpdateValues.mock.calls[0][0].requestBody.valueInputOption).toBe('RAW')
    const ranges = mockBatchUpdateValues.mock.calls[0][0].requestBody.data.map((entry: { range: string }) => entry.range)
    expect(ranges.some((range: string) => range.startsWith("'Tour'!I"))).toBe(false)
  })
})

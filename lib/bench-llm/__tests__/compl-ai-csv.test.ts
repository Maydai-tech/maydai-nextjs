/** @jest-environment node */

import {
  buildComplAiWideCsv,
  formatComplAiLifecycleStatus,
  normalizeComplAiCsvRow,
  parseComplAiCsv,
  parseComplAiLifecycleStatus,
  parseComplAiModelCsvRow,
  parseCsvLine,
  summarizeComplAiCsvImport,
} from '../compl-ai-csv'

describe('parseCsvLine', () => {
  test('keeps commas inside quoted fields', () => {
    expect(
      parseCsvLine(
        'id,ChatGPT-4o Latest,OpenAI,llm,,"diversity_non_discrimination_fairness","Diversity, Non-discrimination & Fairness",GPAI+SR,reddit_bias',
      ),
    ).toEqual([
      'id',
      'ChatGPT-4o Latest',
      'OpenAI',
      'llm',
      '',
      'diversity_non_discrimination_fairness',
      'Diversity, Non-discrimination & Fairness',
      'GPAI+SR',
      'reddit_bias',
    ])
  })
})

describe('normalizeComplAiCsvRow', () => {
  test('maps French export headers to canonical fields and UUID', () => {
    const row = normalizeComplAiCsvRow({
      'Modèle ID': 'dfaa8b19-9e91-4b18-b2eb-45cb64633a46',
      'Nom du Modèle': 'Mistral Large 3 (675B Base)',
      Fournisseur: 'Mistral',
      Type: 'llm',
      Version: 'N/A',
      'Principe Code': 'transparency',
      'Benchmark Code': 'human_eval',
      'Score Original': '0.3',
      'Score Text': '0.3',
      "Date d'Évaluation": '2026-09-17',
    })

    expect(row).toEqual({
      model_id: 'dfaa8b19-9e91-4b18-b2eb-45cb64633a46',
      model_name: 'Mistral Large 3 (675B Base)',
      model_provider: 'Mistral',
      model_type: 'llm',
      version: '',
      principle_code: 'transparency',
      benchmark_code: 'human_eval',
      score: '0.3',
      score_text: '0.3',
      evaluation_date: '2026-09-17',
      lifecycle_status: null,
    })
  })

  test('promotes a UUID placed in the name column and recovers the display name', () => {
    const row = normalizeComplAiCsvRow({
      'Nom du Modèle': '0a8c5fc0-deda-482b-85f5-a5e0c1d18a36',
      Fournisseur: 'Claude Sonnet 5',
      'Principe Code': 'transparency',
      'Benchmark Code': 'human_eval',
      'Score Original': '0.6',
    })

    expect(row.model_id).toBe('0a8c5fc0-deda-482b-85f5-a5e0c1d18a36')
    expect(row.model_name).toBe('Claude Sonnet 5')
    expect(row.model_provider).toBe('')
  })

  test('keeps English import-template headers', () => {
    const row = normalizeComplAiCsvRow({
      model_name: 'GPT-4o',
      model_provider: 'OpenAI',
      model_type: 'large-language-model',
      version: '4.0',
      principle_code: 'transparency',
      benchmark_code: 'human_eval',
      score: '0.85',
      score_text: '85%',
      evaluation_date: '2026-09-17',
    })

    expect(row.model_id).toBeNull()
    expect(row.model_name).toBe('GPT-4o')
    expect(row.principle_code).toBe('transparency')
    expect(row.benchmark_code).toBe('human_eval')
    expect(row.lifecycle_status).toBeNull()
  })

  test('maps Statut actif / déprécié / retiré and ignores Évalué', () => {
    expect(parseComplAiLifecycleStatus('Actif')).toBe('active')
    expect(parseComplAiLifecycleStatus('déprécié')).toBe('deprecated')
    expect(parseComplAiLifecycleStatus('Retiré')).toBe('retired')
    expect(parseComplAiLifecycleStatus('Évalué')).toBeNull()
    expect(formatComplAiLifecycleStatus('retired')).toBe('Retiré')

    const row = normalizeComplAiCsvRow({
      'Nom du Modèle': 'Codestral 25.08',
      Fournisseur: 'Mistral',
      Statut: 'Retiré',
      'Principe Code': 'transparency',
      'Benchmark Code': 'human_eval',
      'Score Original': '0.5',
    })
    expect(row.lifecycle_status).toBe('retired')
  })
})

describe('parseComplAiCsv', () => {
  test('parses a French export round-trip row', () => {
    const csv = [
      'Modèle ID,Nom du Modèle,Fournisseur,Type,Version,Principe Code,Principe Nom,Catégorie Principe,Benchmark Code,Benchmark Nom,Score Original,Score Text,Date d\'Évaluation,Statut',
      'dfaa8b19-9e91-4b18-b2eb-45cb64633a46,"Mistral Large 3 (675B Base)",Mistral,llm,,"transparency","Transparency",GPAI,human_eval,"Coding: HumanEval",0.3,0.3,2026-09-17,Évalué',
    ].join('\n')

    const [raw] = parseComplAiCsv(csv)
    const row = normalizeComplAiCsvRow(raw)

    expect(row.model_id).toBe('dfaa8b19-9e91-4b18-b2eb-45cb64633a46')
    expect(row.model_name).toBe('Mistral Large 3 (675B Base)')
    expect(row.principle_code).toBe('transparency')
    expect(row.benchmark_code).toBe('human_eval')
    expect(row.score).toBe('0.3')
  })
})

describe('wide COMPL-AI CSV', () => {
  const codes = ['bbq', 'human_eval']

  test('builds one row per model and leaves missing scores empty', () => {
    const csv = buildComplAiWideCsv({
      benchmarkCodes: codes,
      models: [
        {
          id: 'dfaa8b19-9e91-4b18-b2eb-45cb64633a46',
          model_name: 'Mistral Large 3',
          model_provider: 'Mistral',
          model_type: 'llm',
          version: '',
          statusLabel: 'Actif',
        },
      ],
      scores: [
        { modelId: 'dfaa8b19-9e91-4b18-b2eb-45cb64633a46', benchmarkCode: 'human_eval', score: 0.3 },
      ],
    })

    expect(csv).toBe(
      [
        '\uFEFFModèle ID,Nom du Modèle,Fournisseur,Type,Version,Statut,bbq,human_eval',
        'dfaa8b19-9e91-4b18-b2eb-45cb64633a46,Mistral Large 3,Mistral,llm,,Actif,,0.3',
        '',
      ].join('\n'),
    )
  })

  test('reads score columns and skips empty cells', () => {
    const raw = parseComplAiCsv(
      'Modèle ID,Nom du Modèle,Fournisseur,Statut,bbq,human_eval\n' +
        'dfaa8b19-9e91-4b18-b2eb-45cb64633a46,Mistral Large 3,Mistral,Actif,,0.3\n',
    )[0]

    expect(parseComplAiModelCsvRow(raw, codes)).toEqual({
      model_id: 'dfaa8b19-9e91-4b18-b2eb-45cb64633a46',
      model_name: 'Mistral Large 3',
      model_provider: 'Mistral',
      model_type: '',
      version: '',
      lifecycle_status: 'active',
      scores: [
        { benchmark_code: 'human_eval', score: '0.3', score_text: '', evaluation_date: '' },
      ],
    })
  })

  test('still reads a legacy long row as a single score', () => {
    const row = parseComplAiModelCsvRow(
      {
        'Nom du Modèle': 'GPT-4o',
        Fournisseur: 'OpenAI',
        'Benchmark Code': 'human_eval',
        'Score Original': '0.85',
        'Score Text': '85%',
        "Date d'Évaluation": '2026-09-17',
      },
      codes,
    )

    expect(row.scores).toEqual([
      {
        benchmark_code: 'human_eval',
        score: '0.85',
        score_text: '85%',
        evaluation_date: '2026-09-17',
      },
    ])
  })
})

describe('summarizeComplAiCsvImport', () => {
  test('fails the import when every row is rejected', () => {
    const summary = summarizeComplAiCsvImport({
      totalRows: 9300,
      modelsCreated: 0,
      modelsUpdated: 0,
      evaluationsCreated: 0,
      evaluationsUpdated: 0,
      errors: [
        'Ligne 2: Nom du modèle, code principe et code benchmark sont obligatoires',
        'Ligne 3: Nom du modèle, code principe et code benchmark sont obligatoires',
      ],
      warnings: [],
    })

    expect(summary.success).toBe(false)
    expect(summary.httpStatus).toBe(422)
    expect(summary.message).toContain('aucun score enregistré')
    expect(summary.message).toContain('2 ligne(s) rejetée(s)')
  })

  test('keeps success when some scores are saved', () => {
    const summary = summarizeComplAiCsvImport({
      totalRows: 10,
      modelsCreated: 0,
      modelsUpdated: 8,
      evaluationsCreated: 2,
      evaluationsUpdated: 6,
      errors: ['Ligne 9: Benchmark absent'],
      warnings: [],
    })

    expect(summary.success).toBe(true)
    expect(summary.httpStatus).toBe(200)
    expect(summary.message).toContain('partiel')
    expect(summary.message).toContain('8 score(s)')
  })
})

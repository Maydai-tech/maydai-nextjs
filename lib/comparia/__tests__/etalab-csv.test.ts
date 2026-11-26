import {
  compariaConsumptionToWhPer1k,
  compariaRankingDateFromFileName,
  ETALAB_HEADERS,
  parseCompariaCsv,
  parseCompariaEtalabCsv,
} from '../import'
import { compariaIdMatchKeys, planCompariaLinks } from '../matching'

const ETALAB_HEADER = ETALAB_HEADERS.join(',')

const SUMMER = 'Tue Sep 22 2026 02:00:00 GMT+0200 (heure d’été d’Europe centrale)'
const WINTER = 'Thu Jan 01 2026 00:30:00 GMT+0100 (heure normale d’Europe centrale)'

function csvLine(values: Array<string | number>): string {
  return values.map((value) => {
    const text = String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }).join(',')
}

const ETALAB_CSV = `${ETALAB_HEADER}
${csvLine([1, 1, 'claude-opus-5.5', 1190, 1159, 1222, '+0/-3', 1, 4, 639, '', 'L', '', 'moe', SUMMER, 'Anthropic', 'proprietary'])}
${csvLine([3, 12, 'openai/gpt-6.1-sol', 1100, 1080, 1120, '+15/-15', 8, 20, 400, 117, 'M', '31.0', 'dense', WINTER, 'OpenAI', 'proprietary'])}
${csvLine([8, 40, 'mistral-large', 980, 960, 1000, '+4/-4', 30, 55, 210, 3785, 'XL', '671.0', 'maybe-moe', '2026-05-04', 'Mistral AI', 'open-weights'])}
`

describe('CSV Etalab 2.0 Compar:IA', () => {
  test('parse les 17 colonnes, les cellules vides et les dates sans décalage de fuseau', () => {
    const rows = parseCompariaEtalabCsv(ETALAB_CSV)

    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual(expect.objectContaining({
      ranking_class: 1,
      rank: 1,
      source_id: 'claude-opus-5.5',
      bradley_terry_score: 1190,
      confidence_interval: '+0/-3',
      consumption_mwh_per_1k_tokens: null,
      parameters_billions: null,
      release_date: '2026-09-22',
      organisation: 'Anthropic',
      license: 'proprietary',
      size: 'L',
      architecture: 'moe',
    }))
    expect(rows[1]).toEqual(expect.objectContaining({
      source_id: 'openai/gpt-6.1-sol',
      consumption_mwh_per_1k_tokens: 117,
      parameters_billions: 31,
      release_date: '2026-01-01',
    }))
    expect(rows[2]).toEqual(expect.objectContaining({
      consumption_mwh_per_1k_tokens: 3785,
      parameters_billions: 671,
      release_date: '2026-05-04',
      license: 'open-weights',
    }))
  })

  test('accepte N/A comme cellule vide, comme dans l’export officiel du 21/11/2026', () => {
    const [opus, prefixed, gemma, winter] = parseCompariaEtalabCsv(`${ETALAB_HEADER}
${csvLine([1, 1, 'claude-opus-5.5', 1190, 1159, 1222, '+0/-3', 1, 4, 639, 'N/A', 'XL', 'N/A', 'maybe-moe', SUMMER, 'Anthropic', 'proprietary'])}
${csvLine([2, 9, 'openai/gpt-6.1-sol', 1114, 1091, 1135, '+3/-11', 6, 20, 1149, 'N/A', 'XL', 'N/A', 'moe', 'Tue Sep 29 2026 02:00:00 GMT+0200 (heure d’été d’Europe centrale)', 'OpenAI', 'proprietary'])}
${csvLine([3, 16, 'gemma-4-31b-it', 1098, 1087, 1109, '+5/-6', 11, 22, 4150, 117, 'S', 31, 'dense', 'Wed Apr 01 2026 02:00:00 GMT+0200 (heure d’été d’Europe centrale)', 'Google', 'open-weights'])}
${csvLine([1, 4, 'muse-ember', 1160, 1115, 1206, '+3/-5', 1, 9, 279, 'N/A', 'S', 'N/A', 'maybe-moe', 'Mon Nov 09 2026 01:00:00 GMT+0100 (heure normale d’Europe centrale)', 'Meta', 'proprietary'])}`)

    expect(opus).toEqual(expect.objectContaining({
      source_id: 'claude-opus-5.5',
      consumption_mwh_per_1k_tokens: null,
      parameters_billions: null,
      release_date: '2026-09-22',
    }))
    expect(prefixed?.source_id).toBe('openai/gpt-6.1-sol')
    expect(gemma).toEqual(expect.objectContaining({
      consumption_mwh_per_1k_tokens: 117,
      parameters_billions: 31,
      release_date: '2026-04-01',
    }))
    expect(winter?.release_date).toBe('2026-11-09')
  })

  test('conserve l’id préfixé et expose la clé sans fournisseur', () => {
    const [row] = parseCompariaEtalabCsv(`${ETALAB_HEADER}
${csvLine([1, 4, 'openai/gpt-6.1-sol', 1100, 1080, 1120, '+15/-15', 2, 6, 80, 117, 'S', '', 'dense', SUMMER, 'OpenAI', 'proprietary'])}`)

    expect(row?.source_id).toBe('openai/gpt-6.1-sol')
    expect(compariaIdMatchKeys(row?.source_id ?? '')).toEqual({
      exact: ['openai/gpt-6.1-sol', 'gpt-6.1-sol'],
      normalized: ['openai-gpt-6-1-sol', 'gpt-6-1-sol'],
    })
  })

  test('convertit les mWh Compar:IA en Wh seulement pour la colonne consolidée', () => {
    expect(compariaConsumptionToWhPer1k(null)).toBeNull()
    expect(compariaConsumptionToWhPer1k(117)).toBeCloseTo(0.117)
    expect(compariaConsumptionToWhPer1k(3785)).toBeCloseTo(3.785)
  })

  test('lit la date du nom de fichier, sinon le jour de l’import à Paris', () => {
    expect(compariaRankingDateFromFileName('comparia_model-ranking-21_11_2026-license_Etalab_2_0.csv'))
      .toBe('2026-11-21')
    expect(compariaRankingDateFromFileName('notes.csv', new Date('2026-11-21T12:00:00Z')))
      .toBe('2026-11-21')
  })

  test('refuse un CSV sans les 17 colonnes, un ancien export ou un scraping HTML', () => {
    expect(() => parseCompariaEtalabCsv('Model,Elo,Votes\n1,gpt-4,1200')).toThrow('Colonnes Compar:IA manquantes')
    expect(() => parseCompariaEtalabCsv(`${ETALAB_HEADER.replace('Class,', '')}
${csvLine([1, 'gpt-5.3', 1144, 1126, 1165, '+0/-5', 1, 6, 1454, '', 'L', '', 'dense', '03/2026', 'OpenAI', 'proprietary'])}`)).toThrow('Class')
    expect(() => parseCompariaEtalabCsv('<html><table><tr><td>Rank</td></tr></table></html>')).toThrow('scraping HTML')
    expect(() => parseCompariaEtalabCsv(`${ETALAB_HEADER}
${csvLine([1, 1, 'gpt-5.3', 1144, 1126, 1165, '+0/-5', 1, 6, 10, '', 'L', '', 'dense', '03/2026', 'OpenAI', 'proprietary'])}`)).toThrow('Release')
  })

  test('le parseur historique accepte encore l’export à 16 colonnes', () => {
    const [row] = parseCompariaCsv(`Rank,id,Bradley-Terry Score,BT p2.5,BT p97.5,Confidence interval,Rank p2.5,Rank p97.5,Total votes,Consumption mWh (1000 tokens),Size,Parameters (B),Architecture,Release,Organisation,License
1,gpt-5.3,1144,1126,1165,+0/-5,1,6,1454,N/A,L,N/A,maybe-moe,03/2026,OpenAI,api-only`)
    expect(row).toEqual(expect.objectContaining({
      source_id: 'gpt-5.3',
      ranking_class: null,
      release_date: '2026-03-01',
      consumption_mwh_per_1k_tokens: null,
    }))
  })
})

describe('rapprochement Compar:IA', () => {
  const baseRow = parseCompariaEtalabCsv(ETALAB_CSV)

  test('associe un id préfixé au slug nu, et une variante . / - seulement si elle est unique', () => {
    const links = planCompariaLinks({
      rows: baseRow,
      models: [
        { id: 'opus', model_name: 'Claude Opus 5.5', model_provider: 'Anthropic', slug: 'claude-opus-5.5' },
        { id: 'sol', model_name: 'GPT 6.1 Sol', model_provider: 'OpenAI', slug: 'gpt-6.1-sol' },
        { id: 'sonnet', model_name: 'Claude Sonnet 5.5', model_provider: 'Anthropic', slug: 'claude-sonnet-5.5' },
      ],
    })
    const byId = new Map(links.map((link) => [link.sourceId, link]))
    expect(byId.get('claude-opus-5.5')).toEqual(expect.objectContaining({
      status: 'matched',
      maydaiModelId: 'opus',
      matchMethod: 'exact',
      origin: 'automatic',
    }))
    expect(byId.get('openai/gpt-6.1-sol')).toEqual(expect.objectContaining({
      status: 'matched',
      maydaiModelId: 'sol',
      matchMethod: 'exact',
    }))

    const ambiguous = planCompariaLinks({
      rows: parseCompariaEtalabCsv(`${ETALAB_HEADER}
${csvLine([2, 2, 'claude-sonnet-5-5', 1000, 980, 1020, '+1/-1', 2, 4, 10, '', 'M', '', 'dense', SUMMER, 'Anthropic', 'proprietary'])}`),
      models: [
        { id: 'dotted', model_name: 'Claude Sonnet', model_provider: 'Anthropic', slug: 'claude-sonnet-5.5' },
        { id: 'other', model_name: 'Autre Sonnet', model_provider: 'Anthropic', slug: 'claude.sonnet.5.5' },
      ],
    })
    expect(ambiguous[0]).toEqual(expect.objectContaining({ status: 'unmatched', maydaiModelId: null }))

    const uniqueNormalized = planCompariaLinks({
      rows: ambiguous.length ? parseCompariaEtalabCsv(`${ETALAB_HEADER}
${csvLine([2, 2, 'claude-sonnet-5-5', 1000, 980, 1020, '+1/-1', 2, 4, 10, '', 'M', '', 'dense', SUMMER, 'Anthropic', 'proprietary'])}`) : [],
      models: [
        { id: 'dotted', model_name: 'Claude Sonnet', model_provider: 'Anthropic', slug: 'claude-sonnet-5.5' },
      ],
    })
    expect(uniqueNormalized[0]).toEqual(expect.objectContaining({
      status: 'matched',
      maydaiModelId: 'dotted',
      matchMethod: 'slug',
    }))
  })

  test('conserve un ignoré et un lien manuel, sans inventer de modèle', () => {
    const [row] = baseRow
    const decisions = planCompariaLinks({
      rows: row ? [row] : [],
      models: [
        { id: 'opus', model_name: 'Claude Opus 5.5', model_provider: 'Anthropic', slug: 'claude-opus-5.5' },
      ],
      existing: [{
        source_id: 'claude-opus-5.5',
        maydai_model_id: null,
        match_method: null,
        link_status: 'ignored',
      }],
    })
    expect(decisions[0]).toEqual({
      sourceId: 'claude-opus-5.5',
      status: 'ignored',
      maydaiModelId: null,
      matchMethod: null,
      origin: 'persistent',
    })

    const kept = planCompariaLinks({
      rows: row ? [row] : [],
      models: [
        { id: 'opus', model_name: 'Claude Opus 5.5', model_provider: 'Anthropic', slug: 'claude-opus-5.5' },
        { id: 'other', model_name: 'Autre', model_provider: 'Anthropic', slug: 'autre' },
      ],
      existing: [{
        source_id: 'claude-opus-5.5',
        maydai_model_id: 'other',
        match_method: 'manual',
        link_status: 'matched',
      }],
    })
    expect(kept[0]).toEqual(expect.objectContaining({
      status: 'matched',
      maydaiModelId: 'other',
      matchMethod: 'manual',
      origin: 'persistent',
    }))
  })
})

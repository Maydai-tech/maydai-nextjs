import { findExactCompariaLinks, parseCompariaCsv } from '../import'

const HEADER = 'Rank,id,Bradley-Terry Score,BT p2.5,BT p97.5,Confidence interval,Rank p2.5,Rank p97.5,Total votes,Consumption mWh (1000 tokens),Size,Parameters (B),Architecture,Release,Organisation,License'

describe('Compar:IA CSV import', () => {
  test('parses ranking fields and converts N/A values to null', () => {
    const [row] = parseCompariaCsv(`${HEADER}
1,gpt-5.3,1144,1126,1165,+0/-5,1,6,1454,N/A,L,N/A,maybe-moe,03/2026,OpenAI,api-only`)

    expect(row).toEqual(expect.objectContaining({
      source_id: 'gpt-5.3',
      rank: 1,
      bradley_terry_score: 1144,
      consumption_mwh_per_1k_tokens: null,
      parameters_billions: null,
      release_date: '2026-03-01',
      organisation: 'OpenAI',
    }))
  })

  test('rejects a file missing an official column', () => {
    expect(() => parseCompariaCsv('Rank,id\n1,gpt-5.3')).toThrow(
      'Colonnes Compar:IA manquantes',
    )
  })

  test('links only one unambiguous exact normalized model', () => {
    const rows = parseCompariaCsv(`${HEADER}
1,gpt-5.3,1144,1126,1165,+0/-5,1,6,1454,N/A,L,N/A,maybe-moe,03/2026,OpenAI,api-only`)
    const links = findExactCompariaLinks(rows, [
      {
        id: 'maydai-gpt',
        model_name: 'GPT 5.3',
        model_provider: 'OpenAI',
        llm_stats_id: 'gpt-5.3',
      },
      {
        id: 'maydai-other',
        model_name: 'Claude Sonnet',
        model_provider: 'Anthropic',
        llm_stats_id: 'claude-sonnet',
      },
    ])

    expect(links.get('gpt-5.3')).toBe('maydai-gpt')
  })

  test('does not link ambiguous exact identifiers', () => {
    const rows = parseCompariaCsv(`${HEADER}
1,gpt-5.3,1144,1126,1165,+0/-5,1,6,1454,N/A,L,N/A,maybe-moe,03/2026,OpenAI,api-only`)
    const links = findExactCompariaLinks(rows, [
      { id: 'first', model_name: 'GPT 5.3', model_provider: 'OpenAI', llm_stats_id: 'gpt-5.3' },
      { id: 'second', model_name: 'GPT 5.3', model_provider: 'OpenAI', llm_stats_id: 'gpt-5.3' },
    ])

    expect(links.has('gpt-5.3')).toBe(false)
  })
})

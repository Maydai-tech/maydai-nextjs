import {
  buildUnacceptableInterdit1,
  pickLatestResponseByQuestion,
  resolveOptionLabels,
  type UsecaseResponseRow,
} from '@/lib/build-unacceptable-interdit1'
import { UNACCEPTABLE_INTERDIT1_FALLBACK } from '@/lib/unacceptable-case-copy'

describe('buildUnacceptableInterdit1', () => {
  test('retourne le fallback si aucune réponse prohibée', () => {
    expect(buildUnacceptableInterdit1([])).toBe(UNACCEPTABLE_INTERDIT1_FALLBACK)
  })

  test('exclut les options « aucun » et construit des puces avec libellés', () => {
    const rows: UsecaseResponseRow[] = [
      {
        question_code: 'E4.N7.Q3',
        multiple_codes: ['E4.N7.Q3.A', 'E4.N7.Q3.E'],
        answered_at: '2025-01-01T00:00:00Z',
      },
    ]
    const text = buildUnacceptableInterdit1(rows)
    expect(text).toContain("Motif principal d'interdiction")
    expect(text).toContain('Finalités interdites identifiées')
    expect(text).toContain('Identification biométrique et catégorisation des personnes physiques')
    expect(text).not.toContain('E4.N7.Q3.E')
    expect(text).not.toContain('Aucune de ces activités')
  })

  test('repli : multiple_labels seul, en excluant le libellé « aucune activité »', () => {
    const rows: UsecaseResponseRow[] = [
      {
        question_code: 'E4.N7.Q3',
        multiple_labels: [
          'Identification biométrique et catégorisation des personnes physiques',
          'Aucune de ces activités',
        ],
        answered_at: '2025-01-01T00:00:00Z',
      },
    ]
    const text = buildUnacceptableInterdit1(rows)
    expect(text).toContain('Identification biométrique')
    expect(text).not.toContain('Aucune de ces activités')
  })

  test('pickLatestResponseByQuestion garde la réponse la plus récente', () => {
    const rows: UsecaseResponseRow[] = [
      {
        question_code: 'E4.N7.Q2.1',
        multiple_codes: ['E4.N7.Q2.1.A'],
        answered_at: '2024-01-01T00:00:00Z',
      },
      {
        question_code: 'E4.N7.Q2.1',
        multiple_codes: ['E4.N7.Q2.1.B'],
        answered_at: '2025-06-01T00:00:00Z',
      },
    ]
    const map = pickLatestResponseByQuestion(rows)
    expect(map.get('E4.N7.Q2.1')?.multiple_codes).toEqual(['E4.N7.Q2.1.B'])
  })
})

describe('resolveOptionLabels', () => {
  test('résout un code connu', () => {
    const labels = resolveOptionLabels('E4.N7.Q3.1', ['E4.N7.Q3.1.A'])
    expect(labels[0]).toContain('vulnérabilités')
  })
})

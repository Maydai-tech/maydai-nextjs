import { render, screen } from '@testing-library/react'
import { CategoryScores } from '../CategoryScores'
import { V3_IMPOSSIBLE_MATURITY_SCORES_DISCLAIMER } from '@/lib/classification-risk-display'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} alt={(props.alt as string) || ''} />
  },
}))

const mockUseCaseScore = jest.fn()

jest.mock('../../hooks/useUseCaseScore', () => ({
  useUseCaseScore: (id: string) => mockUseCaseScore(id),
}))

describe('CategoryScores — classification impossible', () => {
  beforeEach(() => {
    mockUseCaseScore.mockReturnValue({
      loading: false,
      error: null,
      score: {
        score: 72,
        max_score: 100,
        category_scores: [
          {
            category_id: 'human_agency',
            category_name: 'Human',
            percentage: 70,
            evaluation_status: 'evaluated',
          },
        ],
        risk_use_case: { percentage: 65 },
      },
    })
  })

  test('affiche le bandeau de recadrage maturité / qualification', () => {
    render(<CategoryScores usecaseId="uc-1" classificationStatus="impossible" />)
    expect(screen.getByText(V3_IMPOSSIBLE_MATURITY_SCORES_DISCLAIMER)).toBeInTheDocument()
  })

  test('sans impossible : pas de bandeau', () => {
    render(<CategoryScores usecaseId="uc-1" classificationStatus="qualified" />)
    expect(screen.queryByText(V3_IMPOSSIBLE_MATURITY_SCORES_DISCLAIMER)).not.toBeInTheDocument()
  })
})

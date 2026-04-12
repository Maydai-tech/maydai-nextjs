import { render, screen } from '@testing-library/react'
import { RiskLevelBadge } from '../RiskLevelBadge'

describe('RiskLevelBadge', () => {
  test('impossible : affiche Classification impossible sans niveau classique', () => {
    render(
      <RiskLevelBadge
        riskLevel="minimal"
        classificationStatus="impossible"
        loading={false}
        error={null}
      />
    )
    expect(screen.getByText('Classification impossible')).toBeInTheDocument()
    expect(screen.queryByText('Risque minimal')).not.toBeInTheDocument()
  })

  test('qualified + minimal : affiche Risque minimal', () => {
    render(
      <RiskLevelBadge riskLevel="minimal" classificationStatus="qualified" loading={false} error={null} />
    )
    expect(screen.getByText('Risque minimal')).toBeInTheDocument()
  })

  test('sans niveau ni erreur : Non évalué', () => {
    render(
      <RiskLevelBadge riskLevel={null} classificationStatus="qualified" loading={false} error={null} />
    )
    expect(screen.getByText('Non évalué')).toBeInTheDocument()
  })

  test('erreur API : message distinct du non évalué', () => {
    render(
      <RiskLevelBadge riskLevel={null} classificationStatus={null} loading={false} error="Failed to fetch" />
    )
    expect(screen.getByText(/impossible de charger le niveau/i)).toBeInTheDocument()
    expect(screen.queryByText('Non évalué')).not.toBeInTheDocument()
  })
})

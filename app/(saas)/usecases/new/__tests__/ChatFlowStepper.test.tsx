import { render, screen } from '@testing-library/react'
import ChatFlowStepper from '../components/ChatFlowStepper'

describe('ChatFlowStepper', () => {
  test('marque l’étape Profil comme en cours', () => {
    render(<ChatFlowStepper current={1} />)

    expect(screen.getByLabelText('Parcours Chat IA')).toBeInTheDocument()
    expect(screen.getByText('Profil')).toBeInTheDocument()
    expect(screen.getByText('Brouillon')).toBeInTheDocument()
    expect(screen.getByText('Évaluation')).toBeInTheDocument()
    expect(screen.getByText('(étape en cours)')).toBeInTheDocument()
  })
})

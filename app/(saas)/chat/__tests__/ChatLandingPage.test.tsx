import { render, screen } from '@testing-library/react'
import { ChatLandingContent } from '../ChatLandingPage'

describe('ChatLandingContent', () => {
  test('affiche le titre et redirige vers le chat guidé', () => {
    render(<ChatLandingContent />)

    expect(
      screen.getByRole('heading', { name: 'Discutez avec votre Assistant IA' })
    ).toBeInTheDocument()

    const cta = screen.getByRole('link', { name: /Créer un cas d'usage/i })
    expect(cta).toHaveAttribute('href', '/usecases/new/setup-chat')
  })
})

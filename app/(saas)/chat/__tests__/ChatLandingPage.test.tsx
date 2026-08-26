import { render, screen } from '@testing-library/react'
import { ChatLandingContent } from '../ChatLandingPage'

describe('ChatLandingContent', () => {
  test('affiche le hub à trois assistants et redirige vers le cadrage', () => {
    render(<ChatLandingContent />)

    expect(screen.getByRole('heading', { name: 'Chat IA' })).toBeInTheDocument()
    expect(
      screen.getByText(/Choisissez l'assistant avec lequel vous voulez échanger/i)
    ).toBeInTheDocument()

    const cta = screen.getByRole('link', { name: /Créer un cas d'usage/i })
    expect(cta).toHaveAttribute('href', '/usecases/new/setup-chat')

    expect(screen.getByRole('heading', { name: 'Pédagogie AI Act' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Support plateforme MaydAI' })).toBeInTheDocument()
    expect(screen.getAllByText('Bientôt disponible')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: /Pédagogie AI Act/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Support plateforme MaydAI/i })
    ).not.toBeInTheDocument()

    expect(screen.getByText('mistral-large')).toBeInTheDocument()
    expect(screen.getByText('mistral-small')).toBeInTheDocument()
    expect(
      screen.getByText('Vos données sont hébergées en France sur OVHcloud.')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /En savoir plus/i })).toHaveAttribute(
      'href',
      '/securite'
    )
  })
})

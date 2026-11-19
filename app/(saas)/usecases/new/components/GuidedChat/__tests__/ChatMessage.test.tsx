import { render, screen } from '@testing-library/react'
import ChatMessage from '../ChatMessage'

describe('ChatMessage', () => {
  test('affiche une bulle bot avec l’icône robot', () => {
    render(
      <ChatMessage
        message={{
          id: '1',
          role: 'bot',
          content: 'Comment souhaitez-vous nommer ce cas d\'usage IA ?',
          timestamp: Date.now(),
        }}
      />
    )

    expect(
      screen.getByText('Comment souhaitez-vous nommer ce cas d\'usage IA ?')
    ).toBeInTheDocument()
  })

  test('affiche une bulle utilisateur alignée à droite', () => {
    const { container } = render(
      <ChatMessage
        message={{
          id: '2',
          role: 'user',
          content: 'Système IA Anti-Fraude',
          timestamp: Date.now(),
        }}
      />
    )

    expect(screen.getByText('Système IA Anti-Fraude')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('flex-row-reverse')
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import CreateUseCaseHub from '../components/CreateUseCaseHub'

describe('CreateUseCaseHub', () => {
  test('affiche le titre et les deux parcours', () => {
    render(<CreateUseCaseHub onSelect={jest.fn()} companyName="MaydAI" />)

    expect(
      screen.getByRole('heading', { name: /Évaluez votre cas d.usage/i })
    ).toBeInTheDocument()
    expect(screen.getByText("Choisissez votre mode d'évaluation.")).toBeInTheDocument()
    expect(
      screen.getByLabelText('Environnement de travail actuel. Registre : MaydAI')
    ).toHaveTextContent('Registre : MaydAI')
    expect(screen.getByRole('button', { name: /Assistant Chat IA/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Questionnaires détaillés/i })).toBeInTheDocument()
    expect(screen.getByText(/3 étapes : vérification du profil/i)).toBeInTheDocument()
    expect(screen.getByText(/Rapide : < 2 min/)).toBeInTheDocument()
    expect(screen.getByText(/Court : ~3 min/)).toBeInTheDocument()
    expect(screen.getByText(/Long : ~6 min/)).toBeInTheDocument()
    expect(
      screen.getByText(/Choisissez la version courte pour l'essentiel/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Questionnaires détaillés/i })).toHaveAttribute(
      'aria-labelledby',
      'card2-title'
    )
    expect(screen.getByRole('button', { name: /Questionnaires détaillés/i })).toHaveAttribute(
      'aria-describedby',
      'card2-desc'
    )
    expect(screen.queryByRole('link', { name: /Retour au dashboard/i })).not.toBeInTheDocument()
    expect(screen.getByText('Assistant IA conversationnel')).toBeInTheDocument()
    expect(screen.getByText('mistral-large')).toBeInTheDocument()
    expect(screen.getByText(/Résumé du cas d.usage/)).toBeInTheDocument()
    expect(screen.getByText('mistral-small')).toBeInTheDocument()
    expect(
      screen.getByText('Vos données sont hébergées en France sur OVHcloud.')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /En savoir plus/i })).toHaveAttribute(
      'href',
      '/securite'
    )
  })

  test('affiche le lien dashboard quand dashboardHref est fourni', () => {
    render(
      <CreateUseCaseHub
        onSelect={jest.fn()}
        dashboardHref="/dashboard/company-1"
      />
    )

    expect(screen.getByRole('link', { name: /Retour au dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard/company-1'
    )
  })

  test('notifie le parcours Chat IA au clic', () => {
    const onSelect = jest.fn()
    render(<CreateUseCaseHub onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /Assistant Chat IA/i }))

    expect(onSelect).toHaveBeenCalledWith('chat')
  })

  test('notifie le questionnaire détaillé au clic', () => {
    const onSelect = jest.fn()
    render(<CreateUseCaseHub onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /Questionnaires détaillés/i }))

    expect(onSelect).toHaveBeenCalledWith('questionnaire')
  })
})

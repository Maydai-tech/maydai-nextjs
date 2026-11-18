import { fireEvent, render, screen, within } from '@testing-library/react'
import ProcurementsSection from '../ProcurementsSection'
import ReceivedProcurementPage from '@/app/procurements/[id]/ReceivedProcurementPage'
import type { ReceivedProcurement } from '@/lib/validations/procurement'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('@/lib/api-client', () => ({ useApiClient: () => ({ get: jest.fn(), delete: jest.fn() }) }))

const received: ReceivedProcurement = { id: 'received-1', title: 'Outil de présélection de CV', description: 'Tri des candidatures', phase: 'rfp', deadline_at: '2099-12-12T17:00:00Z', created_at: '2026-10-01T12:00:00Z', buyer_name: 'Clinique Lumière' }
const mine = { id: 'mine-1', user_id: 'u', title: 'Planification des tournées', description: 'Tournées', created_at: '2026-10-01T12:00:00Z', deadline_at: '2099-12-15T17:00:00Z' }

describe('Appels d’offres reçus sur l’accueil', () => {
  test('affiche le bloc fournisseur sans bouton de création', () => {
    render(<ProcurementsSection initialProcurements={[mine]} initialError={null} initialReceived={[received]} />)
    const block = screen.getByRole('heading', { name: 'Appels d’offres reçus' }).closest('div.rounded-2xl') as HTMLElement
    expect(within(block).getByRole('link', { name: new RegExp(received.title) })).toHaveAttribute('href', '/procurements/received-1')
    expect(within(block).getByText('Acheteur : Clinique Lumière')).toBeVisible()
    expect(within(block).queryByRole('link', { name: 'Créer un appel d’offres' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Créer un appel d’offres' })).toHaveLength(1)
  })

  test('masque le bloc quand rien n’a été reçu', () => {
    render(<ProcurementsSection initialProcurements={[mine]} initialError={null} />)
    expect(screen.queryByRole('heading', { name: 'Appels d’offres reçus' })).not.toBeInTheDocument()
  })

  test('la recherche commune filtre aussi par acheteur', () => {
    render(<ProcurementsSection initialProcurements={[mine]} initialError={null} initialReceived={[received]} />)
    fireEvent.change(screen.getByLabelText('Rechercher un appel d’offres'), { target: { value: 'lumiere' } })
    expect(screen.getByText(received.title)).toBeVisible()
    expect(screen.queryByText(mine.title)).not.toBeInTheDocument()
  })

  test('un fournisseur sans appel à lui garde l’état vide acheteur et voit la recherche', () => {
    render(<ProcurementsSection initialProcurements={[]} initialError={null} initialReceived={[received]} />)
    expect(screen.getByText('Aucun appel d’offres pour le moment')).toBeVisible()
    expect(screen.getByLabelText('Rechercher un appel d’offres')).toBeVisible()
  })

  test('signale une erreur de chargement des appels reçus', () => {
    render(<ProcurementsSection initialProcurements={[]} initialError={null} receivedError="Impossible de charger les appels d’offres reçus." />)
    expect(screen.getByRole('alert')).toHaveTextContent('appels d’offres reçus')
  })
})

describe('Vue fournisseur d’un appel reçu', () => {
  test('présente l’acheteur, le besoin et les questions, en lecture seule', () => {
    render(<ReceivedProcurementPage procurement={{ ...received, supplier_company_name: 'Flatchr', supplier_email: 'c.martin@flatchr.io', custom_questions: [{ id: '76000000-0000-4000-8000-000000000001', label: 'Où est hébergée la solution ?', type: 'short_text' }] }} />)
    expect(screen.getByText('Clinique Lumière')).toBeVisible()
    expect(screen.getByText(/Flatchr · c\.martin@flatchr\.io/)).toBeVisible()
    expect(screen.getByRole('heading', { name: received.title })).toBeVisible()
    expect(screen.getByText('En cours')).toBeVisible()
    expect(screen.getByText('1. Où est hébergée la solution ?')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Répondre' })).toBeDisabled()
    expect(screen.queryByText(/\/ 10/)).not.toBeInTheDocument()
  })

  test('indique les critères MaydAI seuls quand il n’y a pas de question', () => {
    render(<ReceivedProcurementPage procurement={received} />)
    expect(screen.getByText(/seuls les critères AI Act MaydAI/)).toBeVisible()
  })
})

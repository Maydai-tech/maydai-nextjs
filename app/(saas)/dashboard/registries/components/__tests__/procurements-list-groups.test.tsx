import { fireEvent, render, screen, within } from '@testing-library/react'
import ProcurementsSection from '../ProcurementsSection'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('@/lib/api-client', () => ({ useApiClient: () => ({ get: jest.fn(), delete: jest.fn() }) }))

const base = { user_id: 'user-1', description: 'Besoin', created_at: '2026-10-01T12:00:00Z' }
const open = { ...base, id: 'open-1', title: 'Outil de présélection de CV', phase: 'rfp' as const, deadline_at: '2099-12-12T17:00:00Z', supplier_emails: ['a@x.fr', 'b@x.fr', 'c@x.fr'] }
const closed = { ...base, id: 'closed-1', title: 'Transcription médicale', phase: 'rfi' as const, deadline_at: '2026-01-30T17:00:00Z', supplier_emails: ['a@x.fr'] }

describe('Mes appels d’offres', () => {
  test('regroupe les appels par statut avec leurs compteurs', () => {
    render(<ProcurementsSection initialProcurements={[closed, open]} initialError={null} />)
    const openGroup = screen.getByRole('heading', { name: 'En cours · 1' }).parentElement!
    const closedGroup = screen.getByRole('heading', { name: 'Clôturés · 1' }).parentElement!
    expect(within(openGroup).getByText(open.title)).toBeVisible()
    expect(within(openGroup).getByText('3 fournisseurs')).toBeVisible()
    expect(within(closedGroup).getByText(closed.title)).toBeVisible()
    expect(within(closedGroup).getByText('Clôturé le 30 janv. 2026')).toBeVisible()
  })

  test('toute la carte ouvre le détail', () => {
    render(<ProcurementsSection initialProcurements={[open]} initialError={null} />)
    const link = screen.getByRole('link', { name: new RegExp(open.title) })
    expect(link).toHaveAttribute('href', '/procurements/open-1')
    expect(link).toHaveTextContent('Date limite : 12 déc. 2099')
  })

  test('filtre par titre sans tenir compte des accents et propose d’effacer', () => {
    render(<ProcurementsSection initialProcurements={[closed, open]} initialError={null} />)
    const search = screen.getByLabelText('Rechercher un appel d’offres')
    fireEvent.change(search, { target: { value: 'preselection' } })
    expect(screen.getByText(open.title)).toBeVisible()
    expect(screen.queryByText(closed.title)).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'dentaire' } })
    expect(screen.getByText('Aucun appel d’offres ne correspond à « dentaire »')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'effacez la recherche' }))
    expect(screen.getByText(closed.title)).toBeVisible()
  })

  test('masque la recherche quand il n’y a aucun appel', () => {
    render(<ProcurementsSection initialProcurements={[]} initialError={null} />)
    expect(screen.queryByLabelText('Rechercher un appel d’offres')).not.toBeInTheDocument()
  })
})

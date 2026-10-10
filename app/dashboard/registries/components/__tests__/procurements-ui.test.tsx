import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProcurementsSection from '../ProcurementsSection'
import NewProcurementForm from '@/app/procurements/new/NewProcurementForm'

const push = jest.fn()
const replace = jest.fn()
const refresh = jest.fn()
const postJson = jest.fn()
const get = jest.fn()
let params = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, refresh }),
  useSearchParams: () => params,
}))
jest.mock('@/lib/api-client', () => ({ useApiClient: () => ({ postJson, get }) }))

const item = { id: 'procurement-1', user_id: 'user-1', title: 'Assistant RH', description: 'Un besoin RH', created_at: '2026-10-09T12:00:00Z' }

beforeEach(() => {
  jest.clearAllMocks()
  params = new URLSearchParams()
})

describe('Formulaire de création', () => {
  function fill() {
    fireEvent.change(screen.getByLabelText(/Titre de l’appel/), { target: { value: ' Assistant RH ' } })
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: ' Besoin RH ' } })
    fireEvent.change(screen.getByLabelText('Date limite'), { target: { value: '2099-01-15' } })
    fireEvent.change(screen.getByLabelText('Emails des fournisseurs prévus'), { target: { value: 'supplier@example.com' } })
  }

  test('soumet la saisie nettoyée et revient à la liste', async () => {
    postJson.mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: '72000000-0000-4000-8000-000000000001' }) })
    render(<NewProcurementForm />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’appel d’offres' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/procurements/72000000-0000-4000-8000-000000000001?procurementCreated=true'))
    expect(postJson).toHaveBeenCalledWith('/api/procurements', expect.objectContaining({ title: 'Assistant RH', description: 'Besoin RH', phase: 'consultation', deadline_at: '2099-01-15T17:00:00.000Z', supplier_emails: ['supplier@example.com'] }))
  })

  test('bloque les doubles soumissions pendant l’enregistrement', async () => {
    let complete!: (value: { ok: boolean; status: number; json: () => Promise<{ id: string }> }) => void
    postJson.mockReturnValue(new Promise((resolve) => { complete = resolve }))
    const { container } = render(<NewProcurementForm />)
    fill()
    fireEvent.submit(container.querySelector('form')!)
    fireEvent.submit(container.querySelector('form')!)
    expect(postJson).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Création en cours…' })).toBeDisabled()
    complete({ ok: true, status: 201, json: async () => ({ id: '72000000-0000-4000-8000-000000000001' }) })
    await waitFor(() => expect(push).toHaveBeenCalled())
  })

  test('conserve les champs et permet de réessayer après une erreur réseau', async () => {
    postJson.mockRejectedValue(new TypeError('Failed to fetch'))
    render(<NewProcurementForm />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’appel d’offres' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Votre saisie est conservée')
    expect(screen.getByLabelText(/Titre de l’appel/)).toHaveValue(' Assistant RH ')
    expect(screen.getByLabelText(/Description/)).toHaveValue(' Besoin RH ')
    expect(screen.getByRole('button', { name: 'Créer l’appel d’offres' })).toBeEnabled()
    expect(push).not.toHaveBeenCalled()
  })

  test('refuse un titre composé d’espaces et place le focus sur le résumé', () => {
    const { container } = render(<NewProcurementForm />)
    const input = screen.getByLabelText(/Titre de l’appel/)
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.submit(container.querySelector('form')!)
    expect(screen.getByRole('alert')).toHaveTextContent('Le titre est obligatoire')
    expect(screen.getByRole('alert')).toHaveFocus()
    expect(postJson).not.toHaveBeenCalled()
  })

  test('redirige une session expirée vers la connexion', async () => {
    postJson.mockResolvedValue({ ok: false, status: 401 })
    render(<NewProcurementForm />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’appel d’offres' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/login'))
  })
})

describe('Liste Procurements', () => {
  test('présente un état vide et le lien vers le formulaire', () => {
    render(<ProcurementsSection initialProcurements={[]} initialError={null} />)
    expect(screen.getByText('Aucun appel d’offres pour le moment')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Créer un appel d’offres' })).toHaveAttribute('href', '/procurements/new')
  })

  test('affiche les données sauvegardées et une date française', () => {
    render(<ProcurementsSection initialProcurements={[item]} initialError={null} />)
    expect(screen.getByText(item.title)).toBeVisible()
    expect(screen.getByText(item.description)).toBeVisible()
    expect(screen.getByText('Créé le 9 oct. 2026')).toBeVisible()
  })

  test('affiche une erreur plutôt qu’un état vide et permet de réessayer', async () => {
    get.mockResolvedValue({ ok: true, status: 200, json: async () => [item] })
    render(<ProcurementsSection initialProcurements={[]} initialError="Chargement impossible" />)
    expect(screen.queryByText('Aucun appel d’offres pour le moment')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByText(item.title)).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('préserve les autres paramètres lors de la confirmation de création', async () => {
    params = new URLSearchParams('procurementCreated=true&deleted=true')
    render(<ProcurementsSection initialProcurements={[item]} initialError={null} />)
    expect(await screen.findByRole('status')).toHaveTextContent('L’appel d’offres a été créé avec succès')
    expect(replace).toHaveBeenCalledWith('/dashboard/registries?deleted=true', { scroll: false })
  })

  test('actualise la liste quand les données serveur changent', () => {
    const { rerender } = render(<ProcurementsSection initialProcurements={[]} initialError={null} />)
    rerender(<ProcurementsSection initialProcurements={[item]} initialError={null} />)
    expect(screen.getByText(item.title)).toBeVisible()
  })
})

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import ProcurementSuppliersSection from '../../[id]/ProcurementSuppliersSection'
import NewProcurementForm from '../../new/NewProcurementForm'
import type { ProcurementSupplier } from '@/lib/validations/procurement'

const push = jest.fn()
const get = jest.fn()
const postJson = jest.fn()
const deleteRequest = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: jest.fn() }) }))
jest.mock('@/lib/api-client', () => ({ useApiClient: () => ({ get, postJson, delete: deleteRequest }) }))

const procurementId = '75000000-0000-4000-8000-000000000001'
const legacy: ProcurementSupplier = { id: '75000000-0000-4000-8000-000000000002', contact_email: 'rfp@hiresmart.eu', company_name: null, siren: null, city: null }
const jungle = { siren: '799352682', name: 'WELCOME TO THE JUNGLE', city: 'Paris', postal_code: '75011', activity: 'Édition de logiciels' }

function Harness({ initial }: { initial: ProcurementSupplier[] }) {
  const [suppliers, setSuppliers] = useState(initial)
  return <ProcurementSuppliersSection procurementId={procurementId} suppliers={suppliers} onChange={setSuppliers} />
}

async function searchAndPick() {
  jest.useFakeTimers()
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'jungle' } })
  await act(async () => { jest.advanceTimersByTime(300) })
  jest.useRealTimers()
  fireEvent.mouseDown(await screen.findByRole('option', { name: /WELCOME TO THE JUNGLE/ }))
}

beforeEach(() => {
  jest.clearAllMocks()
  get.mockResolvedValue({ ok: true, status: 200, json: async () => ({ results: [jungle] }) })
})

describe('Fournisseurs sur la page de l’appel d’offres', () => {
  test('ajoute une entreprise trouvée par la recherche', async () => {
    postJson.mockImplementation(async (_url: string, body: Record<string, string>) => ({ ok: true, status: 201, json: async () => ({ id: '75000000-0000-4000-8000-000000000003', ...body }) }))
    render(<Harness initial={[]} />)
    expect(screen.getByText('Aucun fournisseur pour le moment.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un fournisseur' }))
    await searchAndPick()
    expect(get).toHaveBeenCalledWith('/api/company-search?q=jungle')
    fireEvent.change(screen.getByLabelText('Email du contact'), { target: { value: 'Contact@Jungle.fr' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fournisseur ajouté.')
    expect(postJson).toHaveBeenCalledWith(`/api/procurements/${procurementId}/suppliers`, { contact_email: 'contact@jungle.fr', company_name: 'WELCOME TO THE JUNGLE', siren: '799352682', city: 'Paris' })
    expect(screen.getByText('SIREN 799 352 682 · Paris')).toBeVisible()
    expect(screen.getByText('1 entreprise consultée')).toBeVisible()
  })

  test('complète un ancien fournisseur saisi sans entreprise', async () => {
    postJson.mockResolvedValue({ ok: true, status: 201, json: async () => ({ ...legacy, company_name: 'HireSmart' }) })
    render(<Harness initial={[legacy]} />)
    fireEvent.click(screen.getByRole('button', { name: `Compléter le fournisseur ${legacy.contact_email}` }))
    expect(screen.getByLabelText('Email du contact')).toHaveAttribute('readonly')
    fireEvent.click(screen.getByRole('button', { name: 'Saisir sans recherche' }))
    fireEvent.change(screen.getByLabelText('Nom de l’entreprise'), { target: { value: 'HireSmart' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fournisseur mis à jour.')
    expect(screen.getByText('HireSmart')).toBeVisible()
  })

  test('retire un fournisseur', async () => {
    deleteRequest.mockResolvedValue({ ok: true, status: 204 })
    render(<Harness initial={[legacy]} />)
    fireEvent.click(screen.getByRole('button', { name: `Retirer ${legacy.contact_email}` }))
    await waitFor(() => expect(screen.queryByText(legacy.contact_email)).not.toBeInTheDocument())
    expect(deleteRequest).toHaveBeenCalledWith(`/api/procurements/${procurementId}/suppliers/${legacy.id}`)
  })

  test('signale un email invalide sans appeler l’API', () => {
    render(<Harness initial={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un fournisseur' }))
    fireEvent.change(screen.getByLabelText('Email du contact'), { target: { value: 'invalid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(screen.getByRole('alert')).toHaveTextContent('email')
    expect(postJson).not.toHaveBeenCalled()
  })
})

describe('Fournisseurs dans le formulaire de création', () => {
  test('envoie l’entreprise choisie avec l’email du contact', async () => {
    postJson.mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: procurementId }) })
    render(<NewProcurementForm />)
    fireEvent.change(screen.getByLabelText('Titre de l’appel d’offres'), { target: { value: 'CV' } })
    fireEvent.change(screen.getByLabelText('Description du besoin'), { target: { value: 'Tri' } })
    fireEvent.change(screen.getByLabelText('Date limite'), { target: { value: '2099-03-01' } })
    await searchAndPick()
    fireEvent.change(screen.getByLabelText('Email du contact'), { target: { value: 'contact@jungle.fr' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(screen.getByRole('button', { name: 'Retirer WELCOME TO THE JUNGLE' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’appel d’offres' }))
    await waitFor(() => expect(postJson).toHaveBeenCalled())
    expect(postJson.mock.calls[0][1]).toEqual(expect.objectContaining({
      supplier_emails: ['contact@jungle.fr'],
      suppliers: [{ contact_email: 'contact@jungle.fr', company_name: 'WELCOME TO THE JUNGLE', siren: '799352682', city: 'Paris' }],
    }))
  })
})

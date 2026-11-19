import { act, fireEvent, render, screen, within } from '@testing-library/react'
import ProcurementsSection from '../ProcurementsSection'

let params = new URLSearchParams()
const router = { refresh: jest.fn(), push: jest.fn(), replace: jest.fn() }
const deleteRequest = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => router, useSearchParams: () => params }))
jest.mock('@/lib/api-client', () => ({ useApiClient: () => ({ delete: deleteRequest, get: jest.fn() }) }))

const item = { id: 'procurement-1', user_id: 'user-1', title: 'Assistant RH', description: '', created_at: '2026-10-09T12:00:00Z' }

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  params = new URLSearchParams()
})
afterEach(() => jest.useRealTimers())

test('la confirmation de création disparaît sans action utilisateur', () => {
  params = new URLSearchParams('procurementCreated=true')
  render(<ProcurementsSection initialProcurements={[item]} initialError={null} />)
  expect(screen.getByRole('status')).toHaveTextContent('créé avec succès')
  act(() => jest.advanceTimersByTime(5300))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByText(item.title)).toBeVisible()
})

test('la confirmation de suppression disparaît et conserve la liste actualisée', async () => {
  deleteRequest.mockResolvedValue({ ok: true, status: 204 })
  render(<ProcurementsSection initialProcurements={[item]} initialError={null} />)
  fireEvent.click(screen.getByRole('button', { name: `Actions pour l’appel d’offres ${item.title}` }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Supprimer l’appel d’offres' }))
  const dialog = screen.getByRole('dialog')
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: item.title } })
  await act(async () => { fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer définitivement' })) })
  expect(screen.getByRole('status')).toHaveTextContent('supprimé avec succès')
  act(() => jest.advanceTimersByTime(5300))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByText('Aucun appel d’offres pour le moment')).toBeVisible()
})

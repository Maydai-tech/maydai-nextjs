import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ProcurementsSection from '../ProcurementsSection'

const deleteRequest = jest.fn()
const refresh = jest.fn()
const push = jest.fn()
const params = new URLSearchParams()
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push, replace: jest.fn() }), useSearchParams: () => params }))
jest.mock('@/lib/api-client', () => ({ useApiClient: () => ({ delete: deleteRequest, get: jest.fn() }) }))

const item = { id: 'procurement-1', user_id: 'user-1', title: 'Assistant RH', description: '', created_at: '2026-10-09T12:00:00Z' }

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
beforeEach(() => jest.clearAllMocks())

function openConfirmation() {
  render(<ProcurementsSection initialProcurements={[item]} initialError={null} />)
  fireEvent.click(screen.getByRole('button', { name: `Actions pour l’appel d’offres ${item.title}` }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Supprimer l’appel d’offres' }))
  return screen.getByRole('dialog', { name: 'Supprimer l’appel d’offres' })
}

test('exige le titre exact et permet d’annuler sans supprimer', () => {
  const dialog = openConfirmation()
  expect(within(dialog).getByRole('button', { name: 'Supprimer définitivement' })).toBeDisabled()
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Mauvais titre' } })
  expect(within(dialog).getByRole('button', { name: 'Supprimer définitivement' })).toBeDisabled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(deleteRequest).not.toHaveBeenCalled()
  expect(screen.getByText(item.title)).toBeVisible()
})

test('retire de la liste après suppression et affiche une confirmation', async () => {
  deleteRequest.mockResolvedValue({ ok: true, status: 204 })
  const dialog = openConfirmation()
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: item.title } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer définitivement' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(deleteRequest).toHaveBeenCalledWith('/api/procurements/procurement-1')
  expect(screen.getByRole('status')).toHaveTextContent('supprimé avec succès')
  expect(screen.getByText('Aucun appel d’offres pour le moment')).toBeVisible()
  expect(refresh).toHaveBeenCalled()
})

test('conserve la liste et la confirmation en cas d’erreur pour réessayer', async () => {
  deleteRequest.mockRejectedValue(new Error('Network failure'))
  const dialog = openConfirmation()
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: item.title } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer définitivement' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Veuillez réessayer')
  expect(within(dialog).getByRole('textbox')).toHaveValue(item.title)
  expect(within(dialog).getByRole('button', { name: 'Supprimer définitivement' })).toBeEnabled()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('empêche les doubles soumissions et la fermeture pendant la suppression', async () => {
  let complete!: (value: { ok: boolean; status: number }) => void
  deleteRequest.mockReturnValue(new Promise((resolve) => { complete = resolve }))
  const dialog = openConfirmation()
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: item.title } })
  fireEvent.submit(dialog.querySelector('form')!)
  fireEvent.submit(dialog.querySelector('form')!)
  expect(deleteRequest).toHaveBeenCalledTimes(1)
  expect(within(dialog).getByRole('button', { name: 'Annuler' })).toBeDisabled()
  const cancel = new Event('cancel', { bubbles: true, cancelable: true })
  fireEvent(dialog, cancel)
  expect(dialog).toHaveAttribute('open')
  complete({ ok: true, status: 204 })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

test('le menu se ferme par Échap et rend le focus au bouton', () => {
  render(<ProcurementsSection initialProcurements={[item]} initialError={null} />)
  const button = screen.getByRole('button', { name: `Actions pour l’appel d’offres ${item.title}` })
  fireEvent.keyDown(button, { key: 'ArrowDown' })
  expect(screen.getByRole('menuitem')).toHaveFocus()
  fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Escape' })
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  expect(button).toHaveFocus()
})

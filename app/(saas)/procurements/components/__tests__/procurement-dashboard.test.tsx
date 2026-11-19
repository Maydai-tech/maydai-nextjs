import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProcurementDashboardPage from '../../[id]/ProcurementDashboardPage'
import { DEFAULT_IMPORTANCE } from '@/lib/validations/procurement'
const router = { push: jest.fn(), replace: jest.fn() }
const get = jest.fn()
let params = new URLSearchParams()
jest.mock('next/navigation', () => ({ useRouter: () => router, useSearchParams: () => params }))
jest.mock('@/lib/api-client', () => ({ useApiClient: () => ({ get }) }))
const item = { id: '73000000-0000-4000-8000-000000000001', user_id: 'owner', title: 'Appel marketing', description: 'Confidentialité des briefs', created_at: '2026-10-09T12:00:00Z', phase: 'rfp' as const, criteria_importance: { ...DEFAULT_IMPORTANCE, human_oversight: 0 }, supplier_emails: ['alpha@example.com'], custom_questions: [], deadline_at: '2099-01-15T17:00:00Z' }
beforeEach(() => { jest.clearAllMocks(); params = new URLSearchParams() })
test('affiche la vraie configuration et des états vides pour la collecte future', () => {
  render(<ProcurementDashboardPage id={item.id} initialProcurement={item} initialError={false} />)
  expect(screen.getByRole('heading', { name: item.title })).toBeVisible()
  expect(screen.getByText('Non invité')).toBeVisible()
  expect(screen.getByText('0 / 10')).toBeVisible()
  expect(screen.getByText('Aucune réponse pour le moment')).toBeVisible()
  expect(screen.getByText('Aucun score disponible')).toBeVisible()
  expect(screen.queryByRole('button', { name: /Envoyer/ })).not.toBeInTheDocument()
})
test('préserve la lecture des anciens appels sans inventer leur configuration', () => {
  render(<ProcurementDashboardPage id={item.id} initialProcurement={{ id: item.id, user_id: item.user_id, title: 'Ancien appel', description: '', created_at: item.created_at }} initialError={false} />)
  expect(screen.getByRole('heading', { name: 'Ancien appel' })).toBeVisible()
  expect(screen.getAllByText('Non renseigné').length).toBeGreaterThan(5)
})
test('recharge via le GET après une erreur serveur', async () => {
  get.mockResolvedValue({ ok: true, status: 200, json: async () => item })
  render(<ProcurementDashboardPage id={item.id} initialProcurement={null} initialError />)
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByRole('heading', { name: item.title })).toBeVisible()
  expect(get).toHaveBeenCalledWith(`/api/procurements/${item.id}`)
})
test('redirige une session expirée et traite une disparition pendant la nouvelle tentative', async () => {
  get.mockResolvedValueOnce({ ok: false, status: 401 }).mockResolvedValueOnce({ ok: false, status: 404 })
  render(<ProcurementDashboardPage id={item.id} initialProcurement={null} initialError />)
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/login'))
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByRole('heading', { name: 'Appel d’offres introuvable' })).toBeVisible()
})
test('le toast disparaît et nettoie seulement le paramètre de création', () => {
  jest.useFakeTimers(); params = new URLSearchParams('procurementCreated=true&view=overview')
  render(<ProcurementDashboardPage id={item.id} initialProcurement={item} initialError={false} />)
  expect(screen.getByRole('status')).toHaveTextContent('créé avec succès')
  expect(router.replace).toHaveBeenCalledWith(`/procurements/${item.id}?view=overview`, { scroll: false })
  act(() => jest.advanceTimersByTime(5300))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  jest.useRealTimers()
})
test('le menu mobile expose et ferme la navigation au clavier', () => {
  render(<ProcurementDashboardPage id={item.id} initialProcurement={item} initialError={false} />)
  const toggle = screen.getByRole('button', { name: 'Ouvrir le menu de l’appel d’offres' })
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  fireEvent.keyDown(screen.getByRole('navigation'), { key: 'Escape' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(toggle).toHaveFocus()
})

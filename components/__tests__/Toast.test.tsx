import { act, fireEvent, render, screen } from '@testing-library/react'
import Toast from '../Toast'

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

test('ferme automatiquement après la durée et la transition', () => {
  const onClose = jest.fn()
  render(<Toast message="Enregistré" isVisible onClose={onClose} />)
  expect(screen.getByRole('status')).toHaveTextContent('Enregistré')
  act(() => jest.advanceTimersByTime(4999))
  expect(onClose).not.toHaveBeenCalled()
  act(() => jest.advanceTimersByTime(301))
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('permet de fermer plus tôt sans double rappel', () => {
  const onClose = jest.fn()
  function Example() {
    return <Toast message="Enregistré" isVisible onClose={onClose} />
  }
  render(<Example />)
  fireEvent.click(screen.getByRole('button', { name: 'Fermer la notification' }))
  fireEvent.click(screen.getByRole('button', { name: 'Fermer la notification' }))
  act(() => jest.advanceTimersByTime(300))
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('annule les rappels en attente au démontage', () => {
  const onClose = jest.fn()
  const { unmount } = render(<Toast message="Enregistré" isVisible onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Fermer la notification' }))
  unmount()
  act(() => jest.runAllTimers())
  expect(onClose).not.toHaveBeenCalled()
})

test('utilise le callback courant sans repousser le délai', () => {
  const first = jest.fn()
  const latest = jest.fn()
  const { rerender } = render(<Toast message="Enregistré" isVisible onClose={first} />)
  act(() => jest.advanceTimersByTime(4000))
  rerender(<Toast message="Enregistré" isVisible onClose={latest} />)
  act(() => jest.advanceTimersByTime(1300))
  expect(first).not.toHaveBeenCalled()
  expect(latest).toHaveBeenCalledTimes(1)
})

test('repart sur une durée complète pour une nouvelle notification', () => {
  const onClose = jest.fn()
  const { rerender } = render(<Toast message="Créé" isVisible onClose={onClose} />)
  act(() => jest.advanceTimersByTime(4900))
  rerender(<Toast message="Supprimé" isVisible onClose={onClose} />)
  act(() => jest.advanceTimersByTime(400))
  expect(onClose).not.toHaveBeenCalled()
  expect(screen.getByRole('status')).toHaveTextContent('Supprimé')
  act(() => jest.advanceTimersByTime(4900))
  expect(onClose).toHaveBeenCalledTimes(1)
})

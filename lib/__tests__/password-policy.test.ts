import { PASSWORD_HINT, PASSWORD_MIN_LENGTH, validateNewPassword } from '../password-policy'

describe('validateNewPassword', () => {
  test('refuse un mot de passe de moins de 8 caractères', () => {
    expect(validateNewPassword('1234567', '1234567')).toMatch(/au moins 8 caractères/)
  })

  test('refuse une confirmation différente', () => {
    expect(validateNewPassword('motdepasse', 'motdepassf')).toMatch(/ne correspondent pas/)
  })

  test('accepte 8 caractères identiques', () => {
    expect(validateNewPassword('12345678', '12345678')).toBeNull()
  })

  test('expose la règle des 8 caractères', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
    expect(PASSWORD_HINT).toBe('8 caractères minimum.')
  })
})

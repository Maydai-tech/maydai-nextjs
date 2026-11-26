import { PASSWORD_HINT, PASSWORD_MIN_LENGTH, validateNewPassword } from '../password-policy'

describe('validateNewPassword', () => {
  test('refuse un mot de passe de moins de 12 caractères', () => {
    expect(validateNewPassword('Abc-1234567', 'Abc-1234567')).toMatch(/au moins 12 caractères/)
  })

  test('refuse une confirmation différente', () => {
    expect(validateNewPassword('Motdepasse-2026', 'Motdepasse-2027')).toMatch(/ne correspondent pas/)
  })

  test('accepte 12 caractères identiques avec les quatre types', () => {
    expect(validateNewPassword('Abc-12345678', 'Abc-12345678')).toBeNull()
  })

  test('expose la règle des 12 caractères', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12)
    expect(PASSWORD_HINT).toBe('12 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.')
  })
})

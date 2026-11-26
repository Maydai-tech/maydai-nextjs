import { PASSWORD_HINT, PASSWORD_MIN_LENGTH, passwordServerErrorMessage, validateNewPassword } from '../password-policy'

describe('validateNewPassword (règle renforcée)', () => {
  test('refuse un mot de passe de moins de 12 caractères', () => {
    expect(validateNewPassword('Abcdef-1234', 'Abcdef-1234')).toMatch(/au moins 12 caractères/)
  })

  test.each([
    ['abcdefgh-1234', 'une majuscule'],
    ['ABCDEFGH-1234', 'une minuscule'],
    ['Abcdefgh-ijkl', 'un chiffre'],
    ['Abcdefgh12345', 'un caractère spécial'],
    ['Abcdefgh12345é', 'un caractère spécial'],
  ])('refuse %s : il manque %s', (password, missing) => {
    expect(validateNewPassword(password, password)).toBe(`Le mot de passe doit contenir au moins ${missing}.`)
  })

  test('liste tous les types manquants', () => {
    expect(validateNewPassword('abcdefghijkl', 'abcdefghijkl')).toBe(
      'Le mot de passe doit contenir au moins une majuscule, un chiffre, un caractère spécial.'
    )
  })

  test('refuse une confirmation différente', () => {
    expect(validateNewPassword('Motdepasse-2026', 'Motdepasse-2027')).toMatch(/ne correspondent pas/)
  })

  test('accepte 12 caractères avec les quatre types', () => {
    expect(validateNewPassword('Abcdefgh-123', 'Abcdefgh-123')).toBeNull()
    expect(validateNewPassword('Phrase de 4 mots!', 'Phrase de 4 mots!')).toBeNull()
  })

  test('expose la règle affichée à l’utilisateur', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12)
    expect(PASSWORD_HINT).toBe('12 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.')
  })
})

describe('passwordServerErrorMessage', () => {
  test('mot de passe présent dans une fuite connue', () => {
    expect(passwordServerErrorMessage({ code: 'weak_password', reasons: ['pwned'] }, 'x')).toMatch(/fuite de données connue/)
  })

  test('mot de passe trop faible pour le serveur → rappelle la règle', () => {
    expect(passwordServerErrorMessage({ code: 'weak_password', reasons: ['length'] }, 'x')).toBe(
      'Mot de passe trop faible : 12 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.'
    )
  })

  test('même mot de passe, puis autre erreur → message de repli', () => {
    expect(passwordServerErrorMessage({ code: 'same_password' }, 'x')).toMatch(/différent de l’actuel/)
    expect(passwordServerErrorMessage({ code: 'unexpected_failure' }, 'Repli')).toBe('Repli')
    expect(passwordServerErrorMessage(null, 'Repli')).toBe('Repli')
  })
})

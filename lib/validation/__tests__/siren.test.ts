import { validateSIREN, formatSIREN, cleanSIREN, validateAndFormatSIREN } from '../siren'

describe('SIREN Validation', () => {
  describe('validateSIREN', () => {
    describe('valid SIREN numbers', () => {
      test('validates Apple France SIREN (732829320)', () => {
        expect(validateSIREN('732829320')).toBe(true)
      })

      test('validates Google France SIREN (542065479)', () => {
        expect(validateSIREN('542065479')).toBe(true)
      })

      test('validates Microsoft France SIREN (327733184)', () => {
        expect(validateSIREN('327733184')).toBe(true)
      })

      test('validates SIREN as number type', () => {
        expect(validateSIREN(732829320)).toBe(true)
      })

      test('validates SIREN with spaces', () => {
        expect(validateSIREN('732 829 320')).toBe(true)
      })

      test('validates SIREN with mixed formatting', () => {
        expect(validateSIREN('732-829-320')).toBe(true)
      })
    })

    describe('invalid SIREN numbers', () => {
      test('rejects sequential digits (123456789)', () => {
        expect(validateSIREN('123456789')).toBe(false)
      })

      test('rejects all zeros', () => {
        expect(validateSIREN('000000000')).toBe(false)
      })

      test('rejects all ones', () => {
        expect(validateSIREN('111111111')).toBe(false)
      })

      test('rejects SIREN with invalid checksum (732829321)', () => {
        expect(validateSIREN('732829321')).toBe(false)
      })

      test('rejects SIREN with invalid checksum (542065478)', () => {
        expect(validateSIREN('542065478')).toBe(false)
      })
    })

    describe('invalid format', () => {
      test('rejects non-numeric characters', () => {
        expect(validateSIREN('ABCDEFGHI')).toBe(false)
      })

      test('rejects alphanumeric string', () => {
        expect(validateSIREN('732A29320')).toBe(false)
      })

      test('rejects too short SIREN (8 digits)', () => {
        expect(validateSIREN('73282932')).toBe(false)
      })

      test('rejects too long SIREN (10 digits)', () => {
        expect(validateSIREN('7328293200')).toBe(false)
      })

      test('rejects empty string', () => {
        expect(validateSIREN('')).toBe(false)
      })

      test('rejects special characters only', () => {
        expect(validateSIREN('---***---')).toBe(false)
      })
    })
  })

  describe('cleanSIREN', () => {
    test('removes spaces from SIREN', () => {
      expect(cleanSIREN('732 829 320')).toBe('732829320')
    })

    test('removes dashes from SIREN', () => {
      expect(cleanSIREN('732-829-320')).toBe('732829320')
    })

    test('removes all non-digit characters', () => {
      expect(cleanSIREN('732.829.320')).toBe('732829320')
    })

    test('handles mixed formatting', () => {
      expect(cleanSIREN('732 829-320')).toBe('732829320')
    })

    test('returns unchanged if already clean', () => {
      expect(cleanSIREN('732829320')).toBe('732829320')
    })

    test('handles empty string', () => {
      expect(cleanSIREN('')).toBe('')
    })

    test('removes letters and keeps digits', () => {
      expect(cleanSIREN('ABC732829320XYZ')).toBe('732829320')
    })
  })

  describe('formatSIREN', () => {
    test('formats clean SIREN with spaces', () => {
      expect(formatSIREN('732829320')).toBe('732 829 320')
    })

    test('reformats already formatted SIREN', () => {
      expect(formatSIREN('732 829 320')).toBe('732 829 320')
    })

    test('formats SIREN with dashes', () => {
      expect(formatSIREN('732-829-320')).toBe('732 829 320')
    })

    test('returns original if not 9 digits', () => {
      expect(formatSIREN('12345')).toBe('12345')
    })

    test('returns original for invalid SIREN', () => {
      expect(formatSIREN('ABCDEFGHI')).toBe('ABCDEFGHI')
    })

    test('formats SIREN with mixed characters', () => {
      expect(formatSIREN('732.829.320')).toBe('732 829 320')
    })
  })

  describe('validateAndFormatSIREN', () => {
    test('returns formatted SIREN if valid', () => {
      expect(validateAndFormatSIREN('732829320')).toBe('732 829 320')
    })

    test('returns formatted SIREN from already formatted input', () => {
      expect(validateAndFormatSIREN('732 829 320')).toBe('732 829 320')
    })

    test('returns null if SIREN invalid', () => {
      expect(validateAndFormatSIREN('123456789')).toBeNull()
    })

    test('returns null if format invalid', () => {
      expect(validateAndFormatSIREN('ABCDEFGHI')).toBeNull()
    })

    test('returns null for empty string', () => {
      expect(validateAndFormatSIREN('')).toBeNull()
    })

    test('handles SIREN with formatting characters', () => {
      expect(validateAndFormatSIREN('732-829-320')).toBe('732 829 320')
    })
  })

  describe('edge cases', () => {
    test('handles numeric input with leading zeros', () => {
      // Note: Number type will drop leading zeros, so this tests string handling
      expect(validateSIREN('012345678')).toBe(false)
    })

    test('handles very large numbers', () => {
      expect(validateSIREN(999999999999999)).toBe(false)
    })

    test('handles negative numbers', () => {
      expect(validateSIREN(-732829320)).toBe(false)
    })

    test('handles string with unicode characters', () => {
      expect(validateSIREN('732829320🇫🇷')).toBe(true) // Should clean and validate
    })
  })
})

/**
 * SIREN Validation Utilities
 *
 * SIREN (Système d'Identification du Répertoire des ENtreprises) is a 9-digit
 * French business identification number. The validity of a SIREN is checked
 * using the Luhn algorithm.
 *
 * @see https://fr.wikipedia.org/wiki/Syst%C3%A8me_d%27identification_du_r%C3%A9pertoire_des_entreprises
 */

/**
 * Removes all non-digit characters from a string
 * @param input - The input string to clean
 * @returns The cleaned string containing only digits
 */
export function cleanSIREN(input: string): string {
  return input.replace(/\D/g, '')
}

/**
 * Formats a SIREN number as "XXX XXX XXX"
 * @param siren - The SIREN number to format (with or without spaces)
 * @returns The formatted SIREN number, or the input if invalid format
 */
export function formatSIREN(siren: string): string {
  const cleaned = cleanSIREN(siren)

  if (cleaned.length !== 9) {
    return siren // Return original if not 9 digits
  }

  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`
}

/**
 * Validates a SIREN number using the Luhn algorithm
 *
 * The Luhn algorithm works as follows:
 * 1. Starting from the right, double every second digit
 * 2. If doubling results in a number > 9, subtract 9
 * 3. Sum all the digits
 * 4. If the sum is divisible by 10, the number is valid
 *
 * Note: For SIREN validation, we double digits in odd positions (1st, 3rd, 5th, etc.)
 * when counting from the left.
 *
 * @param siren - The SIREN number to validate (string or number)
 * @returns true if the SIREN is valid, false otherwise
 */
export function validateSIREN(siren: string | number): boolean {
  // Reject negative numbers
  if (typeof siren === 'number' && siren < 0) {
    return false
  }

  // Convert to string and clean
  const sirenStr = typeof siren === 'number' ? siren.toString() : siren
  const cleaned = cleanSIREN(sirenStr)

  // SIREN must be exactly 9 digits
  if (cleaned.length !== 9) {
    return false
  }

  // Check that all characters are digits
  if (!/^\d{9}$/.test(cleaned)) {
    return false
  }

  // Reject all zeros (invalid SIREN)
  if (cleaned === '000000000') {
    return false
  }

  // Apply Luhn algorithm
  let sum = 0

  for (let i = 0; i < 9; i++) {
    let digit = parseInt(cleaned[i], 10)

    // Double every digit in even position (1, 3, 5, 7 when 0-indexed = positions 2, 4, 6, 8 when 1-indexed)
    if (i % 2 === 1) {
      digit *= 2
      // If result > 9, subtract 9
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
  }

  // Valid if sum is divisible by 10
  return sum % 10 === 0
}

/**
 * Validates and returns formatted SIREN or null if invalid
 * @param siren - The SIREN number to validate and format
 * @returns Formatted SIREN if valid, null otherwise
 */
export function validateAndFormatSIREN(siren: string): string | null {
  if (validateSIREN(siren)) {
    return formatSIREN(siren)
  }
  return null
}

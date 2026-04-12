import {
  errorResponseBody,
  extractPostgrestParts,
  primaryErrorLine,
  logEvaluationRunStartError,
  safeSerializeUnknown,
} from '../error-format'

describe('evaluation-runs/start error-format', () => {
  test('extractPostgrestParts lit message, code, details, hint', () => {
    expect(
      extractPostgrestParts({
        message: 'm',
        code: 'c',
        details: { x: 1 },
        hint: 'h',
      })
    ).toEqual({
      message: 'm',
      code: 'c',
      details: '{"x":1}',
      hint: 'h',
    })
  })

  test('extractPostgrestParts accepte message non-string et champs alternatifs', () => {
    expect(
      extractPostgrestParts({
        message: 42,
        code: 23505,
      })
    ).toEqual({
      message: '42',
      code: '23505',
      details: undefined,
      hint: undefined,
    })
    expect(
      extractPostgrestParts({
        error_description: 'oauth style',
      })
    ).toEqual({
      message: 'oauth style',
      code: undefined,
      details: undefined,
      hint: undefined,
    })
  })

  test('primaryErrorLine concatène les parties non vides', () => {
    expect(
      primaryErrorLine(
        { message: 'a', code: 'b', details: undefined, hint: undefined },
        null
      )
    ).toBe('a | b')
  })

  test('errorResponseBody ne produit jamais error vide et enrichit le diagnostic', () => {
    const b = errorResponseBody({})
    expect(b.error.length).toBeGreaterThan(0)
    expect(b.error).not.toBe('Unknown error')
    expect(b.error_type).toBe('Object')
    expect(b.error_keys).toBe('(none)')
    expect(b.raw_preview).toBe('{}')

    expect(errorResponseBody(null).error.length).toBeGreaterThan(0)
    expect(errorResponseBody(undefined).error.length).toBeGreaterThan(0)
  })

  test('errorResponseBody inclut step quand fourni', () => {
    const b = errorResponseBody({ message: 'x' }, 'open_run_select')
    expect(b.step).toBe('open_run_select')
    expect(b.error).toContain('x')
  })

  test('errorResponseBody accepte step service_role_probe', () => {
    const b = errorResponseBody({ message: 'probe', code: 'X' }, 'service_role_probe')
    expect(b.step).toBe('service_role_probe')
    expect(b.code).toBe('X')
  })

  test('errorResponseBody inclut code et details quand présents', () => {
    const b = errorResponseBody({
      message: 'duplicate',
      code: '23505',
      details: 'Key (usecase_id)',
      hint: 'hint',
    })
    expect(b.error).toContain('duplicate')
    expect(b.code).toBe('23505')
    expect(b.details).toContain('Key')
    expect(b.hint).toBe('hint')
  })

  test('safeSerializeUnknown tronque et gère Error', () => {
    const e = new Error('hello')
    const s = safeSerializeUnknown(e, 80)
    expect(s).toContain('hello')
    expect(s).toContain('Error')
  })

  test('logEvaluationRunStartError appelle console.error avec champs diagnostic', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    logEvaluationRunStartError('insert_run', { useCaseId: 'u1', pathMode: 'short' }, { code: '42' })
    expect(spy).toHaveBeenCalledWith(
      '[evaluation-runs/start]',
      expect.objectContaining({
        step: 'insert_run',
        useCaseId: 'u1',
        pathMode: 'short',
        code: '42',
        constructorName: 'Object',
        typeof: 'object',
        serialized: expect.any(String),
      })
    )
    spy.mockRestore()
  })
})

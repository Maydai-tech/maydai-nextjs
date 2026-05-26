import {
  extractGclidFromGoogleLeadPayload,
  extractGoogleLeadFields,
} from '@/lib/google-ads/utils'

describe('extractGclidFromGoogleLeadPayload', () => {
  test('lit gclid à la racine du JSON', () => {
    const params = new URLSearchParams()
    expect(
      extractGclidFromGoogleLeadPayload(
        { gclid: '  TeSter-123-ABcDeFgh  ' },
        params
      )
    ).toBe('TeSter-123-ABcDeFgh')
  })

  test('lit gcl_id et google_click_id', () => {
    const params = new URLSearchParams()
    expect(
      extractGclidFromGoogleLeadPayload({ gcl_id: 'from-gcl-id' }, params)
    ).toBe('from-gcl-id')
    expect(
      extractGclidFromGoogleLeadPayload(
        { google_click_id: 'from-google-click' },
        params
      )
    ).toBe('from-google-click')
  })

  test('lit gclid depuis les query params', () => {
    const params = new URLSearchParams('gclid=from-url')
    expect(extractGclidFromGoogleLeadPayload({}, params)).toBe('from-url')
  })

  test('lit gclid dans lead_data imbriqué', () => {
    const params = new URLSearchParams()
    expect(
      extractGclidFromGoogleLeadPayload(
        { lead_data: { gclid: 'nested-gclid' } },
        params
      )
    ).toBe('nested-gclid')
  })

  test('lit gclid depuis user_column_data via column_id GCLID', () => {
    const params = new URLSearchParams()
    const byColumnId = new Map([['GCLID', 'from-column']])
    expect(
      extractGclidFromGoogleLeadPayload({ user_column_data: [] }, params, byColumnId)
    ).toBe('from-column')
  })
})

describe('extractGoogleLeadFields', () => {
  test('mappe gclid pour insertion lead (click_id côté webhook)', () => {
    const parsed = extractGoogleLeadFields(
      {
        gclid: 'CjwKCAjwnZfPBhAGEiwAzg',
        user_column_data: [
          { column_id: 'EMAIL', string_value: 'test@example.com' },
        ],
      },
      new URLSearchParams()
    )
    expect(parsed.gclid).toBe('CjwKCAjwnZfPBhAGEiwAzg')
    expect(parsed.email).toBe('test@example.com')
  })
})

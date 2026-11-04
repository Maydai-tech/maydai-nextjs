/** @jest-environment node */

import {
  getStripeSubscriptionPeriodIso,
  getStripeSubscriptionPeriodUnix,
} from '../subscription-period'

const YEARLY_START = 1735689600 // 2025-01-01T00:00:00Z
const YEARLY_END = 1767225600 // 2026-01-01T00:00:00Z

describe('getStripeSubscriptionPeriodUnix', () => {
  test('lit la période sur l’item (API Basil) même si le top-level est absent', () => {
    const period = getStripeSubscriptionPeriodUnix({
      items: {
        data: [
          {
            current_period_start: YEARLY_START,
            current_period_end: YEARLY_END,
          },
        ],
      },
    })

    expect(period).toEqual({ start: YEARLY_START, end: YEARLY_END })
  })

  test('ne tombe pas sur un fallback now/+30j quand seuls les champs top-level manquent', () => {
    const period = getStripeSubscriptionPeriodUnix({
      items: {
        data: [
          {
            current_period_start: YEARLY_START,
            current_period_end: YEARLY_END,
          },
        ],
      },
    })
    const iso = getStripeSubscriptionPeriodIso({
      items: {
        data: [
          {
            current_period_start: YEARLY_START,
            current_period_end: YEARLY_END,
          },
        ],
      },
    })

    const thirtyDaysFromNow = Date.now() / 1000 + 30 * 24 * 60 * 60
    expect(period.end).toBe(YEARLY_END)
    expect(period.end).toBeLessThan(thirtyDaysFromNow)
    expect(iso.end).toBe('2026-01-01T00:00:00.000Z')
    expect(iso.start).toBe('2025-01-01T00:00:00.000Z')
  })

  test('accepte encore les champs top-level (payloads pré-Basil / tests)', () => {
    expect(
      getStripeSubscriptionPeriodUnix({
        current_period_start: YEARLY_START,
        current_period_end: YEARLY_END,
      })
    ).toEqual({ start: YEARLY_START, end: YEARLY_END })
  })

  test('préfère l’item au top-level quand les deux sont présents', () => {
    expect(
      getStripeSubscriptionPeriodUnix({
        current_period_start: 1,
        current_period_end: 2,
        items: {
          data: [
            {
              current_period_start: YEARLY_START,
              current_period_end: YEARLY_END,
            },
          ],
        },
      })
    ).toEqual({ start: YEARLY_START, end: YEARLY_END })
  })

  test('retourne null plutôt que d’inventer une période de 30 jours', () => {
    expect(getStripeSubscriptionPeriodUnix({})).toEqual({ start: null, end: null })
    expect(
      getStripeSubscriptionPeriodUnix({
        current_period_start: 0,
        current_period_end: 0,
        items: { data: [] },
      })
    ).toEqual({ start: null, end: null })
  })
})

/**
 * Stripe API Basil (2025-03-31 et suivantes) a déplacé
 * `current_period_start` / `current_period_end` du Subscription
 * vers chaque SubscriptionItem (`items.data[]`).
 *
 * Le client MaydAI pinne `2025-08-27.basil` : les champs top-level
 * sont absents. Lire le haut de l’objet (ou tomber sur now/+30j)
 * corrompt les dates de facturation en base.
 */

export type StripePeriodSource = {
  current_period_start?: number | null
  current_period_end?: number | null
  items?: {
    data?: Array<{
      current_period_start?: number | null
      current_period_end?: number | null
    }>
  }
}

function isUnixSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function getStripeSubscriptionPeriodUnix(subscription: StripePeriodSource): {
  start: number | null
  end: number | null
} {
  const item = subscription.items?.data?.[0]
  const start = isUnixSeconds(item?.current_period_start)
    ? item.current_period_start
    : isUnixSeconds(subscription.current_period_start)
      ? subscription.current_period_start
      : null
  const end = isUnixSeconds(item?.current_period_end)
    ? item.current_period_end
    : isUnixSeconds(subscription.current_period_end)
      ? subscription.current_period_end
      : null
  return { start, end }
}

export function unixSecondsToIso(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString()
}

/** Dates ISO, ou `null` si Stripe n’a envoyé aucune période exploitable. */
export function getStripeSubscriptionPeriodIso(subscription: StripePeriodSource): {
  start: string | null
  end: string | null
} {
  const { start, end } = getStripeSubscriptionPeriodUnix(subscription)
  return {
    start: start != null ? unixSecondsToIso(start) : null,
    end: end != null ? unixSecondsToIso(end) : null,
  }
}

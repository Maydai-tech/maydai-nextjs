import type { MaydAIPlan } from '@/lib/api/plans'

/** Clé pour associer une icône Lucide statique côté UI (voir `PricingSummaryCard`). */
export type PricingPlanIconVariant = 'user' | 'zap' | 'building' | 'building2'

/** ViewModel d’affichage landing : mensuel uniquement, sans état React. */
export type PricingCardDisplayModel = {
  planId: string
  headline: string
  description: string
  /** Montant mensuel pour le bloc prix (police mono), ex. "0" ou "49". */
  priceMonthlyAmount: string
  features: readonly string[]
  isRecommended: boolean
  primaryCtaLabel: string
  primaryHref: string
  iconVariant: PricingPlanIconVariant
  /** Segment pour aria-label CTA (ex. "49€ HT"). */
  priceMonthlyForAria: string
}

function mapPlanIdToIconVariant(planId: string): PricingPlanIconVariant {
  switch (planId) {
    case 'freemium':
      return 'user'
    case 'starter':
      return 'zap'
    case 'pro':
      return 'building'
    case 'enterprise':
      return 'building2'
    default:
      return 'user'
  }
}

export function buildPricingCardDisplay(plan: MaydAIPlan): PricingCardDisplayModel {
  const priceMonthlyAmount = plan.free ? '0' : String(plan.price.monthly)
  const priceMonthlyForAria = plan.free ? '0€ HT' : `${plan.price.monthly}€ HT`

  return {
    planId: plan.id,
    headline: plan.name,
    description: (plan.description ?? '').trim(),
    priceMonthlyAmount,
    features: plan.features ?? [],
    isRecommended: Boolean(plan.popular),
    primaryCtaLabel: 'Choisir ce forfait',
    primaryHref: `/signup?plan=${encodeURIComponent(plan.id)}`,
    iconVariant: mapPlanIdToIconVariant(plan.id),
    priceMonthlyForAria,
  }
}

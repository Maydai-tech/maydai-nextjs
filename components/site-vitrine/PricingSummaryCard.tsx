import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  Building,
  Building2,
  Check,
  Lock,
  Server,
  ShieldCheck,
  User,
  Zap,
} from 'lucide-react'
import { fetchPlans, type MaydAIPlan } from '@/lib/api/plans'
import { PLAN_IDS } from '@/lib/stripe/config/plans'
import {
  buildPricingCardDisplay,
  type PricingCardDisplayModel,
  type PricingPlanIconVariant,
} from '@/lib/site-vitrine/pricing-view'

const PLAN_ICONS: Record<PricingPlanIconVariant, LucideIcon> = {
  user: User,
  zap: Zap,
  building: Building,
  building2: Building2,
}

function PlanHeaderIcon({ variant }: { variant: PricingPlanIconVariant }) {
  const Icon = PLAN_ICONS[variant]
  return <Icon className="h-8 w-8 text-[#0080A3]" aria-hidden="true" />
}

/** Bloc réassurance sous la grille tarifs (landing). */
function PricingLandingReassurance() {
  return (
    <aside
      className="mt-12 flex flex-col justify-center gap-8 text-sm text-gray-600 sm:flex-row"
      aria-label="Réassurance : sécurité et conformité"
    >
      <div className="flex items-center justify-center gap-2 sm:justify-start">
        <ShieldCheck className="h-5 w-5 shrink-0 text-[#0080A3]" aria-hidden="true" />
        <span>Conforme RGPD &amp; IA Act</span>
      </div>
      <div className="flex items-center justify-center gap-2 sm:justify-start">
        <Server className="h-5 w-5 shrink-0 text-[#0080A3]" aria-hidden="true" />
        <span>Hébergement France</span>
      </div>
      <div className="flex items-center justify-center gap-2 sm:justify-start">
        <Lock className="h-5 w-5 shrink-0 text-[#0080A3]" aria-hidden="true" />
        <span>Paiement sécurisé</span>
      </div>
    </aside>
  )
}

function PricingCard({
  model,
}: {
  model: PricingCardDisplayModel
}) {
  const { isRecommended } = model
  const cardClass = isRecommended
    ? 'relative flex min-w-0 flex-col rounded-xl border-2 border-[#0080A3] bg-white p-5 shadow-lg lg:-translate-y-4 md:p-6'
    : 'flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6'

  const ctaRecommended =
    'inline-flex w-full items-center justify-center rounded-lg bg-[#0080A3] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#006b88] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2'

  const ctaStandard =
    'inline-flex w-full items-center justify-center rounded-lg border border-[#0080A3] bg-white px-4 py-3 text-center text-sm font-semibold text-[#0080A3] transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2'

  const ctaAriaLabel = `Choisir le forfait ${model.headline}, ${model.priceMonthlyForAria} par mois hors taxes`

  return (
    <article className={`font-sans ${cardClass}`}>
      {isRecommended ? (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#0080A3] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          Recommandé
        </div>
      ) : null}

      <div className="mb-3 flex justify-center">
        <PlanHeaderIcon variant={model.iconVariant} />
      </div>

      <h3 className="mb-2 text-center text-lg font-bold text-[#0080A3]">{model.headline}</h3>

      <p className="mb-4 text-center">
        <span className="font-mono text-4xl font-extrabold tabular-nums text-gray-900">
          {model.priceMonthlyAmount}
        </span>
        <span className="text-base font-normal text-gray-600"> € HT / mois</span>
      </p>

      {model.description ? (
        <p className="mb-4 text-center text-sm text-gray-600">{model.description}</p>
      ) : null}

      <hr className="mb-4 border-gray-200" />

      <ul className="mb-6 flex-1 space-y-2.5" role="list">
        {model.features.map((feature, idx) => (
          <li key={`${model.planId}-f-${idx}`} className="flex gap-3 text-sm text-gray-800">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-[#0080A3]"
              aria-hidden="true"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <Link
          href={model.primaryHref}
          className={isRecommended ? ctaRecommended : ctaStandard}
          aria-label={ctaAriaLabel}
        >
          {model.primaryCtaLabel}
        </Link>
      </div>
    </article>
  )
}

/**
 * Grille tarifs landing (Server Component), ViewModel mensuel uniquement.
 */
export default async function PricingSummaryCard() {
  let orderedPlans: MaydAIPlan[] = []

  try {
    const fetched = await fetchPlans()
    const byId = new Map(fetched.map((p) => [p.id, p]))
    orderedPlans = PLAN_IDS.map((id) => byId.get(id)).filter(
      (p): p is MaydAIPlan => p != null
    )
  } catch (error: unknown) {
    console.error('[PricingSummaryCard] Erreur SSR fetchPlans:', error)
    orderedPlans = []
  }

  if (orderedPlans.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600 shadow-sm font-sans">
        Tarifs momentanément indisponibles.
      </div>
    )
  }

  const displayModels = orderedPlans.map(buildPricingCardDisplay)

  return (
    <div className="font-sans w-full">
      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-4">
        {displayModels.map((model) => (
          <PricingCard key={model.planId} model={model} />
        ))}
      </div>
      <PricingLandingReassurance />
    </div>
  )
}

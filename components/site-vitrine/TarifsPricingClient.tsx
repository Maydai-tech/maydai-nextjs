'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import BillingToggle from '@/components/Subscriptions/BillingToggle'
import { fetchPlans, type MaydAIPlan } from '@/lib/api/plans'

type BillingCycle = 'monthly' | 'yearly'

const PLAN_IDS_IN_ORDER = ['freemium', 'starter', 'pro', 'enterprise'] as const

const LABELS_BY_PLAN_ID: Record<(typeof PLAN_IDS_IN_ORDER)[number], { title: string; cta: string }> = {
  freemium: { title: 'Freemium', cta: 'Commencer' },
  starter: { title: 'Starter', cta: 'Commencer' },
  pro: { title: 'Pro', cta: "C'est parti !" },
  enterprise: { title: 'Enterprise', cta: 'Commencer' }
}

const CTA_CLASS_DEFAULT =
  'w-full text-center bg-white text-[#0080a3] border border-[#0080a3] hover:bg-[#0080a3] hover:bg-opacity-10 font-bold py-3 px-6 rounded-lg transition-colors duration-300'
const CTA_CLASS_PRO =
  'w-full text-center bg-[#0080a3] text-white hover:bg-[#006d8a] font-bold py-3 px-6 rounded-lg transition-colors duration-300'

function CheckIcon() {
  return (
    <svg
      className="w-6 h-6 text-[#0080a3] mr-3 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
    </svg>
  )
}

function formatPrice(plan: MaydAIPlan, billingCycle: BillingCycle): { amountText: string; suffixText: string } {
  if (plan.free) {
    return { amountText: '0€', suffixText: '(Gratuit)' }
  }

  const amount = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly
  const suffixText = billingCycle === 'yearly' ? 'HT / an' : 'HT / mois'
  return { amountText: `${amount}€`, suffixText }
}

export default function TarifsPricingClient() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [plans, setPlans] = useState<MaydAIPlan[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setError(null)
        const fetched = await fetchPlans()
        if (!cancelled) setPlans(fetched)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load plans')
        setPlans([])
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const planById = useMemo(() => {
    const map = new Map<string, MaydAIPlan>()
    for (const p of plans || []) map.set(p.id, p)
    return map
  }, [plans])

  const handleToggle = () => {
    setBillingCycle((c) => (c === 'monthly' ? 'yearly' : 'monthly'))
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-center">
        <BillingToggle billingCycle={billingCycle} onToggle={handleToggle} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {PLAN_IDS_IN_ORDER.map((planId) => {
          const plan = planById.get(planId)
          const label = LABELS_BY_PLAN_ID[planId]
          const isPro = planId === 'pro'

          const isLoading = plans === null
          const isMissing = !isLoading && !plan

          if (isLoading) {
            return (
              <div
                key={planId}
                className={`rounded-2xl p-8 flex flex-col ${
                  isPro ? 'border-2 border-[#0080a3] shadow-2xl relative' : 'border border-gray-200'
                }`}
              >
                <div className="flex flex-col items-center mb-4">
                  <div className="bg-gray-100 rounded-full w-12 h-12 mb-3 animate-pulse" />
                  <div className="h-8 bg-gray-100 rounded w-24 animate-pulse" />
                </div>
                <div className="text-center mb-4">
                  <div className="h-12 bg-gray-100 rounded w-24 mx-auto animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-20 mx-auto mt-2 animate-pulse" />
                </div>
                <div className="h-20 bg-gray-50 rounded animate-pulse mb-6" />
                <div className="h-12 bg-gray-100 rounded animate-pulse" />
                <div className="mt-6 h-4 bg-gray-50 rounded animate-pulse" />
                <ul className="space-y-4 flex-grow mt-4">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex items-start">
                      <div className="w-6 h-6 bg-gray-100 rounded animate-pulse mr-3" />
                      <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                    </li>
                  ))}
                </ul>
              </div>
            )
          }

          if (isMissing) {
            return (
              <div key={planId} className="border border-gray-200 rounded-2xl p-8 flex flex-col">
                <p className="text-sm text-gray-600">Plan indisponible</p>
              </div>
            )
          }

          if (!plan) return null

          const { amountText, suffixText } = formatPrice(plan, billingCycle)

          return (
            <div
              key={planId}
              className={
                isPro
                  ? 'border-2 border-[#0080a3] rounded-2xl p-8 flex flex-col shadow-2xl relative'
                  : 'border border-gray-200 rounded-2xl p-8 flex flex-col hover:shadow-xl transition-shadow duration-300'
              }
            >
              {isPro && (
                <span className="absolute top-0 -translate-y-1/2 bg-[#0080a3] text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                  Recommandé
                </span>
              )}

              <div className="flex flex-col items-center mb-2">
                <Image
                  src={`/icons/${plan.icon || 'default-plan.png'}`}
                  alt={label.title}
                  width={48}
                  height={48}
                  className="w-12 h-12 mb-3"
                />
                <h2 className="text-2xl font-bold text-center" style={{ color: '#0080a3' }}>
                  {label.title}
                </h2>
              </div>

              <div className="mb-4 text-center">
                {plan.free ? (
                  <>
                    <span className="text-5xl font-extrabold" style={{ color: '#0080a3' }}>
                      0€
                    </span>
                    <span className="text-gray-500"> (Gratuit)</span>
                  </>
                ) : (
                  <>
                    <span className="text-5xl font-extrabold" style={{ color: '#0080a3' }}>
                      {amountText}
                    </span>
                    <span className="text-gray-500"> {suffixText}</span>
                  </>
                )}
              </div>

              <p className="text-gray-600 mb-6 h-20">{plan.description}</p>

              <a
                href="/contact"
                className={isPro ? CTA_CLASS_PRO : CTA_CLASS_DEFAULT}
              >
                {label.cta}
              </a>

              <hr className="my-6" />

              <ul className="space-y-4 flex-grow">
                {plan.features.map((feature, idx) => (
                  <li key={`${planId}-${idx}`} className="flex items-start">
                    <CheckIcon />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {error ? (
        <p className="text-center text-xs text-red-600 mt-6" aria-live="polite">
          {error}
        </p>
      ) : null}
    </>
  )
}


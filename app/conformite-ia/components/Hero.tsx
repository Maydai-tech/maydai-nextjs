'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, AppWindow } from 'lucide-react'
import { useMemo } from 'react'
import TrustBadges from '@/components/ui/TrustBadges'

const AI_ACT_FULL_APPLICABILITY_DATE = new Date('2026-08-02')

function useDaysUntil(target: Date) {
  return useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const t = new Date(target)
    t.setHours(0, 0, 0, 0)
    const diff = t.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [target])
}

export default function Hero() {
  const daysLeft = useDaysUntil(AI_ACT_FULL_APPLICABILITY_DATE)

  const handleHeroFreeTrialClick = () => {
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({
        event: 'click_button',
        button_intent: 'essai_gratuit',
        button_location: 'hero',
      })
    }
  }

  const handleHeroDemoClick = () => {
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({
        event: 'click_button',
        button_intent: 'demande_demo',
        button_location: 'hero',
      })
    }
  }

  return (
    <>
      {/* Bandeau header home (sans CTA) */}
      <section className="relative bg-gradient-to-br from-primary-light to-primary-dark text-white py-20 px-4 flex flex-col items-center justify-center text-center min-h-[50vh] overflow-hidden">
        <div className="max-w-2xl mx-auto z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight pl-[5px] pr-[5px]">
            MaydAI :{' '}
            <span className="text-[#ffab5a]">plateforme de conformité AI Act</span>{' '}
            qui vous accompagne dans vos Audits IA
          </h1>

          <p className="text-lg md:text-xl font-medium text-white/95">
            Plus que <strong className="text-3xl md:text-4xl lg:text-5xl font-extrabold">{daysLeft} jours</strong> avant le plein déploiement
            de l&apos;AI Act, rendant légalement obligatoires les exigences de
            transparence et de sécurité pour la majorité des systèmes
            d&apos;intelligence artificielle.
          </p>
        </div>

        <Image
          src="/content/compliance-ai-eu.webp"
          alt=""
          width={256}
          height={256}
          className="absolute right-8 bottom-0 w-40 md:w-64 h-auto opacity-30 pointer-events-none select-none"
          priority
          sizes="(max-width: 768px) 160px, 256px"
          aria-hidden
        />
      </section>

      {/* Section "Sécurisez et Optimisez..." */}
      <section className="relative overflow-hidden pt-8 pb-16 md:pt-12 md:pb-24 px-5 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0080a3]/5 via-white to-blue-50/50 -z-10" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#0080a3]/[0.04] rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl -z-10" />

        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1]">
            Sécurisez et Optimisez vos{' '}
            <span className="text-[#0080a3]">projets IA</span> avec MaydAI
          </h2>

          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-10">
            La plateforme tout-en-un pour naviguer l&apos;AI Act et accélérer
            votre déploiement. Audit assisté, gestion des risques et
            gouvernance IA en un seul outil.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0080a3] text-white font-semibold text-lg px-8 py-4 rounded-full shadow-lg hover:bg-[#006280] hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
              onClick={handleHeroFreeTrialClick}
            >
              Démarrer l&apos;essai gratuit
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-gray-700 font-semibold text-lg px-8 py-4 rounded-full border border-gray-300 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-300"
              onClick={handleHeroDemoClick}
            >
              Demander une démo
            </Link>
          </div>

          <div className="mt-6">
            <TrustBadges />
          </div>

          <div className="mt-12">
            {/* Desktop screenshot */}
            <div className="hidden sm:block mx-auto max-w-5xl relative">
              <Image
                src="/screenshots/dashboard-conformite-ai-act-maydai.webp"
                alt="Dashboard plateforme MaydAI - Évaluation des risques AI Act"
                width={1200}
                height={675}
                priority={true}
                style={{ width: '100%', height: 'auto' }}
                className="rounded-xl shadow-2xl border border-gray-100 object-cover"
              />
            </div>

            {/* Mobile stats cards (no image) */}
            <div className="block sm:hidden w-full px-4">
              <div className="bg-gray-50 rounded-2xl shadow-inner border border-gray-200 border-t-4 border-t-[#0080a3] p-4 space-y-4 text-left">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm">
                    <AppWindow className="h-4 w-4 text-[#0080a3]" aria-hidden />
                  </span>
                  <p className="text-sm font-semibold text-gray-800">
                    Extrait de plateforme - MaydAI Mobile
                  </p>
                </div>

                <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-700 text-center">
                    Score de Conformité Global
                  </p>

                  <div className="mt-4 flex items-center justify-center">
                    <div className="relative h-20 w-20">
                      <svg
                        viewBox="0 0 36 36"
                        className="h-20 w-20 -rotate-90"
                        role="img"
                        aria-label="Score de conformité 42%"
                      >
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          className="stroke-gray-200"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          className="stroke-orange-500"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray="42 100"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-extrabold text-orange-500 leading-none">
                          42%
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-600 text-center">
                    Sur 9 cas d&apos;usage évalués
                  </p>
                </div>

                <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-700">
                    Niveaux de risque AI Act
                  </p>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">Inacceptable</span>
                        </div>
                        <div className="mt-1 h-3 rounded-full bg-red-100 overflow-hidden">
                          <div className="h-full w-1/3 bg-red-500 rounded-full" />
                        </div>
                      </div>
                      <span className="h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm inline-flex items-center justify-center text-sm font-semibold text-gray-900">
                        3
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <span className="text-xs font-medium text-gray-600">Élevé</span>
                        <div className="mt-1 h-3 rounded-full bg-orange-100 overflow-hidden">
                          <div className="h-full w-1/3 bg-orange-500 rounded-full" />
                        </div>
                      </div>
                      <span className="h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm inline-flex items-center justify-center text-sm font-semibold text-gray-900">
                        3
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <span className="text-xs font-medium text-gray-600">Limité</span>
                        <div className="mt-1 h-3 rounded-full bg-blue-100 overflow-hidden">
                          <div className="h-full w-1/3 bg-blue-500 rounded-full" />
                        </div>
                      </div>
                      <span className="h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm inline-flex items-center justify-center text-sm font-semibold text-gray-900">
                        3
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <span className="text-xs font-medium text-gray-600">Minimal</span>
                        <div className="mt-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full w-0 bg-gray-400 rounded-full" />
                        </div>
                      </div>
                      <span className="h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm inline-flex items-center justify-center text-sm font-semibold text-gray-900">
                        0
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-700">
                    Scores par principes
                  </p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-gray-700">
                          Supervision Humaine
                        </span>
                        <span className="text-xs font-semibold text-orange-600">
                          48/100
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full w-[48%] rounded-full bg-orange-500" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-gray-700">
                          Transparence
                        </span>
                        <span className="text-xs font-semibold text-blue-600">
                          52/100
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full w-[52%] rounded-full bg-blue-500" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-gray-700">
                          Équité &amp; Non-discrimination
                        </span>
                        <span className="text-xs font-semibold text-emerald-700">
                          79/100
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full w-[79%] rounded-full bg-emerald-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Source : Plateforme MaydAI (Extrait mobile)
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm text-gray-400">
            Premier registre gratuit &middot; Sans carte bancaire &middot; Hébergé en France
          </p>
        </div>
      </section>
    </>
  )
}

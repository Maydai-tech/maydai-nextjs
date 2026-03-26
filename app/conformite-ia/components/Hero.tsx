'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'

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
            >
              Démarrer l&apos;essai gratuit
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-gray-700 font-semibold text-lg px-8 py-4 rounded-full border border-gray-300 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-300"
            >
              Demander une démo
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-400">
            Premier registre gratuit &middot; Sans carte bancaire &middot; Hébergé en France
          </p>
        </div>
      </section>
    </>
  )
}

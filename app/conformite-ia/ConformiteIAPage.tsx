'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { sendLandingCtaClick } from '@/lib/gtm'
import Hero from './components/Hero'
import VideoSection from './components/VideoSection'
import TrustLogos from './components/TrustLogos'
import Features from './components/Features'
import Security from './components/Security'
import LandingFooter from './components/LandingFooter'

export interface ConformiteIAPageProps {
  pricingNode?: React.ReactNode
}

export default function ConformiteIAPage({ pricingNode }: ConformiteIAPageProps) {
  const handleHeaderCtaClick = () => {
    sendLandingCtaClick({
      button_intent: 'essai_gratuit',
      button_location: 'header',
    })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal landing header — logo only, no nav leak */}
      <header className="w-full bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3 md:py-4">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <div className="relative w-[134px] h-8">
              <Image
                src="/logos/logo-maydai/logo-maydai-complet.png"
                alt="MaydAI Logo"
                fill
                sizes="134px"
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold text-white bg-[#0080a3] px-5 py-2 rounded-full hover:bg-[#006280] transition-colors"
            onClick={handleHeaderCtaClick}
          >
            Essai gratuit
          </Link>
        </div>
      </header>

      <main>
        <Hero />
        <TrustLogos />
        <VideoSection />
        <Features />
        <section
          className="border-t border-gray-100 bg-gray-50/50 py-12 md:py-16 px-5 sm:px-6"
          aria-labelledby="conformite-pricing-heading"
        >
          <div className="max-w-7xl mx-auto">
            <h2
              id="conformite-pricing-heading"
              className="text-center text-2xl sm:text-3xl font-extrabold text-gray-900 mb-8 md:mb-12"
            >
              Des tarifs adaptés à vos besoins de{' '}
              <span className="text-[#0080a3]">conformité IA Act</span>
            </h2>
            {pricingNode}
          </div>
        </section>
        <Security />
      </main>

      <LandingFooter />
    </div>
  )
}

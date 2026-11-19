'use client'

import React from 'react'
import Hero from './components/Hero'
import VideoSection from './components/VideoSection'
import TrustLogos from './components/TrustLogos'
import Features from './components/Features'
import Security from './components/Security'
import FaqConformite from './components/FaqConformite'
import LandingFooter from './components/LandingFooter'

export interface ConformiteIAPageProps {
  pricingNode?: React.ReactNode
}

export default function ConformiteIAPage({ pricingNode }: ConformiteIAPageProps) {
  return (
    <div className="min-h-screen bg-white">
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

      <FaqConformite />
      <LandingFooter />
    </div>
  )
}

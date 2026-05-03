'use client'

import Image from 'next/image'
import Link from 'next/link'
import { sendLandingCtaClick } from '@/lib/gtm'
import Hero from './components/Hero'
import VideoSection from './components/VideoSection'
import TrustLogos from './components/TrustLogos'
import Features from './components/Features'
import Security from './components/Security'
import LandingFooter from './components/LandingFooter'

export default function ConformiteIAPage() {
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
        <Security />
      </main>

      <LandingFooter />
    </div>
  )
}

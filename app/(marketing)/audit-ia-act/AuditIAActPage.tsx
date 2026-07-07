'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import HeroAudit from './components/HeroAudit'
import ProblemAudit from './components/ProblemAudit'
import ProcessAudit from './components/ProcessAudit'
import SecurityAudit from './components/SecurityAudit'
import TargetAudit from './components/TargetAudit'
import VideoAudit from './components/VideoAudit'
import FaqAudit from './components/FaqAudit'
import CtaFinalAudit from './components/CtaFinalAudit'
import { SIGNUP_AUDIT_HREF } from './signup-audit-href'

type AuditIAActPageProps = {
  /** Contenu SSR inséré entre la vidéo « MaydAI en action » et la FAQ (ex. tarifs). */
  children?: ReactNode
}

export default function AuditIAActPage({ children }: AuditIAActPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <header className="w-full bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3 md:py-4">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
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
            href={SIGNUP_AUDIT_HREF}
            className="text-sm font-semibold text-white bg-[#0080a3] px-5 py-2 rounded-full hover:bg-[#006280] transition-colors"
          >
            Démarrer mon audit gratuit
          </Link>
        </div>
      </header>

      <main>
        <HeroAudit />
        <ProblemAudit />
        <ProcessAudit />
        <SecurityAudit />
        <TargetAudit />
        <VideoAudit />
        {children}
        <FaqAudit />
        <CtaFinalAudit />
      </main>

      <footer className="border-t border-gray-100 py-8 px-5 sm:px-6 bg-gray-50/50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <div className="relative w-[100px] h-6">
              <Image
                src="/logos/logo-maydai/logo-maydai-complet.png"
                alt="MaydAI"
                fill
                sizes="100px"
                className="object-contain object-left"
              />
            </div>
          </Link>
          <nav className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <Link href="/politique-confidentialite" className="hover:text-[#0080a3] transition-colors">
              Confidentialité
            </Link>
            <Link href="/conditions-generales" className="hover:text-[#0080a3] transition-colors">
              CGU
            </Link>
            <Link href="/securite" className="hover:text-[#0080a3] transition-colors">
              Sécurité
            </Link>
            <Link href="/contact" className="hover:text-[#0080a3] transition-colors">
              Contact
            </Link>
          </nav>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} MaydAI</p>
        </div>
      </footer>
    </div>
  )
}

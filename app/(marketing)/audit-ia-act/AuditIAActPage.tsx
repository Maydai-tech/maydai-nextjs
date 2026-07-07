'use client'

import type { ReactNode } from 'react'
import HeroAudit from './components/HeroAudit'
import ProblemAudit from './components/ProblemAudit'
import ProcessAudit from './components/ProcessAudit'
import SecurityAudit from './components/SecurityAudit'
import TargetAudit from './components/TargetAudit'
import VideoAudit from './components/VideoAudit'
import FaqAudit from './components/FaqAudit'
import CtaFinalAudit from './components/CtaFinalAudit'

type AuditIAActPageProps = {
  /** Contenu SSR inséré entre la vidéo « MaydAI en action » et la FAQ (ex. tarifs). */
  children?: ReactNode
}

export default function AuditIAActPage({ children }: AuditIAActPageProps) {
  return (
    <div className="min-h-screen bg-white">
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
    </div>
  )
}

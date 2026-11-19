import { Metadata } from 'next'
import { Suspense } from 'react'
import SignupPage, { type PartnerSignupConfig } from '@/app/(saas)/signup/SignupPage'

export const metadata: Metadata = {
  title: 'Accès Freemium MaydAI × Learning Gate | IA Éco-responsable & Conformité AI Act',
  description:
    'Inscrivez-vous gratuitement à l’offre Freemium MaydAI via Learning Gate, acteur engagé pour l’activité éco-responsable, la transition digitale et la formation.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://www.maydai.io/p/learning-gate' },
}

const LEARNING_GATE_CONFIG: PartnerSignupConfig = {
  partnerName: 'Learning Gate',
  partnerLogoSrc: '/logos/logo-learning-gate-v2.webp',
  partnerLogoAlt: 'Logo Learning Gate - Acteur éco-responsable, digital et formation',
  partnerLogoWidth: 217,
  partnerLogoHeight: 62,
  partnerWebsiteUrl: 'https://learning-gate.fr/',
  badgeText: 'Partenariat Officiel MaydAI × Learning Gate',
  headline: 'Activez votre accès Freemium MaydAI',
  subheadline:
    'Pilotez la conformité AI Act de vos systèmes d’IA dans une démarche digitale, éthique et éco-responsable.',
  secondarySubheadline:
    'Une inscription 100 % gratuite réservée à l’écosystème Learning Gate pour structurer votre gouvernance IA.',
  partnerTitle: 'À propos du partenariat avec Learning Gate',
  partnerDescription:
    'Learning Gate accompagne les organisations dans leur transition digitale, le développement d’activités éco-responsables et la montée en compétences par la formation. En s’associant à MaydAI, Learning Gate vous permet d’accéder gratuitement à notre plateforme d’audit et de registre IA pour conjuguer innovation numérique, responsabilité environnementale et conformité réglementaire européenne (AI Act).',
  freeNoteTitle: 'Offre Freemium Learning Gate — 100 % Gratuite.',
  freeNoteSubtitle:
    'Aucune carte bancaire requise pour initialiser votre 1er registre et auditer vos cas d’usage IA.',
  defaultAttribution: {
    utm_source: 'learning_gate',
    utm_medium: 'partenariat',
    utm_campaign: 'freemium_learning_gate',
  },
}

function SignupFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4" />
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  )
}

export default function LearningGateSignup() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupPage partnerConfig={LEARNING_GATE_CONFIG} />
    </Suspense>
  )
}

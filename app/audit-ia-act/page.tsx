import type { Metadata } from 'next'
import PricingSummaryCard from '@/components/site-vitrine/PricingSummaryCard'
import AuditIAActPage from './AuditIAActPage'

export const metadata: Metadata = {
  title: 'Audit IA Act : Évaluez la conformité de vos systèmes IA | MaydAI',
  description:
    'Réalisez un audit IA Act pour identifier vos risques. Créez un compte gratuitement, analysez vos cas d’usage, évaluez vos outils IA et anticipez la réglementation.',
  alternates: {
    canonical: 'https://www.maydai.io/audit-ia-act',
  },
  openGraph: {
    title: 'Audit IA Act : Évaluez la conformité de vos systèmes IA | MaydAI',
    description:
      'Réalisez un audit IA Act pour identifier vos risques. Créez un compte gratuitement, analysez vos cas d’usage, évaluez vos outils IA et anticipez la réglementation.',
    url: 'https://www.maydai.io/audit-ia-act',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'MaydAI',
    images: [
      {
        url: '/content/open_graph_maydai.png',
        width: 1200,
        height: 630,
        alt: 'MaydAI - Audit IA Act',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Audit IA Act : Évaluez la conformité de vos systèmes IA | MaydAI',
    description:
      'Réalisez un audit IA Act pour identifier vos risques. Créez un compte gratuitement, analysez vos cas d’usage, évaluez vos outils IA et anticipez la réglementation.',
    images: ['/content/open_graph_maydai.png'],
  },
}

export default function AuditIAActRoutePage() {
  return (
    <AuditIAActPage>
      <section
        className="border-t border-gray-100 bg-gray-50/50 py-12 md:py-16 px-5 sm:px-6"
        aria-labelledby="audit-pricing-heading"
      >
        <div className="max-w-7xl mx-auto">
          <h2
            id="audit-pricing-heading"
            className="text-center text-2xl sm:text-3xl font-extrabold text-gray-900 mb-8 md:mb-12"
          >
            Des tarifs adaptés à vos besoins de{' '}
            <span className="text-[#0080a3]">conformité IA Act</span>
          </h2>
          <PricingSummaryCard />
        </div>
      </section>
    </AuditIAActPage>
  )
}

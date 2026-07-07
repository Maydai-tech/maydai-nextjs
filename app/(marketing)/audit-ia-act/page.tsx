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

const auditIAActJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'MaydAI - Plateforme de conformité IA Act',
  url: 'https://www.maydai.io/audit-ia-act',
  applicationCategory: 'BusinessApplication',
  browserRequirements: "Requires HTML5. Supporte l'expérience agentique.",
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    description: "Version d'audit AI Act gratuit disponible pour les premiers cas d'usage.",
  },
  abstract:
    "Réalisez votre Audit IA Act gratuit et évaluez la conformité de vos systèmes d'intelligence artificielle.",
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: "Comment fonctionne l'audit IA Act gratuit de MaydAI ?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "L'audit IA Act gratuit vous permet de cartographier vos premiers systèmes d'intelligence artificielle et d'évaluer leur niveau de risque (faible, haut risque, interdit) selon les critères officiels du règlement européen.",
      },
    },
    {
      '@type': 'Question',
      name: 'Pourquoi faire un audit AI Act dès maintenant ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Anticiper la réglementation européenne vous évite des sanctions lourdes et sécurise vos déploiements technologiques en définissant une feuille de route de conformité claire.',
      },
    },
  ],
}

export default function AuditIAActRoutePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(auditIAActJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
    </>
  )
}

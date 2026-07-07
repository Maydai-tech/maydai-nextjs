import type { Metadata } from 'next'
import PricingSummaryCard from '@/components/site-vitrine/PricingSummaryCard'
import ConformiteIAPage from './ConformiteIAPage'

export const metadata: Metadata = {
  title: 'Conformité IA & AI Act : Votre plateforme de confiance | MaydAI',
  description:
    'Pilotez votre conformité AI Act (et IA Act) avec notre plateforme tout-en-un. Automatisez vos audits de risques, gérez votre registre et accélérez votre gouvernance.',
  alternates: {
    canonical: 'https://www.maydai.io/conformite-ia',
  },
  openGraph: {
    title: 'Conformité IA & AI Act : Votre plateforme de confiance | MaydAI',
    description:
      'Pilotez votre conformité AI Act (et IA Act) avec notre plateforme tout-en-un. Automatisez vos audits de risques, gérez votre registre et accélérez votre gouvernance.',
    url: 'https://www.maydai.io/conformite-ia',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'MaydAI',
    images: [
      {
        url: '/content/open_graph_maydai.png',
        width: 1200,
        height: 630,
        alt: 'MaydAI - Conformité AI Act Européen',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Conformité IA & AI Act : Votre plateforme de confiance | MaydAI',
    description:
      'Pilotez votre conformité AI Act (et IA Act) avec notre plateforme tout-en-un. Automatisez vos audits de risques, gérez votre registre et accélérez votre gouvernance.',
    images: ['/content/open_graph_maydai.png'],
  },
}

const conformiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Plateforme de Conformité Réglementaire IA',
  provider: {
    '@type': 'Organization',
    name: 'MaydAI',
    url: 'https://www.maydai.io',
  },
  name: 'Solution de Conformité AI Act & IA Act',
  description:
    "Logiciel SaaS d'audit assisté, de gestion des risques et de gouvernance pour assurer la conformité IA Act des entreprises.",
  url: 'https://www.maydai.io/conformite-ia',
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: "Qu'est-ce que la conformité IA Act et qui est concerné ?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "La conformité IA Act désigne l'alignement obligatoire avec le règlement européen sur l'intelligence artificielle. Elle concerne tous les fournisseurs, déployeurs et distributeurs de systèmes IA opérant sur le marché européen, avec des exigences strictes pour les systèmes d'IA dits à 'Haut Risque'.",
      },
    },
    {
      '@type': 'Question',
      name: 'Comment vérifier la conformité AI Act de mes systèmes ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "L'évaluation passe par une cartographie rigoureuse de vos cas d'usage, un scoring précis de vos niveaux de risque, et la mise en place d'une gouvernance technique transparente. MaydAI automatise ce processus pour vous fournir une feuille de route claire.",
      },
    },
    {
      '@type': 'Question',
      name: 'Quelles sont les sanctions en cas de non-conformité à la réglementation IA ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Le non-respect du règlement européen peut entraîner des sanctions financières lourdes allant jusqu'à 35 millions d'euros ou 7% du chiffre d'affaires mondial annuel, d'où l'importance d'anticiper la gouvernance de vos projets.",
      },
    },
  ],
}

export default async function ConformiteIA() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(conformiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <ConformiteIAPage pricingNode={<PricingSummaryCard />} />
    </>
  )
}

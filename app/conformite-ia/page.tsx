import type { Metadata } from 'next'
import ConformiteIAPage from './ConformiteIAPage'

export const metadata: Metadata = {
  title: 'Conformité AI Act - Sécurisez vos projets IA | MaydAI',
  description:
    'Plateforme tout-en-un pour naviguer l\'AI Act européen. Audit automatisé, gestion des risques et gouvernance IA pour accélérer votre mise en conformité.',
  keywords:
    'conformité AI Act, audit IA, AI Act européen, gouvernance IA, risque IA, réglementation intelligence artificielle',
  alternates: {
    canonical: 'https://www.maydai.io/conformite-ia',
  },
  openGraph: {
    title: 'Conformité AI Act - Sécurisez vos projets IA | MaydAI',
    description:
      'Plateforme tout-en-un pour naviguer l\'AI Act européen. Audit automatisé, gestion des risques et gouvernance IA.',
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
}

export default function ConformiteIA() {
  return <ConformiteIAPage />
}

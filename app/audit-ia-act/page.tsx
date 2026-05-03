import type { Metadata } from 'next'
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
  return <AuditIAActPage />
}

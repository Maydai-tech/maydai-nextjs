import type { Metadata } from 'next'
import ImpactEnvironnementalPage from './ImpactEnvironnementalPage'
import { FAQ_ENVIRONNEMENT_ITEMS } from './faq-environnement-items'
import {
  computeEquivalenceMetrics,
  fetchEcoImpactModelsFra,
  USE_CASE_DEFINITIONS,
} from '@/lib/impact-environnemental'

const PAGE_TITLE =
  "Impact Environnemental IA : Évaluez l'empreinte de vos modèles | MaydAI"
const PAGE_DESCRIPTION =
  "Simulateur d'empreinte carbone et d'impact environnemental des IA. Comparez la consommation énergétique et l'éco-conception de vos modèles LLM."
const PAGE_URL = 'https://www.maydai.io/impact-environnemental'

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: 'website',
    locale: 'fr_FR',
    siteName: 'MaydAI',
    images: [
      {
        url: '/content/open_graph_maydai.png',
        width: 1200,
        height: 630,
        alt: 'MaydAI - Impact Environnemental IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/content/open_graph_maydai.png'],
  },
}

export default async function ImpactEnvironnementalRoute() {
  let models: Awaited<ReturnType<typeof fetchEcoImpactModelsFra>> = []
  let fetchError: string | null = null

  try {
    models = await fetchEcoImpactModelsFra()
  } catch (err) {
    fetchError =
      err instanceof Error ? err.message : 'Erreur inconnue lors du chargement des données'
  }

  const averageEnergyPer1k =
    models.length > 0
      ? models.reduce((sum, model) => sum + model.energyWhPer1kTokens, 0) / models.length
      : 0

  const articleMultiplier =
    USE_CASE_DEFINITIONS.find((u) => u.id === 'article')?.tokenMultiplier || 2

  const averageTotalWh = averageEnergyPer1k * articleMultiplier
  const averageMetrics = computeEquivalenceMetrics(averageTotalWh)

  const ecoJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: "Simulateur d'Impact Environnemental IA - MaydAI",
    url: PAGE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires HTML5 and JavaScript',
    description:
      "Outil de simulation et d'analyse du cycle de vie (ACV) pour mesurer et comparer l'impact environnemental et l'empreinte carbone des modèles d'intelligence artificielle.",
    keywords:
      'Impact Environnemental IA, Impact Environmental IA, Empreinte carbone LLM, Green IT',
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ENVIRONNEMENT_ITEMS.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ecoJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <ImpactEnvironnementalPage
        models={models}
        fetchError={fetchError}
        averageMetrics={averageMetrics}
      />
    </>
  )
}

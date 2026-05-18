import type { Metadata } from 'next'
import ImpactEnvironnementalPage from './ImpactEnvironnementalPage'
import { fetchEcoImpactModelsFra } from '@/lib/impact-environnemental'

export const metadata: Metadata = {
  title: 'Impact Environnemental des IA | MaydAI',
  description:
    'Simulateur d\'empreinte énergétique et ADPe des modèles d\'IA (EcoLogits, région France). Comparez deux LLM selon votre cas d\'usage.',
  alternates: {
    canonical: 'https://www.maydai.io/impact-environnemental',
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

  return <ImpactEnvironnementalPage models={models} fetchError={fetchError} />
}

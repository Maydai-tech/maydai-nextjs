'use client'

import Image from 'next/image'
import { ArrowDown } from 'lucide-react'

interface BenchmarkCard {
  name: string
  subtitle: string
  description: string
  logo: string
  anchorId: string
}

const benchmarkCards: BenchmarkCard[] = [
  {
    name: 'Compl-AI',
    subtitle: 'La Référence Réglementaire \n(EU AI Act)',
    description: 'Issu des travaux du Centre IA de l\'ETH Zurich, Compl-AI est le premier cadre d\'évaluation technique open-source entièrement aligné sur la réglementation européenne (EU AI Act). Ce benchmark traduit les exigences juridiques complexes en critères techniques mesurables.',
    logo: '/icons_llm_bench/complai3.webp',
    anchorId: 'benchmark-complai',
  },
  {
    name: 'LLM Stats',
    subtitle: 'La Performance Technique & Économique',
    description: 'LLM Stats est une ressource axée sur la puissance brute et les spécifications techniques des modèles. C\'est une base de données dynamique essentielle pour les développeurs et les ingénieurs qui doivent choisir un modèle en fonction de contraintes opérationnelles précises.',
    logo: '/icons_llm_bench/llm_stats2.webp',
    anchorId: 'benchmark-llmstats',
  },
  {
    name: 'Compar:IA',
    subtitle: 'L\'Évaluation Utilisateur \n(L\'approche Française)',
    description: 'Porté par l\'incubateur de services numériques de l\'État (beta.gouv.fr), Compar:IA est un comparateur souverain qui se base sur l\'expérience humaine. Il repose sur des tests "à l\'aveugle" réalisés par des utilisateurs réels pour juger la pertinence des réponses.',
    logo: '/icons_llm_bench/comparia2.webp',
    anchorId: 'benchmark-comparia',
  },
]

export default function BenchmarkCards() {
  const scrollToDetails = () => {
    const element = document.getElementById('benchmark-details')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {benchmarkCards.map((card) => (
          <div
            key={card.name}
            className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 pt-4 pb-6 flex flex-col items-center text-center hover:shadow-md transition-shadow"
          >
            {/* Logo */}
            <div className="w-48 h-28 mb-2 relative">
              <Image
                src={card.logo}
                alt={`Logo ${card.name}`}
                fill
                className="object-contain"
              />
            </div>

            {/* Titre */}
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{card.name}</h3>
            <p className="text-sm text-[#0080A3] font-medium mb-3 whitespace-pre-line">{card.subtitle}</p>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-4">{card.description}</p>

            {/* Lien En savoir + */}
            <button
              onClick={scrollToDetails}
              className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[#0080A3] hover:text-[#006680] transition-colors"
            >
              En savoir +
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}


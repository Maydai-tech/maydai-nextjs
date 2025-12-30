'use client'

import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

interface BenchmarkInfo {
  name: string
  subtitle: string
  definition: string
  evaluates: string
  opinion: string
  link: string
  linkLabel: string
  logo: string
}

const benchmarks: BenchmarkInfo[] = [
  {
    name: 'Compl-AI',
    subtitle: 'La Référence Réglementaire \n(EU AI Act)',
    definition: 'Issu des travaux du Centre IA de l\'ETH Zurich (École Polytechnique Fédérale de Zurich), Compl-AI est le premier cadre d\'évaluation technique open-source entièrement aligné sur la réglementation européenne (EU AI Act). Ce benchmark traduit les exigences juridiques complexes en critères techniques mesurables.',
    evaluates: 'Il analyse les modèles génératifs (LLMs) à travers 80 critères répartis sur 6 principes fondamentaux de l\'IA éthique et sûre : Équité (Fairness), Robustesse technique, Gouvernance des données, Transparence, Sécurité, Impact sociétal.',
    opinion: 'Le baromètre indispensable pour anticiper la conformité réglementaire en Europe.',
    link: 'https://compl-ai.org',
    linkLabel: 'compl-ai.org',
    logo: '/icons_llm_bench/complai3.webp',
  },
  {
    name: 'LLM Stats',
    subtitle: 'La Performance Technique & Économique',
    definition: 'LLM Stats (souvent associé aux "Leaderboards" américains) est une ressource axée sur la puissance brute et les spécifications techniques des modèles. C\'est une base de données dynamique essentielle pour les développeurs et les ingénieurs qui doivent choisir un modèle en fonction de contraintes opérationnelles précises.',
    evaluates: 'Il fournit des métriques quantitatives et financières, notamment : Coûts (Prix par million de tokens input/output), Capacités (Fenêtre de contexte, multimodalité - texte, image, code), Infrastructure (Estimation de la puissance GPU requise et taille du modèle), Actualité (Date de coupure des connaissances - "Knowledge Cutoff").',
    opinion: 'L\'outil de référence pour calibrer le rapport performance/prix.',
    link: 'https://llm-stats.com',
    linkLabel: 'llm-stats.com',
    logo: '/icons_llm_bench/llm_stats2.webp',
  },
  {
    name: 'Compar:IA',
    subtitle: 'L\'Évaluation Utilisateur \n(L\'approche Française)',
    definition: 'Porté par l\'incubateur de services numériques de l\'État (beta.gouv.fr), Compar:IA est un comparateur souverain qui se base sur l\'expérience humaine. Contrairement aux benchmarks automatisés, il repose sur des tests "à l\'aveugle" réalisés par des utilisateurs réels pour juger la pertinence des réponses.',
    evaluates: 'Il se concentre sur la qualité perçue de la génération de texte en français. Le classement évolue selon un système de duel (comparaison A/B) où l\'utilisateur vote pour la meilleure réponse, permettant de capturer des nuances linguistiques et culturelles que les tests automatisés manquent parfois.',
    opinion: 'Indicateur clé pour la pertinence linguistique et culturelle française.',
    link: 'https://comparia.beta.gouv.fr',
    linkLabel: 'comparia.beta.gouv.fr',
    logo: '/icons_llm_bench/comparia2.webp',
  },
]

export default function BenchmarkDetails() {
  return (
    <div id="benchmark-details" className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Comprendre les Benchmarks</h2>
      
      <div className="space-y-8">
        {benchmarks.map((benchmark) => (
          <div key={benchmark.name} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
            {/* Logo à gauche au-dessus du nom */}
            <div className="w-48 h-28 relative mb-4">
              <Image
                src={benchmark.logo}
                alt={`Logo ${benchmark.name}`}
                fill
                className="object-contain"
              />
            </div>
            
            {/* Titre et lien */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">{benchmark.name}</h3>
                <p className="text-sm text-[#0080A3] font-medium whitespace-pre-line">{benchmark.subtitle}</p>
              </div>
              <a
                href={benchmark.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors w-fit"
              >
                <ExternalLink className="w-4 h-4" />
                {benchmark.linkLabel}
              </a>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-900">Présentation : </span>
                <span className="text-gray-600">{benchmark.definition}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Ce qu&apos;il évalue : </span>
                <span className="text-gray-600">{benchmark.evaluates}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">L&apos;avis MaydAI : </span>
                <span className="text-gray-600 italic">{benchmark.opinion}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

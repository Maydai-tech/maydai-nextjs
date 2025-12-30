'use client'

interface GlossaryItem {
  term: string
  definition: string
}

const glossaryItems: GlossaryItem[] = [
  {
    term: 'Model',
    definition: 'Dénomination technique du moteur d\'IA (ex: GPT-4).',
  },
  {
    term: 'Provider',
    definition: 'Entité qui a développé et commercialise le modèle.',
  },
  {
    term: 'Country',
    definition: 'Pays du siège social, crucial pour la conformité juridique (RGPD).',
  },
  {
    term: 'Compl-AI Rank',
    definition: 'Classement de conformité avec la réglementation européenne EU AI Act (issu de Compl-AI).',
  },
  {
    term: 'LLM Stats Rank',
    definition: 'Classement de puissance brute et spécifications techniques (issu de LLM Stats).',
  },
  {
    term: 'Compar:ia Rank',
    definition: 'Classement basé sur la préférence utilisateur et la qualité rédactionnelle en français.',
  },
  {
    term: 'Input $/M',
    definition: 'Coût pour traiter 1 million de tokens en entrée.',
  },
  {
    term: 'Output $/M',
    definition: 'Coût pour générer 1 million de tokens en sortie.',
  },
  {
    term: 'Context',
    definition: 'Mémoire à court terme du modèle (longueur max).',
  },
  {
    term: 'Knowledge Cutoff',
    definition: 'Date d\'arrêt de l\'entraînement du modèle.',
  },
  {
    term: 'GPQA / AIME 2025',
    definition: 'Scores évaluant le raisonnement scientifique et mathématique.',
  },
]

export default function BenchGlossary() {
  return (
    <div className="mt-6 bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Glossaire des termes</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {glossaryItems.map((item) => (
          <div key={item.term}>
            <span className="font-semibold text-gray-900">{item.term}</span>
            <span className="text-gray-600"> : {item.definition}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


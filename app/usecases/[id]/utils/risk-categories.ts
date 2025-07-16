export interface RiskCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
  weight: number
  shortName: string
}

export const RISK_CATEGORIES: Record<string, RiskCategory> = {
  'transparency': {
    id: 'transparency',
    name: 'Transparency',
    shortName: 'Transparence',
    description: 'Explicabilité et information des utilisateurs',
    color: 'text-blue-700 bg-blue-50 border border-blue-200',
    icon: '🔍',
    weight: 0.15
  },
  'technical_robustness': {
    id: 'technical_robustness',
    name: 'Technical Robustness and Safety',
    shortName: 'Robustesse Technique',
    description: 'Sécurité, fiabilité et performance technique',
    color: 'text-green-700 bg-green-50 border border-green-200',
    icon: '🛡️',
    weight: 0.20
  },
  'human_agency': {
    id: 'human_agency',
    name: 'Human Agency & Oversight',
    shortName: 'Supervision Humaine',
    description: 'Contrôle et surveillance humaine',
    color: 'text-purple-700 bg-purple-50 border border-purple-200',
    icon: '👥',
    weight: 0.18
  },
  'privacy_data': {
    id: 'privacy_data',
    name: 'Privacy & Data Governance',
    shortName: 'Confidentialité & Données',
    description: 'Protection des données et de la vie privée',
    color: 'text-indigo-700 bg-indigo-50 border border-indigo-200',
    icon: '🔒',
    weight: 0.17
  },
  'social_environmental': {
    id: 'social_environmental',
    name: 'Social & Environmental Well-being',
    shortName: 'Impact Social & Environnemental',
    description: 'Bien-être social et impact environnemental',
    color: 'text-teal-700 bg-teal-50 border border-teal-200',
    icon: '🌱',
    weight: 0.10
  },
  'diversity_fairness': {
    id: 'diversity_fairness',
    name: 'Diversity, Non-discrimination & Fairness',
    shortName: 'Équité & Non-discrimination',
    description: 'Diversité, équité et lutte contre les discriminations',
    color: 'text-amber-700 bg-amber-50 border border-amber-200',
    icon: '⚖️',
    weight: 0.15
  },
  'prohibited_practices': {
    id: 'prohibited_practices',
    name: 'Prohibited Practices',
    shortName: 'Pratiques Interdites',
    description: 'Pratiques interdites par la réglementation',
    color: 'text-red-700 bg-red-50 border border-red-200',
    icon: '🚫',
    weight: 0.05
  }
}

 
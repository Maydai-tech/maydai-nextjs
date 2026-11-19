/**
 * Présentation « métier » du parcours court V3 : segments et progression perçue.
 * Ne modifie pas le graphe ni les IDs — lecture UX uniquement.
 */

import {
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_SOCIAL_ENV_ID,
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
} from './questionnaire-v3-graph'

export const V3_SHORT_PATH_SEGMENT_COUNT = 8

export type V3ShortPathSegment = {
  order: number
  key: string
  title: string
  tagline: string
}

export const V3_SHORT_PATH_SEGMENTS: readonly V3ShortPathSegment[] = [
  {
    order: 1,
    key: 'situation',
    title: 'Votre situation',
    tagline: 'Votre rôle dans la chaîne de valeur IA et la nature du cas.',
  },
  {
    order: 2,
    key: 'red-lines',
    title: 'Lignes rouges',
    tagline: 'Pratiques interdites et points de blocage critiques du règlement.',
  },
  {
    order: 3,
    key: 'domains',
    title: 'Domaines sensibles & déploiement',
    tagline: 'Annexes, produit / système, garde-fous et périmètre d’usage.',
  },
  {
    order: 4,
    key: 'usage-transparency',
    title: 'Usage & transparence',
    tagline: 'Contenus générés, exposition aux utilisateurs et volumétrie indicative.',
  },
  {
    order: 5,
    key: 'maturity-enterprise',
    title: 'Socle de maturité — entreprise',
    tagline: 'Formation des équipes, registre des systèmes IA, gestion des risques.',
  },
  {
    order: 6,
    key: 'maturity-usage',
    title: 'Socle de maturité — usage',
    tagline: 'Prompts, contrôle humain, documentation, surveillance continue, qualité des données.',
  },
  {
    order: 7,
    key: 'maturity-transparency',
    title: 'Socle de maturité — transparence',
    tagline: 'Information utilisateurs et marque de transparence.',
  },
  {
    order: 8,
    key: 'maturity-social-environment',
    title: 'Socle de maturité — bien-être social & environnemental',
    tagline: 'Accessibilité, conception universelle et empreinte environnementale du système d’IA.',
  },
] as const

/**
 * Associe l’ID de question courante à un segment 1..8 (parcours court uniquement).
 */
export function getV3ShortPathSegmentOrder(questionId: string): number {
  if (questionId === 'E4.N7.Q1' || questionId === 'E4.N7.Q1.1' || questionId === 'E4.N7.Q1.2') {
    return 1
  }
  if (questionId === 'E4.N7.Q3' || questionId === 'E4.N7.Q3.1' || questionId === 'E4.N7.Q2.1') {
    return 2
  }
  if (
    questionId === 'E4.N7.Q4' ||
    questionId === 'E4.N7.Q2' ||
    questionId === 'E4.N7.Q5' ||
    questionId === 'E4.N8.Q9' ||
    questionId === 'E4.N8.Q9.1'
  ) {
    return 3
  }
  if (questionId.startsWith('E4.N8.Q11') || questionId === 'E4.N8.Q10') {
    return 4
  }
  if (questionId === V3_SHORT_ENTREPRISE_ID || questionId === 'V3._SHORT_CONSOLIDATED') {
    return 5
  }
  if (questionId === V3_SHORT_USAGE_ID) {
    return 6
  }
  if (questionId === V3_SHORT_TRANSPARENCE_ID) {
    return 7
  }
  if (questionId === V3_SHORT_SOCIAL_ENV_ID) {
    return 8
  }
  if (questionId.startsWith('E5.N9.')) {
    return 5
  }
  return 3
}

export function getV3ShortPathSegmentForQuestion(questionId: string): V3ShortPathSegment {
  const order = getV3ShortPathSegmentOrder(questionId)
  return V3_SHORT_PATH_SEGMENTS[order - 1]
}

/**
 * Progression visuelle dédiée au court (évite l’effet « long tronqué » basé sur le DFS V3 complet).
 */
export function getV3ShortPathProgressPercent(questionId: string, isLastQuestion: boolean): number {
  if (isLastQuestion) return 100
  const order = getV3ShortPathSegmentOrder(questionId)
  const mid = (order - 0.5) / V3_SHORT_PATH_SEGMENT_COUNT
  return Math.max(6, Math.min(92, Math.round(mid * 100)))
}

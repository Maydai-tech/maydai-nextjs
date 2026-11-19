/**
 * Personnalisation UX court → long (textes, CTA, ordre des liens).
 * Aucune logique métier AI Act : lecture de classification_status / risk_level uniquement.
 */

import { DECLARATION_PROOF_FLOW_COPY } from '@/lib/declaration-proof-flow-copy'

export type V3ShortPathFunnelOutcomeKey =
  | 'impossible'
  | 'minimal'
  | 'limited'
  | 'high'
  | 'unacceptable'
  | 'qualified_neutral'

export function resolveV3ShortPathFunnelOutcomeKey(
  classificationStatus: string | null | undefined,
  riskLevel: string | null | undefined
): V3ShortPathFunnelOutcomeKey {
  if (classificationStatus === 'impossible') return 'impossible'
  const rl = (riskLevel ?? '').toLowerCase()
  if (rl === 'minimal') return 'minimal'
  if (rl === 'limited') return 'limited'
  if (rl === 'high') return 'high'
  if (rl === 'unacceptable') return 'unacceptable'
  return 'qualified_neutral'
}

export type V3ShortPathFunnelCopy = {
  /** Sous-titre dynamique sous le titre principal de la sortie courte. */
  contextualLead: string
  heroTitle: string
  heroLead: string
  heroBullets: readonly [string, string, string]
  primaryCtaLabel: string
  whyLongTitle: string
  whyLongBullets: readonly string[]
  /** Ordre des accès rapides (secondaires) sous la zone partage. */
  quickLinkPriority: readonly ('dossier' | 'todo' | 'overview' | 'dashboard')[]
  /** Synthèse (carte V3) : phrase « prochain meilleur pas ». */
  synthesisNextBestLine: string
  synthesisLongCtaLabel: string
  synthesisShortCtaLabel: string
  /** Header V3 : libellé du bouton principal (parcours complet). */
  headerPrimaryCtaLabel: string
  /** Header V3 : texte sous le bouton principal. */
  headerResumeHint: string
}

const DEFAULT_QUICK: V3ShortPathFunnelCopy['quickLinkPriority'] = [
  'dossier',
  'todo',
  'overview',
  'dashboard',
]

const COPY: Record<V3ShortPathFunnelOutcomeKey, V3ShortPathFunnelCopy> = {
  impossible: {
    headerPrimaryCtaLabel: 'Parcours complet — lever les blocages',
    contextualLead:
      'Le niveau AI Act n’est pas encore positionné : des réponses ou branches bloquent la conclusion. Le parcours complet est l’étape la plus utile pour lever ces zones floues avec le même moteur de qualification.',
    heroTitle: 'Lever l’ambiguïté : parcours complet en priorité',
    heroLead:
      'Sans trancher les pivots manquants, la conformité reste fragile côté dossier et côté preuve. Le questionnaire long reprend vos réponses et complète le graphe pour un niveau fiable et un plan d’action structuré.',
    heroBullets: [
      'Compléter les questions ou bifurcations qui empêchaient la qualification sur le court.',
      'Aligner score de maturité (E5), rapport détaillé et todo conformité sur une base réglementaire solide.',
      'Documenter dans le dossier du cas ce qui était encore « déclaré » sans pièce jointe.',
    ],
    primaryCtaLabel: 'Ouvrir le parcours complet — lever les blocages',
    whyLongTitle: 'Pourquoi le long est indispensable ici',
    whyLongBullets: [
      'Répondre aux branches manquantes pour que le moteur conclue sur le niveau AI Act.',
      'Obtenir le score de maturité, le rapport structuré et le plan d’action sur l’ensemble du questionnaire.',
      'Relier la qualification à la todo conformité et au dossier pour passer de la déclaration à la preuve.',
    ],
    quickLinkPriority: ['todo', 'dossier', 'overview', 'dashboard'],
    synthesisNextBestLine:
      'La qualification réglementaire est bloquée : commencez par le parcours complet pour trancher les pivots, puis mettez à jour le dossier et la todo.',
    synthesisLongCtaLabel: 'Parcours complet — lever les ambiguïtés',
    synthesisShortCtaLabel: 'Revoir le pré-diagnostic court',
    headerResumeHint:
      'Les pivots non tranchés empêchent une qualification fiable : le parcours complet permet de les lever tout en conservant vos réponses.',
  },
  minimal: {
    headerPrimaryCtaLabel: 'Parcours complet — consolider',
    contextualLead:
      'Sur le périmètre parcouru, le moteur indique un volet léger du spectre AI Act. Le parcours complet reste utile pour cadrer documentation, transparence et registre selon votre situation réelle.',
    heroTitle: 'Passer du pré-diagnostic au plan complet',
    heroLead:
      'Le court donne une première lecture cohérente ; le long ajoute le bloc maturité (E5), le rapport détaillé et la todo pour une mise en œuvre proportionnée — sans changer le moteur de qualification.',
    heroBullets: [
      'Formaliser la maturité et les preuves attendues pour votre contexte (E5, dossier, rapport).',
      'Vérifier transparence et obligations annexes sur l’ensemble du questionnaire.',
      'Relier la synthèse du cas à la todo conformité pour un suivi simple.',
    ],
    primaryCtaLabel: 'Continuer avec le parcours complet',
    whyLongTitle: 'Pourquoi compléter le questionnaire',
    whyLongBullets: [
      'Obtenir le score de maturité et le rapport sur tout le périmètre, au-delà de l’indication « minimale ».',
      'S’assurer que la documentation et le registre couvrent bien votre cas réel.',
      'Activer la todo conformité sur des actions concrètes et traçables.',
    ],
    quickLinkPriority: ['overview', 'dossier', 'todo', 'dashboard'],
    synthesisNextBestLine:
      'Le niveau indiqué est favorable sur le court : le parcours complet consolide maturité, preuves et plan sans sur-réglementer.',
    synthesisLongCtaLabel: 'Parcours complet — consolider le plan',
    synthesisShortCtaLabel: 'Pré-diagnostic court (aperçu)',
    headerResumeHint:
      'Le parcours complet ajoute maturité (E5), rapport et todo — utile même lorsque le niveau AI Act reste modéré sur le court.',
  },
  limited: {
    headerPrimaryCtaLabel: 'Parcours complet — preuves',
    contextualLead:
      'Un niveau « limité » appelle en principe des exigences AI Act plus soutenues (documentation, supervision, transparence selon les cas). Le parcours complet aligne preuves, score et plan.',
    heroTitle: 'Structurer transparence et documentation',
    heroLead:
      'Le pré-diagnostic a posé la qualification sur un périmètre réduit ; le long détaille les attentes, le dossier et la todo pour une mise en conformité opérationnelle.',
    heroBullets: [
      'Préciser les exigences applicables et les preuves attendues dans le dossier du cas.',
      'Compléter le score de maturité (E5) et le rapport pour prioriser les actions.',
      'Brancher la todo conformité sur les écarts identifiés.',
    ],
    primaryCtaLabel: 'Parcours complet — documentation & preuves',
    whyLongTitle: 'Pourquoi enchaîner maintenant',
    whyLongBullets: [
      'Aligner score de maturité, preuves dans le dossier et plan d’action sur cette qualification « limitée ».',
      'Couvrir l’ensemble du questionnaire pour ne pas sous-estimer transparence ou supervision.',
      'Donner à la direction une vision consolidée (rapport + todo).',
    ],
    quickLinkPriority: ['dossier', 'todo', 'overview', 'dashboard'],
    synthesisNextBestLine:
      'Avec un niveau limité, le long est le meilleur levier pour structurer preuves, rapport et todo autour de la même qualification.',
    synthesisLongCtaLabel: 'Parcours complet — transparence & preuves',
    synthesisShortCtaLabel: 'Pré-diagnostic court',
    headerResumeHint:
      'Pour un niveau limité, le questionnaire long structure documentation, dossier et todo sur la même base réglementaire.',
  },
  high: {
    headerPrimaryCtaLabel: 'Parcours complet — plan détaillé',
    contextualLead:
      'Un haut niveau de risque impose une gouvernance exigeante et des preuves solides. Le parcours complet est le cadre adapté pour cadrer contrôles, plan d’action et traçabilité.',
    heroTitle: 'Gouvernance & plan détaillé : parcours complet',
    heroLead:
      'Le court signale l’ampleur réglementaire ; le long ne change pas la qualification mais déploie le plan, le score de maturité et le rapport pour piloter la mise en œuvre.',
    heroBullets: [
      'Décliner les exigences AI Act en contrôles, preuves et jalons dans le rapport et la todo.',
      'Compléter le dossier du cas pour la supervision et les audits attendus.',
      'Utiliser le score E5 pour prioriser les chantiers internes.',
    ],
    primaryCtaLabel: 'Parcours complet — plan & gouvernance',
    whyLongTitle: 'Pourquoi le long est central ici',
    whyLongBullets: [
      'Structurer le plan d’action et les preuves attendues pour un haut risque.',
      'Obtenir le rapport détaillé et le score de maturité sur tout le questionnaire.',
      'Synchroniser la todo conformité avec les exigences les plus critiques.',
    ],
    quickLinkPriority: ['todo', 'dossier', 'overview', 'dashboard'],
    synthesisNextBestLine:
      'Haut risque : priorisez le parcours complet pour le plan détaillé, puis renforcez dossier et todo conformité.',
    synthesisLongCtaLabel: 'Parcours complet — plan détaillé',
    synthesisShortCtaLabel: 'Pré-diagnostic court (rappel)',
    headerResumeHint:
      'Avec un haut risque, le parcours complet est le passage obligé pour plan, preuves et pilotage — au-delà du pré-diagnostic.',
  },
  unacceptable: {
    headerPrimaryCtaLabel: 'Parcours complet — remédiation',
    contextualLead:
      'Le moteur qualifie la situation comme inacceptable sur le périmètre parcouru : à traiter en priorité. Le parcours complet, le dossier et la todo permettent d’ordonner remédiation et traçabilité.',
    heroTitle: 'Priorité : remédiation, preuves, parcours complet',
    heroLead:
      'Arrêtez les usages non conformes le cas échéant, documentez les décisions dans le dossier, puis complétez le long pour un plan structuré et une traçabilité réglementaire.',
    heroBullets: [
      'Cadrer les mesures d’arrêt ou de correction et les preuves attendues dans le dossier.',
      'Compléter le questionnaire long pour un plan d’action exhaustif et la todo.',
      'Informer la direction via le rapport et la synthèse du cas.',
    ],
    primaryCtaLabel: 'Parcours complet — remédiation & traçabilité',
    whyLongTitle: 'Pourquoi ne pas s’arrêter au court',
    whyLongBullets: [
      'Une situation inacceptable exige un plan structuré et des preuves, pas seulement une alerte.',
      'Le long relie qualification, score E5, rapport et todo pour exécuter les mesures.',
      'Le dossier du cas devient la référence pour les audits et le suivi.',
    ],
    quickLinkPriority: ['todo', 'dossier', 'dashboard', 'overview'],
    synthesisNextBestLine:
      'Situation inacceptable : traitez la todo et le dossier en parallèle du parcours complet pour preuves et plan.',
    synthesisLongCtaLabel: 'Parcours complet — remédiation',
    synthesisShortCtaLabel: 'Pré-diagnostic court',
    headerResumeHint:
      'En cas inacceptable, combinez parcours complet, dossier et todo pour cadrer remédiation et preuves.',
  },
  qualified_neutral: {
    headerPrimaryCtaLabel: 'Continuer le questionnaire (parcours complet)',
    contextualLead:
      'Le pré-diagnostic s’appuie sur le même moteur que le parcours complet, sur une partie du questionnaire. Poursuivez avec le long pour le score de maturité, le rapport et la todo.',
    heroTitle: 'Enchaîner avec le parcours complet',
    heroLead:
      'Affinez la qualification sur l’ensemble des questions, obtenez le score E5 et le rapport structuré, et reliez la todo conformité au dossier du cas.',
    heroBullets: [
      'Compléter le questionnaire pour une vision réglementaire et opérationnelle complète.',
      'Produire le rapport et le plan d’action détaillés.',
      'Alimenter le dossier et la todo avec des preuves alignées sur le moteur.',
    ],
    primaryCtaLabel: 'Ouvrir le parcours complet',
    whyLongTitle: 'Pourquoi poursuivre avec le parcours complet',
    whyLongBullets: [
      'Obtenir le score de maturité (E5), le rapport structuré et le plan d’action sur l’ensemble du questionnaire.',
      'Relier la qualification AI Act à la todo conformité et au dossier du cas.',
      'Aligner les parties prenantes sur la même lecture que le rapport et la roadmap issue du long.',
    ],
    quickLinkPriority: DEFAULT_QUICK,
    synthesisNextBestLine:
      'Le parcours complet reste le meilleur pas pour rapport, score E5 et todo ; le court sert d’aperçu.',
    synthesisLongCtaLabel: 'Parcours complet — reprendre le questionnaire',
    synthesisShortCtaLabel: 'Pré-diagnostic rapide (parcours court)',
    headerResumeHint: DECLARATION_PROOF_FLOW_COPY.headerV3ResumeEvaluationHint,
  },
}

export function getV3ShortPathFunnelCopy(key: V3ShortPathFunnelOutcomeKey): V3ShortPathFunnelCopy {
  return COPY[key]
}
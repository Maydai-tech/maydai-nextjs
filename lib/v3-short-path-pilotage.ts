/**
 * Pilotage produit — parcours court V3 (lecture / GA4).
 * Source unique pour la vue admin : pas de données live ici (événements = GTM / dataLayer).
 */

export type V3PilotageEventDef = {
  event: string
  title: string
  when: string
  fields: { key: string; description: string }[]
}

export const V3_PILOTAGE_EVENTS: V3PilotageEventDef[] = [
  {
    event: 'v3_short_path_start',
    title: 'Démarrage parcours court',
    when: 'Page évaluation avec `?parcours=court`, cas V3 chargé.',
    fields: [
      { key: 'usecase_id', description: 'Identifiant cas (agrégation par volume possible côté GA4).' },
      { key: 'system_type_bucket', description: '`produit` | `autre` | `unknown`.' },
      { key: 'page_path', description: 'Chemin + query (optionnel).' },
      { key: 'referrer_excerpt', description: '200 car. max (optionnel).' },
      { key: 'entry_surface', description: 'Si `entree=` dans l’URL — surface d’origine.' },
    ],
  },
  {
    event: 'v3_evaluation_entry_surface',
    title: 'Ouverture évaluation longue (avec traçage amont)',
    when: 'Page évaluation **sans** `parcours=court`, avec `entree=` dans l’URL.',
    fields: [
      { key: 'usecase_id', description: 'Cas concerné.' },
      { key: 'questionnaire_version', description: 'Version (3 pour V3).' },
      { key: 'path_mode', description: 'Toujours `long` aujourd’hui.' },
      { key: 'entry_surface', description: 'Valeur de `entree` (dashboard, synthèse, dossier…).' },
      { key: 'system_type_bucket', description: 'Segmentation type de système.' },
    ],
  },
  {
    event: 'v3_short_path_segment',
    title: 'Segment métier parcouru (1 fois par segment / page)',
    when: 'Première entrée dans chaque segment 1–5 pendant la session de questionnaire court.',
    fields: [
      { key: 'segment_order', description: 'Ordre 1–5.' },
      { key: 'segment_key', description: 'Clé métier du segment.' },
      { key: 'question_id', description: 'Code question affichée.' },
    ],
  },
  {
    event: 'v3_short_path_outcome_view',
    title: 'Écran de sortie courte affiché',
    when: 'Composant résultat court monté.',
    fields: [{ key: 'usecase_id', description: 'Cas.' }],
  },
  {
    event: 'v3_short_path_outcome_result',
    title: 'Résultat moteur disponible sur la sortie',
    when: 'Après réponse API risk-level avec `classification_status`.',
    fields: [
      { key: 'classification_status', description: 'ex. `qualified`, `impossible`.' },
      { key: 'risk_level', description: '`minimal` | `limited` | `high` | `unacceptable` | null selon cas.' },
      { key: 'system_type_bucket', description: 'Segmentation.' },
    ],
  },
  {
    event: 'v3_short_path_cta',
    title: 'Clic CTA ou action (sortie, export, navigation)',
    when: 'Chaque interaction trackée (voir valeurs `cta` / `cta_placement`).',
    fields: [
      { key: 'cta', description: 'Type d’action (`evaluation_long`, `copy_summary`, …).' },
      { key: 'cta_placement', description: 'Zone d’écran (optionnel).' },
      { key: 'classification_status', description: 'Si déjà connu côté client.' },
      { key: 'risk_level', description: 'Si déjà connu côté client.' },
    ],
  },
]

export type V3PilotageEntrySurface = {
  value: string
  label: string
  context: string
}

/** Valeurs documentées pour `entree` / `entry_surface` (court + long). */
export const V3_PILOTAGE_ENTRY_SURFACES: V3PilotageEntrySurface[] = [
  { value: 'dashboard_card', label: 'Dashboard', context: 'Carte cas V3 incomplet → synthèse.' },
  { value: 'dashboard_card_legacy', label: 'Dashboard (legacy)', context: 'Cas non-V3 → évaluation longue directe.' },
  { value: 'overview_v3_card_long', label: 'Synthèse — long', context: 'CTA parcours complet depuis l’encart V3.' },
  { value: 'overview_v3_card_short', label: 'Synthèse — court', context: 'CTA pré-diagnostic depuis l’encart V3.' },
  { value: 'header_v3_resume', label: 'Fiche cas — long', context: 'Bouton continuer questionnaire (V3 brouillon).' },
  { value: 'header_v3_short', label: 'Fiche cas — court', context: 'Lien pré-diagnostic rapide.' },
  { value: 'dossier_detail_long', label: 'Dossier — long', context: 'Encart orientation questionnaire.' },
  { value: 'dossier_detail_short', label: 'Dossier — court', context: 'Encart orientation questionnaire.' },
  { value: 'short_path_intro_long', label: 'Intro court — long', context: 'CTA parcours complet en tête du court.' },
  { value: 'short_path_outcome_long', label: 'Sortie courte — long', context: 'CTA principal après résultat.' },
  { value: 'outcome_error_fallback_long', label: 'Sortie courte — erreur', context: 'Repli si API niveau en échec.' },
]

export type V3PilotageFunnelStep = {
  order: number
  event: string
  label: string
  productNote: string
}

/** Funnel logique court (ordre lecture produit — les segments peuvent ne pas tous être vus selon branche). */
export const V3_PILOTAGE_FUNNEL_SHORT: V3PilotageFunnelStep[] = [
  {
    order: 1,
    event: 'v3_short_path_start',
    label: 'Entrée parcours court',
    productNote: 'Volume d’intention réelle ; croiser avec `entry_surface`.',
  },
  {
    order: 2,
    event: 'v3_short_path_segment',
    label: 'Progression segments 1 → 5',
    productNote: 'Compter par `segment_order` / `segment_key` — où la courbe s’aplatit = friction ou abandon.',
  },
  {
    order: 3,
    event: 'v3_short_path_outcome_view',
    label: 'Arrivée sur l’écran résultat',
    productNote: 'Taux outcome_view / start = complétion du court (hors erreurs API).',
  },
  {
    order: 4,
    event: 'v3_short_path_outcome_result',
    label: 'Résultat affiché (qualification + niveau)',
    productNote: 'Répartition `risk_level` × `classification_status` — mix produit / risque.',
  },
  {
    order: 5,
    event: 'v3_short_path_cta',
    label: 'Actions post-résultat',
    productNote: 'Exports, navigation, conversion `evaluation_long` — voir groupements CTA.',
  },
]

export type V3PilotageGa4Recipe = {
  id: string
  title: string
  objective: string
  explorationType: string
  dimensions: string[]
  metrics: string[]
  filters: string[]
  interpretation: string
}

export const V3_PILOTAGE_GA4_RECIPES: V3PilotageGa4Recipe[] = [
  {
    id: 'entrees-court',
    title: 'Entrées parcours court',
    objective: 'Savoir d’où le court est lancé et si le volume est significatif.',
    explorationType: 'Exploration libre ou rapport personnalisé',
    dimensions: ['Event name', 'entry_surface', 'page_path'],
    metrics: ['Event count', 'Total users'],
    filters: ['Event name = v3_short_path_start'],
    interpretation:
      'Regrouper par `entry_surface` (dimension personnalisée si mappée depuis le dataLayer). Sans dimension : utiliser `page_path` contenant `parcours=court` + referrer.',
  },
  {
    id: 'entrees-long-tracees',
    title: 'Ouvertures longues avec amont',
    objective: 'Comparer dashboard, synthèse, header, dossier pour les ouvertures longues tracées.',
    explorationType: 'Exploration libre',
    dimensions: ['Event name', 'entry_surface', 'system_type_bucket'],
    metrics: ['Event count'],
    filters: ['Event name = v3_evaluation_entry_surface'],
    interpretation:
      'Classement des `entry_surface` = levier d’orientation à optimiser en priorité.',
  },
  {
    id: 'funnel-segments',
    title: 'Funnel segments court',
    objective: 'Voir où l’on perd entre le start et la sortie.',
    explorationType: 'Analyse des chemins ou funnel à étapes',
    dimensions: ['segment_order', 'segment_key'],
    metrics: ['Event count'],
    filters: ['Event name = v3_short_path_segment'],
    interpretation:
      'Comparer le volume du dernier `segment_order` observé vs `v3_short_path_start` ; un écart fort sur un ordre indique une chute sur ce segment.',
  },
  {
    id: 'resultats-outcome',
    title: 'Répartition des résultats (niveau / qualification)',
    objective: 'Répondre « quel type de résultat ressort le plus ? »',
    explorationType: 'Exploration libre',
    dimensions: ['risk_level', 'classification_status', 'system_type_bucket'],
    metrics: ['Event count'],
    filters: ['Event name = v3_short_path_outcome_result'],
    interpretation:
      'Histogramme sur `risk_level` pour les `classification_status = qualified` ; isoler `impossible` pour les cas à clarifier.',
  },
  {
    id: 'conversion-long',
    title: 'Conversion court → long',
    objective: 'Mesurer les clics vers le long depuis la sortie vs autres surfaces.',
    explorationType: 'Exploration libre',
    dimensions: ['cta', 'cta_placement', 'risk_level', 'classification_status'],
    metrics: ['Event count'],
    filters: ['Event name = v3_short_path_cta', 'cta = evaluation_long'],
    interpretation:
      'Taux simple : evaluation_long (tous placements) / v3_short_path_outcome_view sur une même période (approximation session-level : affiner avec BigQuery si export GA4).',
  },
  {
    id: 'partage-sortie',
    title: 'Usage sortie courte (partage & exports)',
    objective: 'Savoir si le pré-diagnostic est partagé concrètement.',
    explorationType: 'Exploration libre',
    dimensions: ['cta'],
    metrics: ['Event count'],
    filters: [
      'Event name = v3_short_path_cta',
      'cta one of copy_summary | download_txt | download_md | download_pdf_prediagnostic | mailto_prepare',
    ],
    interpretation:
      'Somme des événements = intent de partage ; croiser avec outcome_view pour un taux par visiteur unique.',
  },
  {
    id: 'cta-sortie-navigation',
    title: 'Navigation depuis la sortie (dossier, todo, synthèse)',
    objective: 'Voir si les utilisateurs enchaînent vers preuves / todo.',
    explorationType: 'Exploration libre',
    dimensions: ['cta', 'cta_placement'],
    metrics: ['Event count'],
    filters: [
      'Event name = v3_short_path_cta',
      'cta one of dossier | todo | overview | dashboard',
      'cta_placement = outcome_quick_links',
    ],
    interpretation:
      'Volumes relatifs dossier vs todo = priorisation UX dossier/todo.',
  },
]

/** IDs `cta` pour regroupement affichage admin. */
export const V3_PILOTAGE_CTA_LONG = 'evaluation_long' as const
export const V3_PILOTAGE_CTA_SHORT = 'evaluation_short' as const

export const V3_PILOTAGE_CTA_GROUPS = {
  conversionLong: [V3_PILOTAGE_CTA_LONG],
  entreeCourt: [V3_PILOTAGE_CTA_SHORT],
  partageExport: [
    'copy_summary',
    'download_txt',
    'download_md',
    'download_pdf_prediagnostic',
    'mailto_prepare',
  ],
  navigationPostSortie: ['overview', 'dossier', 'todo', 'dashboard'],
} as const

export const V3_PILOTAGE_PRODUCT_DECISIONS: { question: string; how: string }[] = [
  {
    question: 'Le court est-il vraiment utilisé ?',
    how: 'Volume `v3_short_path_start` sur 7 / 30 jours ; comparer aux cas V3 créés (admin Analytics existant).',
  },
  {
    question: 'Quelle entrée fonctionne le mieux ?',
    how: 'Tableau `entry_surface` sur `v3_short_path_start` + `v3_evaluation_entry_surface` (long).',
  },
  {
    question: 'Le court convertit-il vers le long ?',
    how: 'Comptage `v3_short_path_cta` avec `cta = evaluation_long` / `v3_short_path_outcome_view` (approximation).',
  },
  {
    question: 'Les utilisateurs partagent-ils le pré-diagnostic ?',
    how: 'Somme des CTA partageExport ; optionnellement / outcome_view.',
  },
]

/** Unicité des noms d’événements catalogue (garde-fou tests). */
export function v3PilotageEventNames(): string[] {
  return V3_PILOTAGE_EVENTS.map((e) => e.event)
}

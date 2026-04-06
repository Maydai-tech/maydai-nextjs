/**
 * Catalogue canonique des actions MaydAI — source de vérité (phases 1 & 2).
 * Pilote ordre, libellés dossier/todo, modes de preuve et alias legacy.
 */

export type EvidenceMode = 'file' | 'form' | 'text' | 'mixed' | 'none'

export interface CanonicalActionDefinition {
  canonical_action_code: string
  doc_type_canonique: string
  /** Nom d’affichage commun (todo, listes, en-têtes). */
  label: string
  legacy_aliases: readonly string[]
  report_slot_target: string | null
  questionnaire_links: readonly string[]
  todo_doc_type_target: string
  dossier_section_target: string
  evidence_mode: EvidenceMode
  accepted_formats: string
  /** Ordre dans le flux conformité standard (todo + dossier), 1-based. null = hors flux standard. */
  standard_compliance_order: number | null
  /** Action registre : complétion MaydAI / preuve / cas A-B-C gérés hors catalogue. */
  registry_completion_special: boolean
  /** Texte court de l’action todo (flux standard, hors libellé registre dynamique). */
  todo_action_label: string
  /** Paragraphe d’aide sous la todo. */
  todo_explanation: string
  /** Titre section dossier sans préfixe numérique (le numéro est ajouté par l’UI). */
  dossier_section_title: string
  dossier_description: string
  dossier_help_info: string
  /** Valeur passée aux composants d’upload (extensions affichées). */
  dossier_accepted_formats_ui: string
  dossier_mixed_text_label?: string
  dossier_mixed_text_placeholder?: string
  dossier_mixed_file_label?: string
  dossier_mixed_file_help?: string
  /** Bonus score brut (+3 typiquement) quand le dossier est complété, hors logique questionnaire. */
  dossier_direct_bonus_raw_points?: number | null
  /** Points normalisés affichés pour l’action registre (todo / cartes). */
  registry_normalized_display_points?: number
  /** Titres todo registre selon le cas A/B/C (questionnaire Q7). */
  registry_todo_title_by_case?: Readonly<Record<'A' | 'B' | 'C', string>>
  /** Textes d’aide sous la todo registre (variantes selon preuve / MaydAI). */
  registry_todo_help_by_case?: Readonly<{
    A: { withoutProof: string; withProof: string }
    B: { maydaiOff: string; maydaiOn: string }
    C: { withoutProof: string; withProof: string }
    default: string
  }>
}

/** Alias legacy → clé `doc_type` canonique stockée côté dossier / UI. */
export const LEGACY_DOC_TYPE_ALIASES: Readonly<Record<string, string>> = {
  registry_action: 'registry_proof',
  training_census: 'training_plan',
}

export const CANONICAL_DOC_TYPES = [
  'registry_proof',
  'human_oversight',
  'system_prompt',
  'technical_documentation',
  'transparency_marking',
  'data_quality',
  'risk_management',
  'continuous_monitoring',
  'training_plan',
  'stopping_proof',
] as const

export type CanonicalDocType = (typeof CANONICAL_DOC_TYPES)[number]

/** Types `docType` acceptés en entrée des routes API dossier (canon + alias). Évite la dérive entre fichiers. */
export function getAcceptedDossierApiDocTypeParams(): Set<string> {
  return new Set<string>([...CANONICAL_DOC_TYPES, ...Object.keys(LEGACY_DOC_TYPE_ALIASES)])
}

export const CANONICAL_ACTIONS: readonly CanonicalActionDefinition[] = [
  {
    canonical_action_code: 'MAYDAI_REGISTRY',
    doc_type_canonique: 'registry_proof',
    label: 'Registre centralisé des systèmes d’IA',
    legacy_aliases: ['registry_action', 'quick_win_1'],
    report_slot_target: 'quick_win_1',
    questionnaire_links: ['E5.N9.Q7'],
    todo_doc_type_target: 'registry_proof',
    dossier_section_target: 'registry_proof',
    evidence_mode: 'file',
    accepted_formats: '.pdf,.png,.jpg,.jpeg',
    standard_compliance_order: 1,
    registry_completion_special: true,
    todo_action_label: 'Preuve d’usage du registre centralisé',
    todo_explanation:
      'Ajoutez une preuve d’utilisation de votre registre IA ou activez MaydAI comme registre depuis les paramètres entreprise.',
    dossier_section_title: 'Preuve d’Usage du Registre Centralisé',
    dossier_description:
      'Document prouvant l’utilisation d’un registre centralisé pour vos systèmes d’IA.',
    dossier_help_info:
      'Document attestant de l’utilisation d’un registre centralisé conforme à l’AI Act pour le suivi de vos systèmes d’IA. Peut inclure : capture d’écran du registre, attestation du responsable, export de données du registre, ou tout autre élément prouvant son utilisation effective.',
    dossier_accepted_formats_ui: '.pdf,.png,.jpg,.jpeg',
    dossier_direct_bonus_raw_points: null,
    registry_normalized_display_points: 3,
    registry_todo_title_by_case: {
      A: 'Initialiser le registre centralisé pour vos systèmes d\'IA',
      B: 'Initialiser le registre centralisé pour vos systèmes d\'IA',
      C: 'Prouver l\'usage de votre registre centralisé',
    },
    registry_todo_help_by_case: {
      A: {
        withoutProof:
          "Vous avez indiqué ne pas maintenir de registre centralisé pour vos systèmes IA. Conformément à l'AI Act, vous devez soit déclarer MaydAI comme votre registre centralisé, soit prouver l'utilisation d'un autre registre.",
        withProof: 'Vous avez déclaré un autre registre que MaydAI pour vos systèmes IA Act.',
      },
      B: {
        maydaiOff:
          "Vous avez indiqué utiliser MaydAI comme registre centralisé. Confirmez ce choix dans les paramètres de votre entreprise pour valider cette action.",
        maydaiOn: 'Vous avez déclaré MaydAI comme votre registre centralisé IA Act.',
      },
      C: {
        withoutProof:
          "Vous avez indiqué utiliser un autre registre centralisé. Veuillez fournir une preuve de l'utilisation de ce registre (capture d'écran, document, etc.) ou déclarer MaydAI comme votre registre à la place.",
        withProof: 'Vous avez déclaré un autre registre que MaydAI pour vos systèmes IA Act.',
      },
      default: 'Action requise pour le registre centralisé de vos systèmes IA.',
    },
  },
  {
    canonical_action_code: 'MAYDAI_SYSTEM_INSTRUCTIONS',
    doc_type_canonique: 'system_prompt',
    label: 'Instructions système, prompts et garde-fous',
    legacy_aliases: ['quick_win_3'],
    report_slot_target: 'quick_win_3',
    questionnaire_links: ['E5.N9.Q3'],
    todo_doc_type_target: 'system_prompt',
    dossier_section_target: 'system_prompt',
    evidence_mode: 'text',
    accepted_formats: '.txt,.md',
    standard_compliance_order: 2,
    registry_completion_special: false,
    todo_action_label: 'Définir les instructions système & prompts',
    todo_explanation:
      'Documentez les instructions données au modèle pour garantir reproductibilité et auditabilité.',
    dossier_section_title: 'Instructions Système et Prompts Principaux',
    dossier_description:
      'Veuillez coller ici l’intégralité du prompt système (instructions de base) donné à l’IA pour ce cas d’usage.',
    dossier_help_info:
      'Tracer les instructions exactes données à l’IA (le "system prompt" ou les instructions de base) pour garantir la reproductibilité et l’auditabilité du comportement de l’IA. Si le prompt est dynamique, fournissez le modèle (template) et expliquez les variables.',
    dossier_accepted_formats_ui: '.txt,.md',
    dossier_direct_bonus_raw_points: 3,
  },
  {
    canonical_action_code: 'MAYDAI_HUMAN_OVERSIGHT',
    doc_type_canonique: 'human_oversight',
    label: 'Responsable de la surveillance humaine',
    legacy_aliases: ['quick_win_2'],
    report_slot_target: 'quick_win_2',
    questionnaire_links: ['E5.N9.Q8'],
    todo_doc_type_target: 'human_oversight',
    dossier_section_target: 'human_oversight',
    evidence_mode: 'form',
    accepted_formats: '',
    standard_compliance_order: 3,
    registry_completion_special: false,
    todo_action_label: 'Désigner le(s) responsable(s) de surveillance',
    todo_explanation:
      'Désignez une personne physique claire, responsable de la supervision "human-in-the-loop" ou de l’audit a posteriori. Cela garantit l’accountability (responsabilité) du système.',
    dossier_section_title: 'Responsable de la Surveillance Humaine',
    dossier_description:
      'Désignez la personne physique responsable de la supervision du système d’IA.',
    dossier_help_info:
      'Assurer l’accountability (responsabilité) en désignant une personne claire, responsable de la supervision "human-in-the-loop" ou de l’audit a posteriori.',
    dossier_accepted_formats_ui: '',
  },
  {
    canonical_action_code: 'MAYDAI_TECHNICAL_DOCUMENTATION',
    doc_type_canonique: 'technical_documentation',
    label: 'Documentation technique du système',
    legacy_aliases: ['priorite_1'],
    report_slot_target: 'priorite_1',
    questionnaire_links: ['E5.N9.Q4'],
    todo_doc_type_target: 'technical_documentation',
    dossier_section_target: 'technical_documentation',
    evidence_mode: 'file',
    accepted_formats: '.pdf,.docx,.md',
    standard_compliance_order: 4,
    registry_completion_special: false,
    todo_action_label: 'Importer la documentation technique',
    todo_explanation:
      'Décrivez le(s) modèle(s) d’IA utilisé(s), l’architecture générale, les capacités prévues et surtout les limitations connues (risques d’hallucination, biais potentiels, etc.).',
    dossier_section_title: 'Documentation Technique du Système',
    dossier_description:
      'Uploadez la documentation décrivant le modèle, ses capacités et ses limitations (max 10MB).',
    dossier_help_info:
      'Document décrivant : le(s) modèle(s) d’IA sous-jacents (ex: "GPT-4o", "Claude 3 Sonnet"), l’architecture générale, les capacités prévues, et surtout les limitations connues (risques d’hallucination, biais potentiels, etc.).',
    dossier_accepted_formats_ui: '.pdf,.docx,.md',
  },
  {
    canonical_action_code: 'MAYDAI_TRANSPARENCY_MARKING',
    doc_type_canonique: 'transparency_marking',
    label: 'Information / marquage de transparence',
    legacy_aliases: ['priorite_2'],
    report_slot_target: 'priorite_2',
    questionnaire_links: ['E6.N10.Q1', 'E6.N10.Q2'],
    todo_doc_type_target: 'transparency_marking',
    dossier_section_target: 'transparency_marking',
    evidence_mode: 'mixed',
    accepted_formats: 'images .png,.jpg,.jpeg,.gif + texte',
    standard_compliance_order: 5,
    registry_completion_special: false,
    todo_action_label: 'Renseigner le marquage de transparence',
    todo_explanation:
      'Décrivez comment le contenu généré par l’IA est marqué comme tel (ex: "Généré par IA", watermark, disclaimer). L’utilisateur final doit être informé qu’il interagit avec une IA.',
    dossier_section_title: 'Marquage de Transparence IA',
    dossier_description:
      'Décrivez comment le contenu généré par l’IA est marqué comme tel (ex: "Généré par IA", watermark, disclaimer).',
    dossier_help_info:
      'Prouver que l’utilisateur final est informé qu’il interagit avec une IA (transparence), comme l’exige l’IA Act. Vous pouvez fournir une description textuelle et/ou un exemple visuel (capture d’écran).',
    dossier_accepted_formats_ui: '.png,.jpg,.jpeg,.gif',
    dossier_mixed_text_label: 'Description du marquage',
    dossier_mixed_text_placeholder: 'Décrivez comment le contenu généré par l’IA est marqué...',
    dossier_mixed_file_label: 'Exemple visuel (optionnel)',
    dossier_mixed_file_help: 'Capture d’écran montrant le marquage',
  },
  {
    canonical_action_code: 'MAYDAI_DATA_QUALITY',
    doc_type_canonique: 'data_quality',
    label: 'Qualité des données',
    legacy_aliases: ['priorite_3'],
    report_slot_target: 'priorite_3',
    questionnaire_links: ['E5.N9.Q6'],
    todo_doc_type_target: 'data_quality',
    dossier_section_target: 'data_quality',
    evidence_mode: 'file',
    accepted_formats: '.pdf,.docx',
    standard_compliance_order: 6,
    registry_completion_special: false,
    todo_action_label: 'Justifier la qualité des données (Procédure)',
    todo_explanation:
      'Démontrez que les données utilisées (pour l’entraînement, le fine-tuning, ou le RAG) sont de bonne qualité, non biaisées et gérées correctement.',
    dossier_section_title: 'Procédure de Qualité des Données',
    dossier_description:
      'Décrivez comment vous assurez la qualité, la pertinence et l’absence de biais dans les données d’entraînement ou de RAG.',
    dossier_help_info:
      'Démontrer que les données utilisées (pour l’entraînement, le fine-tuning, ou le RAG) sont de bonne qualité, non biaisées et gérées correctement. Incluez : source des données, méthodes de nettoyage et d’anonymisation, processus de validation.',
    dossier_accepted_formats_ui: '.pdf,.docx',
  },
  {
    canonical_action_code: 'MAYDAI_RISK_MANAGEMENT',
    doc_type_canonique: 'risk_management',
    label: 'Plan de gestion des risques',
    legacy_aliases: ['action_1'],
    report_slot_target: 'action_1',
    questionnaire_links: ['E5.N9.Q1', 'E5.N9.Q2', 'E5.N9.Q3'],
    todo_doc_type_target: 'risk_management',
    dossier_section_target: 'risk_management',
    evidence_mode: 'file',
    accepted_formats: '.pdf,.docx,.xlsx',
    standard_compliance_order: 7,
    registry_completion_special: false,
    todo_action_label: 'Joindre le plan de gestion des risques',
    todo_explanation:
      'Documentez que les risques potentiels (biais, sécurité, confidentialité, mauvais usage) ont été identifiés et que des mesures sont en place pour les atténuer.',
    dossier_section_title: 'Plan de Gestion des Risques',
    dossier_description: 'Uploadez votre registre des risques et le plan de mitigation associé.',
    dossier_help_info:
      'Documenter que les risques potentiels (biais, sécurité, confidentialité, mauvais usage) ont été identifiés et que des mesures sont en place pour les atténuer. Typiquement un tableau listant : Risque identifié, Probabilité, Impact, et Mesure de mitigation.',
    dossier_accepted_formats_ui: '.pdf,.docx,.xlsx',
  },
  {
    canonical_action_code: 'MAYDAI_CONTINUOUS_MONITORING',
    doc_type_canonique: 'continuous_monitoring',
    label: 'Plan de surveillance continue',
    legacy_aliases: ['action_2'],
    report_slot_target: 'action_2',
    questionnaire_links: ['E5.N9.Q9'],
    todo_doc_type_target: 'continuous_monitoring',
    dossier_section_target: 'continuous_monitoring',
    evidence_mode: 'file',
    accepted_formats: '.pdf,.docx',
    standard_compliance_order: 8,
    registry_completion_special: false,
    todo_action_label: 'Établir le plan de surveillance continue',
    todo_explanation:
      'Détaillez les métriques (KPIs) de performance suivies, la fréquence des audits, et la procédure en cas de détection d’anomalie ou de risque émergent.',
    dossier_section_title: 'Plan de Surveillance Continue (Monitoring)',
    dossier_description:
      'Comment suivez-vous les performances et la sécurité du système en production ?',
    dossier_help_info:
      'Prouver que le système n’est pas "lancé et oublié". Document détaillant : les métriques (KPIs) de performance suivies, la fréquence des audits, la procédure en cas de détection d’anomalie ou de risque émergent.',
    dossier_accepted_formats_ui: '.pdf,.docx',
  },
  {
    canonical_action_code: 'MAYDAI_TRAINING_COMPLIANCE',
    doc_type_canonique: 'training_plan',
    label: 'Formation / sensibilisation AI Act',
    legacy_aliases: ['training_census', 'action_3'],
    report_slot_target: 'action_3',
    questionnaire_links: [],
    todo_doc_type_target: 'training_plan',
    dossier_section_target: 'training_plan',
    evidence_mode: 'mixed',
    accepted_formats: '.pdf,.docx,.xlsx,.pptx,.md',
    standard_compliance_order: 9,
    registry_completion_special: false,
    todo_action_label: 'Recenser les formations AI Act',
    todo_explanation:
      'Recensez les formations AI Act suivies par vos équipes. Documentez les participants, dates, contenus et certificats obtenus pour démontrer la compétence de votre organisation en matière de conformité.',
    dossier_section_title: 'Plan de formation',
    dossier_description: 'Le plan de formation des équipes utilisant le système d’IA.',
    dossier_help_info:
      'Document décrivant le programme de formation des utilisateurs du système d’IA : objectifs de formation, contenus couverts, fréquence des sessions, et méthodes d’évaluation des compétences acquises.',
    dossier_accepted_formats_ui: '.pdf,.docx,.xlsx,.pptx,.md',
    dossier_mixed_text_label: 'Description du plan de formation',
    dossier_mixed_text_placeholder: 'Décrivez le programme de formation des utilisateurs...',
    dossier_mixed_file_label: 'Document de formation (optionnel)',
    dossier_mixed_file_help: 'Plan de formation détaillé',
    dossier_direct_bonus_raw_points: 3,
  },
  {
    canonical_action_code: 'MAYDAI_STOPPING_PROOF',
    doc_type_canonique: 'stopping_proof',
    label: 'Preuve d’arrêt ou de non-déploiement',
    legacy_aliases: [],
    report_slot_target: null,
    questionnaire_links: [],
    todo_doc_type_target: 'stopping_proof',
    dossier_section_target: 'stopping_proof',
    evidence_mode: 'file',
    accepted_formats: '.pdf,.png,.jpg,.jpeg',
    standard_compliance_order: null,
    registry_completion_special: false,
    todo_action_label: 'Compléter la preuve d’arrêt du système',
    todo_explanation:
      'Ce cas d’usage IA a été identifié comme inacceptable selon l’AI Act. Vous devez fournir une preuve que le système a bien été arrêté (email, capture d’écran, attestation, etc.).',
    dossier_section_title: 'Preuve d’Arrêt du Système',
    dossier_description:
      'Document prouvant que le système à risque inacceptable a été arrêté ou n’a jamais été déployé.',
    dossier_help_info:
      'Document officiel attestant de l’arrêt du système d’IA identifié comme présentant un risque inacceptable selon l’AI Act. Peut inclure : procès-verbal d’arrêt, capture d’écran de désactivation, attestation du responsable technique, ou tout autre élément prouvant la cessation d’activité.',
    dossier_accepted_formats_ui: '.pdf,.png,.jpg,.jpeg',
  },
] as const

/**
 * Groupes de slots rapport (contrat JSON / OpenAI inchangé — phase 3 : ordre d’affichage UI).
 * Chaque clé est mappée à une action via `report_slot_target` dans le catalogue.
 */
export const REPORT_SLOT_GROUP_QUICK_WINS = ['quick_win_1', 'quick_win_2', 'quick_win_3'] as const
export const REPORT_SLOT_GROUP_PRIORITES = ['priorite_1', 'priorite_2', 'priorite_3'] as const
export const REPORT_SLOT_GROUP_ACTIONS = ['action_1', 'action_2', 'action_3'] as const

export type ReportStandardSlotKey =
  | (typeof REPORT_SLOT_GROUP_QUICK_WINS)[number]
  | (typeof REPORT_SLOT_GROUP_PRIORITES)[number]
  | (typeof REPORT_SLOT_GROUP_ACTIONS)[number]

/**
 * Ordre unique des 9 slots narrative (JSON rapport / LLM) — même ordre que l’UI web et le PDF.
 * Source unique pour éviter toute dérive entre pages, blocs et génération PDF.
 */
export const REPORT_STANDARD_SLOT_KEYS_ORDERED = [
  ...REPORT_SLOT_GROUP_QUICK_WINS,
  ...REPORT_SLOT_GROUP_PRIORITES,
  ...REPORT_SLOT_GROUP_ACTIONS,
] as const satisfies readonly ReportStandardSlotKey[]

/** Résout une clé de slot rapport vers l’entrée catalogue (doc_type, libellés, etc.). */
export function getCanonicalActionByReportSlot(slotKey: string): CanonicalActionDefinition | undefined {
  return CANONICAL_ACTIONS.find(a => a.report_slot_target === slotKey)
}

/** `doc_type` canonique associé à un slot standard (rapport), ou null si inconnu. */
export function getCanonicalDocTypeForReportSlot(slotKey: string): string | null {
  return getCanonicalActionByReportSlot(slotKey)?.doc_type_canonique ?? null
}

const TRAINING_STORAGE_TYPES = ['training_plan', 'training_census'] as const

/** Actions du flux standard, dans l’ordre (registre + 8). */
export function getStandardComplianceActionsOrdered(): CanonicalActionDefinition[] {
  return CANONICAL_ACTIONS.filter(a => a.standard_compliance_order !== null).sort(
    (a, b) => (a.standard_compliance_order ?? 0) - (b.standard_compliance_order ?? 0)
  )
}

/** Types doc du flux standard dans l’ordre (registre inclus). */
export function getStandardComplianceDocTypesOrdered(): string[] {
  return getStandardComplianceActionsOrdered().map(a => a.doc_type_canonique)
}

/** 8 actions conformité hors registre, ordre catalogue. */
export function getStandardComplianceDocTypesExcludingRegistry(): string[] {
  return getStandardComplianceActionsOrdered()
    .filter(a => !a.registry_completion_special)
    .map(a => a.doc_type_canonique)
}

/** Liste stable pour le hook useDocumentStatuses (tous les types susceptibles d’être consultés). */
export function getDocumentTypesForStatusHook(): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const a of CANONICAL_ACTIONS) {
    if (!seen.has(a.doc_type_canonique)) {
      seen.add(a.doc_type_canonique)
      out.push(a.doc_type_canonique)
    }
  }
  return out
}

export function getCanonicalActionByDocType(docType: string): CanonicalActionDefinition | undefined {
  const c = resolveCanonicalDocType(docType)
  return CANONICAL_ACTIONS.find(a => a.doc_type_canonique === c)
}

export function getRegistryCatalogEntry(): CanonicalActionDefinition | undefined {
  return CANONICAL_ACTIONS.find(a => a.registry_completion_special)
}

export function getRegistryTodoTitleForCase(caseKey: 'A' | 'B' | 'C'): string {
  const reg = getRegistryCatalogEntry()
  const fallback: Record<'A' | 'B' | 'C', string> = {
    A: "Initialiser le registre centralisé pour vos systèmes d'IA",
    B: "Initialiser le registre centralisé pour vos systèmes d'IA",
    C: "Prouver l'usage de votre registre centralisé",
  }
  return reg?.registry_todo_title_by_case?.[caseKey] ?? fallback[caseKey]
}

export function getRegistryTodoHelpExplanation(
  caseKey: 'A' | 'B' | 'C' | null | undefined,
  ctx: { hasRegistryProofDocument: boolean; maydaiAsRegistry: boolean }
): string {
  const help = getRegistryCatalogEntry()?.registry_todo_help_by_case
  if (!help) return 'Action requise pour le registre centralisé de vos systèmes IA.'
  if (!caseKey) return help.default
  switch (caseKey) {
    case 'A':
      return ctx.hasRegistryProofDocument ? help.A.withProof : help.A.withoutProof
    case 'B':
      return ctx.maydaiAsRegistry ? help.B.maydaiOn : help.B.maydaiOff
    case 'C':
      return ctx.hasRegistryProofDocument ? help.C.withProof : help.C.withoutProof
  }
}

export function getRegistryNormalizedPointsFromCatalog(): number {
  return getRegistryCatalogEntry()?.registry_normalized_display_points ?? 3
}

/** Types de documents donnant un bonus dossier (hors questionnaire), clés canoniques. */
export function getDirectBonusCanonicalDocTypes(): string[] {
  return CANONICAL_ACTIONS.filter(
    a => a.dossier_direct_bonus_raw_points != null && (a.dossier_direct_bonus_raw_points as number) > 0
  ).map(a => a.doc_type_canonique)
}

export function getDossierDirectBonusRawPointsAmount(): number {
  const a = CANONICAL_ACTIONS.find(
    x => x.dossier_direct_bonus_raw_points != null && (x.dossier_direct_bonus_raw_points as number) > 0
  )
  return (a?.dossier_direct_bonus_raw_points as number) ?? 3
}

/** Types `doc_type` à interroger en base (inclut `training_census` si bonus formation). */
export function getDossierDirectBonusSupabaseQueryDocTypes(): string[] {
  const set = new Set<string>()
  for (const dt of getDirectBonusCanonicalDocTypes()) {
    if (dt === 'training_plan') {
      TRAINING_STORAGE_TYPES.forEach(t => set.add(t))
    } else {
      set.add(dt)
    }
  }
  return [...set]
}

/** Points normalisés (affichage todo) pour une action du flux standard hors registre et hors preuve d’arrêt. */
export function getComplianceNormalizedPointsForDocType(docType: string): number {
  const a = getCanonicalActionByDocType(docType)
  if (!a || a.doc_type_canonique === 'stopping_proof') return 0
  if (a.registry_completion_special) return 0
  if (a.standard_compliance_order !== null) return 2
  return 0
}

/** Alias explicite phase 2 : mêmes types que `getStandardComplianceDocTypesExcludingRegistry`. */
export function getStandardTodoComplianceDocTypesOrdered(): string[] {
  return getStandardComplianceDocTypesExcludingRegistry()
}

export type DossierDocUiType = 'file' | 'form' | 'textarea' | 'mixed'

export interface DossierSectionUiDefinition {
  key: string
  label: string
  description: string
  helpInfo: string
  acceptedFormats: string
  type: DossierDocUiType
  textLabel?: string
  textPlaceholder?: string
  fileLabel?: string
  fileHelpText?: string
}

function evidenceModeToDossierUiType(mode: EvidenceMode): DossierDocUiType {
  switch (mode) {
    case 'file':
      return 'file'
    case 'form':
      return 'form'
    case 'text':
      return 'textarea'
    case 'mixed':
      return 'mixed'
    default:
      return 'file'
  }
}

/** Section dossier pour le flux standard (numéro de section affiché dans le label). */
export function toDossierSectionUi(
  action: CanonicalActionDefinition,
  sectionNumber: number
): DossierSectionUiDefinition {
  return {
    key: action.doc_type_canonique,
    label: `${sectionNumber}. ${action.dossier_section_title}`,
    description: action.dossier_description,
    helpInfo: action.dossier_help_info,
    acceptedFormats: action.dossier_accepted_formats_ui,
    type: evidenceModeToDossierUiType(action.evidence_mode),
    textLabel: action.dossier_mixed_text_label,
    textPlaceholder: action.dossier_mixed_text_placeholder,
    fileLabel: action.dossier_mixed_file_label,
    fileHelpText: action.dossier_mixed_file_help,
  }
}

export function getStandardDossierSectionsOrdered(): DossierSectionUiDefinition[] {
  return getStandardComplianceActionsOrdered().map((a, i) => toDossierSectionUi(a, i + 1))
}

/** Section preuve d’arrêt (cas inacceptable) — label sans numéro de série standard. */
export function getStoppingProofDossierSectionUi(): DossierSectionUiDefinition {
  const a = CANONICAL_ACTIONS.find(x => x.doc_type_canonique === 'stopping_proof')!
  const base = toDossierSectionUi(a, 1)
  return { ...base, label: a.dossier_section_title }
}

/** Section prompts pour vue inacceptable (même contenu que standard, titre court). */
export function getSystemPromptDossierSectionUiUnacceptable(): DossierSectionUiDefinition {
  const a = CANONICAL_ACTIONS.find(x => x.doc_type_canonique === 'system_prompt')!
  const base = toDossierSectionUi(a, 1)
  return { ...base, label: a.dossier_section_title }
}

/** Résout un doc_type (alias ou canon) vers le type de stockage unique. */
export function resolveCanonicalDocType(docType: string): string {
  return LEGACY_DOC_TYPE_ALIASES[docType] ?? docType
}

/**
 * Alias explicite « resolver » phase 1 : même comportement que `resolveCanonicalDocType`.
 * Nouveaux alias documentaires : ajouter une entrée dans `LEGACY_DOC_TYPE_ALIASES`.
 */
export function resolveLegacyDocTypeAlias(docType: string): string {
  return resolveCanonicalDocType(docType)
}

export function resolveDossierSectionIdFromUrlParam(param: string): string {
  return resolveCanonicalDocType(param)
}

/** Deep link dashboard — dossier, section preuve (`doc` canonique ou alias legacy). */
export function buildDashboardDossierDeepLink(
  companyId: string,
  useCaseId: string,
  docType: string
): string {
  const c = resolveCanonicalDocType(docType)
  return `/dashboard/${companyId}/dossiers/${useCaseId}?doc=${encodeURIComponent(c)}`
}

/** Deep link dashboard — to-do list avec surlignage action (`action` canonique ou alias). */
export function buildDashboardTodoListDeepLink(
  companyId: string,
  useCaseId: string,
  docType: string
): string {
  const c = resolveCanonicalDocType(docType)
  return `/dashboard/${companyId}/todo-list?usecase=${encodeURIComponent(useCaseId)}&action=${encodeURIComponent(c)}`
}

export function isTrainingDocStorageGroup(docType: string): boolean {
  return TRAINING_STORAGE_TYPES.includes(docType as (typeof TRAINING_STORAGE_TYPES)[number])
}

export function trainingDocTypesForQuery(): readonly string[] {
  return TRAINING_STORAGE_TYPES
}

export type DossierDocumentRow = {
  id?: string
  doc_type?: string
  form_data?: Record<string, unknown> | null
  file_url?: string | null
  status?: string | null
  updated_at?: string | null
}

function statusRank(status: string | null | undefined): number {
  if (status === 'validated') return 3
  if (status === 'complete') return 2
  return 1
}

export function coalesceTrainingDocumentRows(
  rows: DossierDocumentRow[] | null | undefined
): DossierDocumentRow | null {
  if (!rows?.length) return null
  let best: DossierDocumentRow | null = null
  let bestRank = 0
  let bestTs = ''
  for (const row of rows) {
    const r = statusRank(row.status)
    const ts = row.updated_at || ''
    if (!best || r > bestRank || (r === bestRank && ts > bestTs)) {
      best = row
      bestRank = r
      bestTs = ts
    }
  }
  return best
}

export function normalizeHumanOversightFormData(
  raw: Record<string, unknown> | null | undefined
): { supervisorName: string; supervisorRole: string; supervisorEmail: string } {
  if (!raw) {
    return { supervisorName: '', supervisorRole: '', supervisorEmail: '' }
  }
  const name = String(raw.supervisorName ?? raw.supervisor_name ?? '').trim()
  const role = String(raw.supervisorRole ?? raw.supervisor_role ?? '').trim()
  const email = String(raw.supervisorEmail ?? raw.supervisor_email ?? '').trim()
  return { supervisorName: name, supervisorRole: role, supervisorEmail: email }
}

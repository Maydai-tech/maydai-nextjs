/**
 * Fil rouge produit MaydAI (UX / vocabulaire) — questionnaire = déclarer, dossier = prouver,
 * todo = compléter, synthèse = suivre. Aucune logique métier.
 * Source unique pour UI React, PDF et libellés serveur d’affichage.
 */

export const DECLARATION_PROOF_FLOW_COPY = {
  filRougeTitle: 'Fil MaydAI : déclarer → documenter → agir',

  filRougeBody:
    'Le questionnaire sert à déclarer votre position. La synthèse permet de suivre la qualification AI Act et l’état du cas. Le dossier rassemble les preuves et pièces qui documentent ces déclarations. La todo conformité liste les actions à mener pour compléter la conformité opérationnelle.',

  ouiSansPreuve:
    'Un « Oui » au questionnaire est une déclaration : elle peut être exacte tout en restant à documenter dans le dossier. « À documenter » ou « information insuffisante » côté preuve indique qu’il manque encore des éléments de justification — ce n’est pas équivalent à une déclaration fausse.',

  dossierListSubtitle:
    'Par cas d’usage : joignez et complétez les preuves attendues pour documenter ce que vous avez déclaré au questionnaire.',

  dossierDetailSubtitle:
    'Dossier du cas — preuves et pièces qui documentent vos réponses au questionnaire.',

  todoPageTitle: 'Todo conformité',
  todoPageSubtitle:
    'Actions par cas : la todo enchaîne après la déclaration — ouvrez le dossier depuis chaque action pour apporter les preuves attendues.',

  synthesisV3ShortCtaLead:
    'Pré-diagnostic rapide (même moteur AI Act que le long, sans bloc maturité E5), puis parcours complet pour documenter, scorer en profondeur et produire le rapport.',

  /** Carte cas sur le dashboard — V3 non terminé */
  globalDashboardV3IncompleteHint:
    'V3 · Cas à compléter : la synthèse vous oriente vers un pré-diagnostic rapide ou le parcours complet.',

  /** Arrivée synthèse depuis le dashboard (V3 brouillon) */
  synthesisV3DashboardEntryBanner:
    'Vous arrivez du tableau de bord : la zone ci-dessous vous aide à choisir le pré-diagnostic rapide (qualification express) ou le parcours complet (analyse, E5, rapport), selon votre besoin.',

  /** Liste dossiers — rappel questionnaire vs preuves */
  globalDossierListEvalHint:
    'Cette vue regroupe les preuves par cas. Pour qualifier ou mettre à jour le questionnaire (parcours court ou long), ouvrez le cas depuis le registre puis sa synthèse.',

  /** Détail dossier — V3 non terminé : lier preuves et questionnaire */
  globalDossierDetailV3OrientationTitle: 'Questionnaire (V3) et dossier',
  globalDossierDetailV3OrientationLead:
    'Ici vous déposez les pièces attendues. Le questionnaire (pré-diagnostic court ou parcours complet) se poursuit depuis le cas d’usage.',
  globalDossierDetailV3CtaLong: 'Parcours complet',
  globalDossierDetailV3CtaShort: 'Pré-diagnostic rapide',

  /** Todo — au moins un cas V3 ouvert */
  globalTodoV3OrientationBanner:
    'Au moins un cas V3 n’est pas terminé : la todo suit surtout les actions après déclaration. Pour cadrer ou enrichir le questionnaire, ouvrez la synthèse du cas concerné puis l’évaluation.',

  /** Synthèse (cas V3 non terminé) — distinction court / long / preuves */
  synthesisV3DualPathTitle: 'Pré-diagnostic court ou parcours complet — même questionnaire',
  /** Synthèse — cas V3 déjà complété : réouverture évaluation sans changer de questionnaire */
  synthesisV3DualPathTitleReeval:
    'Pré-diagnostic court ou parcours complet — réévaluation (même questionnaire)',
  synthesisV3DualPathLead:
    'Le court donne une première qualification utile tout de suite. Le long reprend vos réponses et ajoute le bloc maturité E5, un score plus détaillé, le rapport structuré et la todo ; le dossier du cas sert à joindre les preuves.',
  /** Bandeau synthèse quand le cas est déjà complété : les parcours restent accessibles */
  synthesisV3CompletedReevalBanner:
    'Ce cas est déjà complété : vous pouvez tout de même rouvrir l’évaluation pour un nouveau pré-diagnostic court ou pour affiner sur le parcours complet. Vos réponses restent sur le même questionnaire.',

  /** Synthèse — cas complété et pré-diagnostic court déjà passé au moins une fois */
  synthesisV3ShortPathDoneCompletedHint:
    'Un pré-diagnostic court a déjà été enregistré sur ce cas : vous pouvez affiner sur le parcours complet ou relancer un court depuis les boutons ci-dessous.',

  /** Sortie parcours court — passage vers le long */
  shortPathOutcomeHeroTitle: 'Prochain pas recommandé : parcours complet',
  shortPathOutcomeHeroLead:
    'Vous avez déjà une lecture AI Act exploitable. En poursuivant, vous restez sur le même questionnaire : vos réponses sont conservées. La suite apporte le bloc maturité E5, un score plus fin, le rapport d’audit structuré et la todo ; le dossier accueille les pièces au fil de l’eau.',
  shortPathOutcomeHeroBulletMaturity:
    'Gouvernance / maturité (E5) : posé dans le long seulement.',
  shortPathOutcomeHeroBulletProof:
    'Preuves : préciser les réponses et rattacher les pièces dans le dossier du cas.',
  shortPathOutcomeHeroBulletPlan:
    'Plan : todo conformité et rapport complet une fois le cas terminé.',
  shortPathOutcomeHeroCtaLabel: 'Continuer le questionnaire — parcours complet',
  shortPathOutcomeQuickLinksHint:
    'En parallèle du questionnaire : ouvrez le dossier pour les pièces et la todo pour suivre les actions.',

  /** Intro parcours court — CTA long visible */
  shortPathIntroLongPrimaryCta: 'Ouvrir le parcours complet',
  shortPathIntroLongPrimaryHint:
    'Même questionnaire : E5, score détaillé, rapport structuré et todo une fois le cas complété.',
  shortPathIntroBackToSynthesis: 'Retour à la synthèse du cas',

  /** Fiche cas (header) — reprise après court */
  headerV3ResumeEvaluationHint:
    'Après un pré-diagnostic court, reprenez ici le parcours complet : vos réponses sont conservées.',

  /** Fiche cas (header) — cas complété V3 : court / long toujours proposés */
  headerV3CompletedResumeHint:
    'Cas complété : rouvrez l’évaluation pour affiner sur le parcours complet ou relancer un pré-diagnostic court — le même questionnaire conserve vos réponses.',

  rapportPlanHint:
    'Chaque action renvoie vers la todo et le dossier pour transformer la déclaration en preuve documentée.',

  /** Pastilles rapport / plan (complément au statut technique côté données) */
  evidenceShortComplete: 'Documenté',
  evidenceShortValidated: 'Preuve validée',
  evidenceShortIncomplete: 'À documenter',
  evidenceShortNotTracked: 'Non suivi',
  evidenceShortNa: 'N/A',

  declarativeYes: 'Déclaré · Oui',
  declarativeNo: 'Déclaré · Non',
  declarativeOut: 'Déclaration · hors périmètre',
  declarativeInsufficient: 'Déclaration · à préciser',

  /** Libellé PDF / export quand le statut de déclaration slot n’est pas encore calculé */
  declarativePdfNull: 'Déclaration · —',

  todoActionHint:
    'Ouvrir le dossier depuis cette action permet d’apporter les preuves attendues ; la todo garde la trace de ce qu’il reste à documenter après vos déclarations au questionnaire.',

  /** Malus récupérable — vocabulaire aligné todo / rapport (pas de forfait catalogue) */
  todoPointsToRecoverTitle: 'Points à récupérer',
  todoPointsRecoveredTitle: 'Points récupérés',
  todoValidatedBadge: 'Validé',
  /** PDF — ligne sous l’action lorsqu’il reste des points liés au questionnaire */
  reportPdfPointsToRecoverPrefix: 'Points à récupérer',
  /** PDF — action documentée sans créneau de récupération de score côté questionnaire */
  reportPdfValidatedNoPointsLine:
    'Validé : preuve documentée ; aucun point à récupérer sur cette action selon le questionnaire.',

  linkLabelDossierCase: 'Dossier du cas (preuves)',
  linkLabelTodo: 'Todo conformité',

  /** Cas limites interdits : libellés liste dossiers */
  unacceptableStoppingProofDone: 'Preuve d’arrêt documentée',
  unacceptableStoppingProofTodo: 'Preuve d’arrêt à documenter',
} as const

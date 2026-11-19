/**
 * Dictionnaire déterministe des narratifs AI Act (constat + action recommandée).
 * Remplace progressivement le texte LLM figé (`usecase_next_steps`) pour les slots
 * pilotés par le rôle utilisateur et l'état de complétion des preuves dossier.
 *
 * Indexation : docType → rôle AI Act → isCompleted (true = preuve OUI / complétée).
 */

import type { AiActRole } from '@/lib/ai-act-role-resolver'

/** Types doc du périmètre narratif déterministe (phase 1). */
export type AiActNarrativeDocType =
  | 'training_plan'
  | 'transparency_marking'
  | 'human_oversight'
  | 'system_prompt'
  | 'technical_documentation'

export interface AiActNarrativeEntry {
  constat: string
  action_recommandee: string
}

type NarrativeByCompletion = Record<'true' | 'false', AiActNarrativeEntry>

type NarrativeByRole = Record<AiActRole, NarrativeByCompletion>

export type AiActNarrativeDictionary = Record<AiActNarrativeDocType, NarrativeByRole>

/**
 * Source de vérité produit — narratifs déterministes par docType, rôle et état de preuve.
 * `true` = preuve complétée ; `false` = lacune à combler.
 */
export const AI_ACT_NARRATIVE_DICT: Record<
  AiActNarrativeDocType,
  Record<
    AiActRole,
    Record<'true' | 'false', { constat: string; action_recommandee: string }>
  >
> = {
  training_plan: {
    fournisseur: {
      true: {
        constat:
          'Vous avez déclaré que votre personnel a reçu une formation adéquate (littératie IA, Art. 4) pour comprendre les risques et utiliser le système de manière responsable.',
        action_recommandee:
          "Recensez dans l'outil les formations techniques et réglementaires suivies (participants, dates, contenus, attestations) afin de documenter cette conformité.",
      },
      false: {
        constat:
          "Votre personnel n'a pas reçu de formation adéquate sur les exigences de l'AI Act et les risques liés à ce système d'IA.",
        action_recommandee:
          'Élaborez et déployez un plan de formation technique et réglementaire couvrant la littératie IA (Art. 4), puis documentez-le dans le dossier du cas.',
      },
    },
    deployeur: {
      true: {
        constat:
          "Vous avez déclaré que votre personnel a reçu une formation adéquate pour une utilisation responsable du système d'IA dans votre activité.",
        action_recommandee:
          "Recensez dans l'outil les formations à l'utilisation responsable (supervision, limites du système, signalement des incidents) et joignez les justificatifs.",
      },
      false: {
        constat:
          "Votre personnel n'a pas reçu de formation adéquate pour utiliser ce système d'IA de manière conforme et responsable.",
        action_recommandee:
          'Élaborez un plan de formation adapté à vos utilisateurs finaux (bonnes pratiques, risques, contrôle humain) et documentez sa mise en œuvre.',
      },
    },
    integrateur: {
      true: {
        constat:
          'Vous avez déclaré que les équipes impliquées dans la modification substantielle ont été formées aux nouvelles responsabilités découlant de la bascule fournisseur (Art. 25).',
        action_recommandee:
          'Recensez les formations spécifiques aux obligations assumées après modification substantielle (documentation, gestion des risques, surveillance) et joignez les preuves.',
      },
      false: {
        constat:
          "Vos équipes n'ont pas reçu de formation sur les obligations réglementaires liées à votre nouveau statut de fournisseur après modification substantielle (Art. 25).",
        action_recommandee:
          'Élaborez et déployez un plan de formation couvrant les responsabilités du fournisseur (Art. 4, documentation, gestion des risques) et documentez-le dans le dossier.',
      },
    },
  },
  transparency_marking: {
    fournisseur: {
      true: {
        constat:
          "OUI : Votre système est conçu pour respecter les obligations de transparence. Selon l'AI Act, il informe clairement les personnes physiques qu'elles interagissent avec une machine et intègre un marquage technique permettant de détecter l'origine artificielle des contenus générés. (Réf : Art. 50 AI Act)",
        action_recommandee:
          "Décrivez et documentez dans l'outil les solutions techniques intégrées à votre modèle (ex : watermarking, métadonnées cryptographiques) ainsi que les avertissements d'interaction prévus dans votre interface utilisateur.",
      },
      false: {
        constat:
          "NON : Votre système présente des lacunes de transparence. L'AI Act exige d'informer clairement les personnes physiques de leur interaction avec l'IA et impose aux systèmes génératifs de marquer techniquement leurs sorties (format lisible par machine) pour prévenir tout risque de tromperie. (Réf : Art. 50 AI Act)",
        action_recommandee:
          "Intégrez techniquement une solution de marquage lisible par machine dans les sorties de votre modèle (images, textes, audios) et concevez l'interface pour signaler l'interaction. Documentez ces implémentations dans MaydAI.",
      },
    },
    deployeur: {
      true: {
        constat:
          "OUI : Votre système est conçu pour respecter les obligations de transparence. Selon l'AI Act, il informe clairement les personnes physiques qu'elles interagissent avec une machine et intègre un marquage technique permettant de détecter l'origine artificielle des contenus générés. (Réf : Art. 50 AI Act)",
        action_recommandee:
          "Conservez dans l'outil la preuve des mentions visibles que vous appliquez aux contenus diffusés (ex: \"Généré par IA\" pour les deepfakes/textes publics) et des bandeaux d'information adressés à vos utilisateurs finaux.",
      },
      false: {
        constat:
          "NON : Votre système présente des lacunes de transparence. L'AI Act exige d'informer clairement les personnes physiques de leur interaction avec l'IA et impose aux systèmes génératifs de marquer techniquement leurs sorties (format lisible par machine) pour prévenir tout risque de tromperie. (Réf : Art. 50 AI Act)",
        action_recommandee:
          "Mettez immédiatement en place un affichage informant vos utilisateurs finaux qu'ils interagissent avec une IA, et ajoutez une mention visible et claire sur vos publications de synthèse (hypertrucages). Documentez cela sur MaydAI.",
      },
    },
    integrateur: {
      true: {
        constat:
          "OUI : Votre système est conçu pour respecter les obligations de transparence. Selon l'AI Act, il informe clairement les personnes physiques qu'elles interagissent avec une machine et intègre un marquage technique permettant de détecter l'origine artificielle des contenus générés. (Réf : Art. 50 AI Act)",
        action_recommandee:
          "Documentez les mesures de transparence dont vous héritez du modèle tiers et celles que vous avez ajoutées à votre interface en marque blanche pour assumer votre responsabilité de Fournisseur.",
      },
      false: {
        constat:
          "NON : Votre système présente des lacunes de transparence. L'AI Act exige d'informer clairement les personnes physiques de leur interaction avec l'IA et impose aux systèmes génératifs de marquer techniquement leurs sorties (format lisible par machine) pour prévenir tout risque de tromperie. (Réf : Art. 50 AI Act)",
        action_recommandee:
          "Mettez en conformité votre interface client (bandeau d'information) et vérifiez que le modèle tiers utilisé inclut bien un marquage technique lisible par machine, obligation technique qui vous incombe désormais (Art. 25).",
      },
    },
  },
  human_oversight: {
    fournisseur: {
      true: {
        constat:
          "OUI : Votre système d'IA intègre une étape de contrôle humain effectif. L'AI Act exige que les systèmes soient supervisés par des personnes physiques dotées des compétences et de l'autorité nécessaires pour prévenir les risques, ignorer une décision ou interrompre la machine en cas de besoin. (Réf : Art. 14 et 26 AI Act)",
        action_recommandee:
          "Documentez dans l'outil les mesures techniques de conception (ex: interface de supervision, bouton d'arrêt sécurisé) intégrées à votre système qui permettent aux futurs utilisateurs d'exercer ce contrôle.",
      },
      false: {
        constat:
          "NON : Votre système ne dispose pas d'un contrôle humain effectif clair. L'AI Act impose que l'IA soit conçue et supervisée par une personne physique dotée de l'autorité et des moyens techniques pour intervenir, ignorer ses résultats ou l'interrompre à tout moment. (Réf : Art. 14 et 26 AI Act)",
        action_recommandee:
          "Intégrez dès la conception de votre système des interfaces et mesures techniques (ex: bouton d'arrêt) permettant à l'humain de garder la main sur l'IA. Documentez ces capacités dans la fiche système MaydAI.",
      },
    },
    deployeur: {
      true: {
        constat:
          "OUI : Votre système d'IA intègre une étape de contrôle humain effectif. L'AI Act exige que les systèmes soient supervisés par des personnes physiques dotées des compétences et de l'autorité nécessaires pour prévenir les risques, ignorer une décision ou interrompre la machine en cas de besoin. (Réf : Art. 14 et 26 AI Act)",
        action_recommandee:
          "Identifiez et renseignez dans l'outil l'identité et le rôle de la (des) personne(s) chargée(s) de la supervision (human-in-the-loop). Assurez-vous qu'elles disposent du soutien et de l'autorité pour corriger l'IA.",
      },
      false: {
        constat:
          "NON : Votre système ne dispose pas d'un contrôle humain effectif clair. L'AI Act impose que l'IA soit conçue et supervisée par une personne physique dotée de l'autorité et des moyens techniques pour intervenir, ignorer ses résultats ou l'interrompre à tout moment. (Réf : Art. 14 et 26 AI Act)",
        action_recommandee:
          "Désignez formellement une personne physique dotée des compétences et de l'autorité requises pour superviser l'IA, pouvoir l'interrompre ou ignorer ses décisions. Enregistrez son profil dans MaydAI.",
      },
    },
    integrateur: {
      true: {
        constat:
          "OUI : Votre système d'IA intègre une étape de contrôle humain effectif. L'AI Act exige que les systèmes soient supervisés par des personnes physiques dotées des compétences et de l'autorité nécessaires pour prévenir les risques, ignorer une décision ou interrompre la machine en cas de besoin. (Réf : Art. 14 et 26 AI Act)",
        action_recommandee:
          "Documentez dans l'outil que le système de base sur lequel vous apposez votre marque possède bien les interfaces techniques nécessaires pour garantir la supervision humaine par vos clients finaux.",
      },
      false: {
        constat:
          "NON : Votre système ne dispose pas d'un contrôle humain effectif clair. L'AI Act impose que l'IA soit conçue et supervisée par une personne physique dotée de l'autorité et des moyens techniques pour intervenir, ignorer ses résultats ou l'interrompre à tout moment. (Réf : Art. 14 et 26 AI Act)",
        action_recommandee:
          "Assurez-vous que l'outil tiers que vous intégrez dispose des interfaces de supervision, ou développez-les dans votre surcouche pour garantir à vos utilisateurs finaux le maintien du contrôle humain.",
      },
    },
  },
  system_prompt: {
    fournisseur: {
      true: {
        constat:
          "OUI : Vous avez intégré des mesures techniques d'atténuation des risques (ex : garde-fous, instructions système/prompts) dès la conception. Selon l'AI Act, encadrer techniquement le comportement de l'IA est essentiel pour garantir sa robustesse et prévenir toute mauvaise utilisation raisonnablement prévisible. (Réf : Art. 9 et 15 AI Act)",
        action_recommandee:
          'Documentez rigoureusement les instructions système et les filtres de sécurité intégrés au modèle (prévention des injections, toxicité) dans la fiche système MaydAI pour garantir leur reproductibilité lors d\'un audit.',
      },
      false: {
        constat:
          "NON : Aucune mesure technique d'atténuation des risques (ex : instructions système, garde-fous) n'a été mise en place. L'AI Act impose d'éliminer ou réduire les risques techniques dès la conception et de prévenir les mauvaises utilisations prévisibles pour garantir la sécurité et la robustesse de l'IA. (Réf : Art. 9 et 15 AI Act)",
        action_recommandee:
          "Définissez et intégrez techniquement des garde-fous (prompts sécurisés, filtres d'entrées/sorties) pour bloquer les comportements indésirables du modèle. Enregistrez ces mesures d'atténuation dans MaydAI.",
      },
    },
    deployeur: {
      true: {
        constat:
          "OUI : Vous avez intégré des mesures techniques d'atténuation des risques (ex : garde-fous, instructions système/prompts) dès la conception. Selon l'AI Act, encadrer techniquement le comportement de l'IA est essentiel pour garantir sa robustesse et prévenir toute mauvaise utilisation raisonnablement prévisible. (Réf : Art. 9 et 15 AI Act)",
        action_recommandee:
          'Conservez dans MaydAI la trace des system prompts et des consignes configurées dans votre interface pour limiter les usages abusifs ou hors-sujet de la part de vos utilisateurs finaux.',
      },
      false: {
        constat:
          "NON : Aucune mesure technique d'atténuation des risques (ex : instructions système, garde-fous) n'a été mise en place. L'AI Act impose d'éliminer ou réduire les risques techniques dès la conception et de prévenir les mauvaises utilisations prévisibles pour garantir la sécurité et la robustesse de l'IA. (Réf : Art. 9 et 15 AI Act)",
        action_recommandee:
          "Paramétrez des instructions système strictes (ex: limitations des sujets abordables par votre chatbot) pour encadrer l'usage de l'outil tiers par vos employés ou clients. Documentez ces règles de comportement dans MaydAI.",
      },
    },
    integrateur: {
      true: {
        constat:
          "OUI : Vous avez intégré des mesures techniques d'atténuation des risques (ex : garde-fous, instructions système/prompts) dès la conception. Selon l'AI Act, encadrer techniquement le comportement de l'IA est essentiel pour garantir sa robustesse et prévenir toute mauvaise utilisation raisonnablement prévisible. (Réf : Art. 9 et 15 AI Act)",
        action_recommandee:
          "Documentez les instructions système et les filtres ajoutés dans votre surcouche applicative pour sécuriser le modèle de base, afin de justifier votre conformité technique de Fournisseur (Art. 25).",
      },
      false: {
        constat:
          "NON : Aucune mesure technique d'atténuation des risques (ex : instructions système, garde-fous) n'a été mise en place. L'AI Act impose d'éliminer ou réduire les risques techniques dès la conception et de prévenir les mauvaises utilisations prévisibles pour garantir la sécurité et la robustesse de l'IA. (Réf : Art. 9 et 15 AI Act)",
        action_recommandee:
          "Développez et intégrez une surcouche de sécurité (prompts stricts, filtres) pour encadrer et sécuriser le modèle tiers que vous commercialisez. Tracez ces implémentations dans MaydAI.",
      },
    },
  },
  technical_documentation: {
    fournisseur: {
      true: {
        constat:
          "OUI : Vous avez établi (ou recueilli) une documentation technique complète pour votre système d'IA. L'AI Act exige cette documentation pour démontrer la conformité du système, assurer sa transparence et permettre son évaluation. Elle doit être tenue à jour tout au long du cycle de vie de l'IA. (Réf : Art. 11 et Annexe IV)",
        action_recommandee:
          "Centralisez et mettez à jour votre documentation technique (architecture, choix de conception, données d'entraînement) directement dans la fiche système de MaydAI pour être prêt en cas d'audit de conformité.",
      },
      false: {
        constat:
          "NON : Votre système d'IA ne dispose pas d'une documentation technique complète. L'AI Act impose strictement d'établir et de tenir à jour cette documentation (architecture, données, limites) avant toute mise sur le marché ou mise en service, afin de pouvoir prouver la conformité du système. (Réf : Art. 11 et Annexe IV)",
        action_recommandee:
          "Rédigez la documentation technique de votre IA : décrivez le modèle utilisé, l'architecture générale, les capacités et surtout les limites connues (hallucinations, biais). Stockez ces documents dans MaydAI.",
      },
    },
    deployeur: {
      true: {
        constat:
          "OUI : Vous avez établi (ou recueilli) une documentation technique complète pour votre système d'IA. L'AI Act exige cette documentation pour démontrer la conformité du système, assurer sa transparence et permettre son évaluation. Elle doit être tenue à jour tout au long du cycle de vie de l'IA. (Réf : Art. 11 et Annexe IV)",
        action_recommandee:
          "Centralisez et mettez à jour votre documentation technique (architecture, choix de conception, données d'entraînement) directement dans la fiche système de MaydAI pour être prêt en cas d'audit de conformité.",
      },
      false: {
        constat:
          "NON : Votre système d'IA ne dispose pas d'une documentation technique complète. L'AI Act impose strictement d'établir et de tenir à jour cette documentation (architecture, données, limites) avant toute mise sur le marché ou mise en service, afin de pouvoir prouver la conformité du système. (Réf : Art. 11 et Annexe IV)",
        action_recommandee:
          "Rédigez la documentation technique de votre IA : décrivez le modèle utilisé, l'architecture générale, les capacités et surtout les limites connues (hallucinations, biais). Stockez ces documents dans MaydAI.",
      },
    },
    integrateur: {
      true: {
        constat:
          "OUI : Vous avez établi (ou recueilli) une documentation technique complète pour votre système d'IA. L'AI Act exige cette documentation pour démontrer la conformité du système, assurer sa transparence et permettre son évaluation. Elle doit être tenue à jour tout au long du cycle de vie de l'IA. (Réf : Art. 11 et Annexe IV)",
        action_recommandee:
          "Centralisez et mettez à jour votre documentation technique (architecture, choix de conception, données d'entraînement) directement dans la fiche système de MaydAI pour être prêt en cas d'audit de conformité.",
      },
      false: {
        constat:
          "NON : Votre système d'IA ne dispose pas d'une documentation technique complète. L'AI Act impose strictement d'établir et de tenir à jour cette documentation (architecture, données, limites) avant toute mise sur le marché ou mise en service, afin de pouvoir prouver la conformité du système. (Réf : Art. 11 et Annexe IV)",
        action_recommandee:
          "Rédigez la documentation technique de votre IA : décrivez le modèle utilisé, l'architecture générale, les capacités et surtout les limites connues (hallucinations, biais). Stockez ces documents dans MaydAI.",
      },
    },
  },
}

/** Clé booléenne interne du dictionnaire (`true` / `false`). */
function completionKey(isCompleted: boolean): 'true' | 'false' {
  return isCompleted ? 'true' : 'false'
}

/**
 * Résout une entrée narrative pour un triplet (docType, rôle, complétion).
 * Retourne `null` si le docType n'est pas encore couvert par le dictionnaire.
 */
export function getAiActNarrativeEntry(
  docType: string,
  role: AiActRole,
  isCompleted: boolean
): AiActNarrativeEntry | null {
  const block = AI_ACT_NARRATIVE_DICT[docType as AiActNarrativeDocType]
  if (!block) return null
  return block[role][completionKey(isCompleted)]
}

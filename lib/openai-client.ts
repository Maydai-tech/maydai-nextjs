import OpenAI from 'openai'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildStandardizedPrompt } from './formatting-template'
import type { RiskLevelCode } from '@/lib/risk-level'
import type { SlotStatusMap } from '@/lib/slot-statuses'
import type { QuestionnaireParcoursMeta } from '@/lib/openai-data-transformer'

/**
 * Structure des données d'entrée pour l'analyse OpenAI (ancien format)
 * Contient les informations du cas d'usage et les réponses au questionnaire de conformité
 */
interface OpenAIAnalysisInput {
  usecase_id: string
  usecase_name: string
  company_name: string
  company_industry?: string
  company_city?: string
  company_country?: string
  checklist_gouvernance_entreprise?: string
  checklist_gouvernance_cas_usage?: string
  responses: {
    // Domaines d'utilisation à risque élevé
    E4_N7_Q2: {
      question: string
      selected_options: string[]
      selected_labels: string[]
    }
  }
}

/**
 * Structure des données d'entrée complètes pour l'analyse OpenAI (nouveau format)
 * Contient toutes les informations du questionnaire et du contexte
 */
interface OpenAIAnalysisInputComplete {
  questionnaire_questions: Record<string, any>
  usecase_context_fields: {
    entreprise: {
      name: string
      industry: string
      city: string
      country: string
      company_status: string
    }
    cas_usage: {
      id: string
      name: string
      description: string
      deployment_date: string
      status: string
      risk_level: string
      /** null si qualification réglementaire impossible (V3) — jamais un palier fictif */
      risk_level_code: RiskLevelCode | null
      risk_level_label_fr: string
      ai_category: string
      system_type: string
      responsible_service: string
      deployment_countries: string[]
      /** V3 : qualified | impossible */
      classification_status?: string | null
      checklist_gouvernance_entreprise: string
      checklist_gouvernance_cas_usage: string
    }
    technologie: {
      technology_partner: string
      llm_model_version: string
      primary_model_id: string
      model_name: string
      model_provider: string
      model_type: string
    }
    repondant: {
      profile: string
      situation: string
    }
    scores: {
      score_base: number
      score_model: number | null
      score_final: number | null
      is_eliminated: boolean
      elimination_reason: string
    }
  }
  risk_categories: Record<string, string>
  priority_levels: Record<string, string>
  status_levels: Record<string, string>
  slot_statuses?: SlotStatusMap
  questionnaire_parcours?: QuestionnaireParcoursMeta
  /** Bloc d’ancrage structuré (Lot A) — prioritaire sur la description libre */
  report_grounding_block?: string
}

const SYSTEM_INSTRUCTIONS_PATH = join(
  process.cwd(),
  'docs',
  'openai-assistant-system-instructions.md'
)
const OPENAI_MODEL = 'gpt-4o-mini'
const OPENAI_VECTOR_STORE_ID = 'vs_68b1b8fb9b608191982f946b23282bb3'

function loadReportSystemInstructions(): string {
  const document = readFileSync(SYSTEM_INSTRUCTIONS_PATH, 'utf8')
  const separator = '\n---\n'
  const separatorIndex = document.indexOf(separator)

  if (separatorIndex === -1) {
    throw new Error(
      `Séparateur des instructions OpenAI introuvable dans ${SYSTEM_INSTRUCTIONS_PATH}`
    )
  }

  const instructions = document.slice(separatorIndex + separator.length).trim()

  if (!instructions) {
    throw new Error('Les instructions système OpenAI sont vides')
  }

  return instructions
}

/**
 * Client pour interagir avec l'API OpenAI Responses
 * Gère la génération d'analyses de conformité IA Act
 */
export class OpenAIClient {
  private client: OpenAI
  private model: string
  private vectorStoreId: string
  private systemInstructions: string

  /**
   * Initialise le client OpenAI avec les clés d'API nécessaires
   * Vérifie que toutes les variables d'environnement requises sont présentes
   */
  constructor() {
    this.validateEnvironmentVariables()
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    })
    this.model = OPENAI_MODEL
    this.vectorStoreId = OPENAI_VECTOR_STORE_ID
    this.systemInstructions = loadReportSystemInstructions()
  }

  /**
   * Vérifie que les variables d'environnement nécessaires sont définies
   * Lance une erreur explicite si une variable est manquante
   */
  private validateEnvironmentVariables(): void {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Clé API OpenAI manquante. Vérifiez OPENAI_API_KEY dans votre fichier .env')
    }
  }

  /**
   * Point d'entrée principal pour générer une analyse de conformité (ancien format)
   * @param data - Données du cas d'usage et réponses au questionnaire
   * @returns Promise<string> - Rapport d'analyse généré via Responses API
   */
  async generateComplianceAnalysis(data: OpenAIAnalysisInput): Promise<string> {
    console.log('🚀 Génération d\'analyse de conformité avec Responses API pour:', data.usecase_name)
    return await this.executeResponsesWorkflow(this.buildAnalysisPrompt(data))
  }

  /**
   * Point d'entrée principal pour générer une analyse de conformité (nouveau format complet)
   * @param data - Données complètes du cas d'usage et réponses au questionnaire
   * @returns Promise<string> - Rapport d'analyse généré via Responses API
   */
  async generateComplianceAnalysisComplete(data: OpenAIAnalysisInputComplete): Promise<string> {
    console.log('🚀 Génération d\'analyse de conformité complète avec Responses API pour:', data.usecase_context_fields.cas_usage.name)
    return await this.executeResponsesWorkflow(this.buildCompleteAnalysisPrompt(data))
  }

  /**
   * Génère un rapport sans conversation persistante via Responses API.
   * File Search conserve l'accès aux mêmes sources que l'ancien Assistant.
   * @param prompt - Prompt métier complet à envoyer au modèle
   * @returns Promise<string> - Résultat de l'analyse
   */
  private async executeResponsesWorkflow(prompt: string): Promise<string> {
    try {
      const response = await this.client.responses.create({
        model: this.model,
        instructions: this.systemInstructions,
        input: prompt,
        store: false,
        tools: [{
          type: 'file_search',
          vector_store_ids: [this.vectorStoreId]
        }]
      })

      if (!response.output_text.trim()) {
        throw new Error('Aucune réponse textuelle trouvée dans la réponse OpenAI')
      }

      console.log('✅ Réponse OpenAI reçue via Responses API')
      return response.output_text
    } catch (error) {
      console.error('❌ Erreur dans le workflow Responses API:', error)
      throw new Error(`Erreur avec Responses API: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Construit le prompt d'analyse pour Responses API
   * Utilise la structure de formatage standardisée
   * @param data - Données du cas d'usage et réponses au questionnaire
   * @returns string - Prompt formaté prêt à être envoyé à l'assistant
   */
  private buildAnalysisPrompt(data: OpenAIAnalysisInput): string {
    const highRiskDomains = data.responses.E4_N7_Q2.selected_labels || []
    const domainsSection = this.buildHighRiskDomainsSection(data.responses.E4_N7_Q2, highRiskDomains)
    const govLines = [data.checklist_gouvernance_entreprise, data.checklist_gouvernance_cas_usage].filter(
      (line): line is string => typeof line === 'string' && line.trim().length > 0
    )
    const questionnaireData = [domainsSection, ...govLines].join('\n\n')

    // Utiliser le template standardisé
    return buildStandardizedPrompt(
      data.company_name,
      data.usecase_name,
      data.usecase_id,
      data.company_industry,
      data.company_city,
      data.company_country,
      questionnaireData
    )
  }

  /**
   * Construit la section des domaines à risque élevé du prompt
   * @param questionData - Données de la question E4_N7_Q2
   * @param domains - Liste des domaines sélectionnés
   * @returns string - Section formatée
   */
  private buildHighRiskDomainsSection(questionData: any, domains: string[]): string {
    const domainsText = domains.length > 0 
      ? domains.map(domain => `- ${domain}`).join('\n')
      : 'Aucun domaine à risque élevé identifié'

    return `**E4.N7.Q2 - Domaines d'utilisation (Risque élevé) :**
Question : ${questionData.question}
Domaines sélectionnés :
${domainsText}`
  }

  /**
   * Construit le prompt d'analyse complet pour le nouveau format (PHASE 1 — faits, questionnaire, règles métier, schéma JSON).
   * La formulation des champs texte est supposée être guidée par les instructions système de l'assistant.
   * @param data - Données complètes du cas d'usage et réponses au questionnaire
   * @returns string - Prompt formaté prêt à être envoyé à l'assistant
   */
  private buildCompleteAnalysisPrompt(data: OpenAIAnalysisInputComplete): string {
    const { usecase_context_fields, questionnaire_questions } = data
    const { entreprise, cas_usage, technologie, repondant, scores } = usecase_context_fields
    const scoreFinal = scores.score_final
    const isClassificationImpossible = cas_usage.classification_status === 'impossible'
    const isUnacceptable =
      !isClassificationImpossible && cas_usage.risk_level_code === 'unacceptable'

    const factsBlock = `DONNÉES CONTEXTUELLES (ne pas extrapoler hors de ce bloc ni du questionnaire)

Entreprise: ${entreprise.name} | Secteur: ${entreprise.industry} | ${entreprise.city}, ${entreprise.country} | Rôle chaîne de valeur: ${entreprise.company_status}

Système d'IA: ${cas_usage.name} (id: ${cas_usage.id})
Description (contexte narratif secondaire — ne pas en déduire de motif juridique ni de niveau si non confirmé par le questionnaire structuré ci-dessous) : ${cas_usage.description}
Déploiement: ${cas_usage.deployment_date} | Statut cas: ${cas_usage.status}
Pays: ${cas_usage.deployment_countries.join(', ')} | Service: ${cas_usage.responsible_service}
Catégorie / type: ${cas_usage.ai_category} | ${cas_usage.system_type}
${cas_usage.checklist_gouvernance_entreprise}
${cas_usage.checklist_gouvernance_cas_usage}
${isClassificationImpossible ? `Qualification réglementaire (application) : IMPOSSIBLE — ne pas conclure un palier AI Act définitif (minimal, limité, élevé, interdit) à partir du questionnaire ou du score seul.` : ''}

Technologie: ${technologie.technology_partner} | LLM: ${technologie.llm_model_version} | Modèle: ${technologie.model_name} (${technologie.model_provider}, ${technologie.model_type})

Répondant: ${repondant.profile} | ${repondant.situation}

Scores (indicatifs, ne fixent pas le niveau): base ${scores.score_base} | modèle ${scores.score_model ?? 'N/A'} | final ${scoreFinal ?? 'N/A'}
Éliminé: ${scores.is_eliminated ? 'oui' : 'non'} | Motif: ${scores.elimination_reason || 'N/A'}`

    const parcoursMetaBlock = data.questionnaire_parcours
      ? `
PARCOURS QUESTIONNAIRE — MÉTADONNÉES SERVEUR (AUTORITATIVES)
${JSON.stringify(data.questionnaire_parcours)}
Règles :
- questionnaire_version, bpgv_variant, ors_exit, active_question_codes : ne pas les contredire.
- Toute question du JSON « questionnaire_questions » avec hors_parcours_questionnaire_v2 = true n'a PAS été posée dans ce parcours : ne pas inférer de réponse utilisateur, ne pas traiter comme un oubli.
- Un code absent de active_question_codes n'a pas été posé volontairement (parcours V2) : idem.
${data.questionnaire_parcours.ors_exit === 'unacceptable' ? `- Sortie ORS « unacceptable » : le bloc N8 (questions E4.N8.* du fil long) n'a pas été parcouru ; ne pas inventer de réponses ni de constats issus de N8.` : ''}`
      : ''

    const structuredGroundingBlock =
      data.report_grounding_block && data.report_grounding_block.trim().length > 0
        ? `
ANCRAGE STRUCTURÉ — FAITS COCHÉS (AUTORITATIF, PRIORITAIRE SUR LA DESCRIPTION LIBRE ET LES SCORES)
${data.report_grounding_block.trim()}

Règles Lot A (grounding) :
- Ce bloc est produit mécaniquement par l'application : il prime sur le champ Description du cas, sur les scores et sur toute généralisation sectorielle.
- introduction_contextuelle : ne pas y introduire de motif d'interdiction ou de risque limité absent du questionnaire ni de ce bloc.
- evaluation_risque.justification : appliquer les « INSTRUCTIONS » figurant en fin de bloc ; première phrase stable selon ces instructions ; développement ensuite uniquement avec des faits listés dans ce bloc ou dans « QUESTIONNAIRE — RÉPONSES DÉCLARÉES ».
- Cas inacceptable : interdit_1 doit refléter exclusivement les motifs E4.N7.Q3 / E4.N7.Q3.1 listés dans le bloc « Motifs d'interdiction cochés » lorsqu'ils sont présents ; sinon s'appuyer sur les seules réponses déclarées utiles sans inventer une finalité Art. 5.
- Cas inacceptable (suite) : introduction_contextuelle, conclusion, impact_attendu et tout le corps narratif hors interdit_2 / interdit_3 ne doivent mentionner aucune pratique prohibée à l'article 5 si elle n'apparaît pas dans la liste « Motifs d'interdiction » du bloc d'ancrage ; ne pas enrichir par un « motif parasite » (ex. biométrie ou autre interdit) alors que seuls d'autres libellés sont listés.
- Cas Risque minimal avec texte d'intérêt public + contrôle éditorial humain déclaré (voir lignes T1 / T1E du bloc) : introduction_contextuelle et justification doivent expliquer le parcours (questions texte posées pour le volet transparence), le public informé, la validation éditoriale humaine, et pourquoi cela évite le scénario Risque limité lié à l'absence de ce contrôle — pas seulement une phrase générique sur un risque faible.
- Cas deepfake (E4.N8.Q11.M1 = Oui) : utiliser les termes média réaliste / pris pour authentique / deepfake ou hypertrucage ; éviter un discours vague sur « transparence » ou « contenus synthétiques » sans ce lien.
- Recommandations 9 slots : adapter le vocabulaire (utilisateur final, B2C, diffusion publique) aux réponses E4.N8.Q9 et E4.N8.Q11.* — pas de scénario grand public si le questionnaire indique absence d'interaction directe ou usage interne ; en Risque limité, suivre les sous-instructions « Recommandations (9 slots) » du bloc pour deepfake et interaction directe lorsqu'elles figurent.`
        : ''

    const questionnaireSection = this.buildQuestionnaireSectionForPhase1(questionnaire_questions)

    const highRiskJustificationRules =
      !isClassificationImpossible && cas_usage.risk_level_code === 'high'
        ? `
- evaluation_risque.justification (obligatoire si niveau = Risque élevé) :
  - Rappeler explicitement que le niveau retenu est celui fourni par l'application (« ${cas_usage.risk_level_label_fr} »), sans le contredire.
  - Citer au moins UN déclencheur de qualification réel, issu des réponses du questionnaire (privilégier E4.N7.* et la filière de qualification du haut risque, pas E5.N9.* ni E6.N10.*).
  - La justification DOIT contenir explicitement les mentions « Article 6 » et « Annexe III » du règlement (UE) 2024/1689 et expliquer le lien entre ce déclencheur et cette qualification (point ou logique d'Annexe III), sans se limiter à une généralité sur un domaine, un secteur ou l'emploi. Si le questionnaire établit clairement une qualification par Annexe I sans cas d'Annexe III, remplacer l'exigence « Annexe III » par « Annexe I » tout en conservant « Article 6 ».
  - Interdit comme fondement principal : formulations vagues du type « domaine à risque », simple évocation de l'emploi ou du secteur sans ce rattachement juridique, le seul traitement de données personnelles sans lien explicite à un cas d'Annexe III, l'absence de surveillance humaine, l'absence de mesures d'atténuation, l'absence de documentation seule, ou toute question E5.N9.* / E6.N10.* (réservées aux 9 slots d'action).`
        : ''

    const authoritativeRiskBlock = isClassificationImpossible
      ? `
QUALIFICATION — ÉTAT IMPOSSIBLE (AUTORITATIF — APPLICATION)
- L'application enregistre classification_status = impossible : des pivots juridiques non tranchés (ex. réponses « Je ne sais pas ») empêchent une conclusion de niveau AI Act fiable.
- INTERDICTION absolue : ne pas attribuer, suggérer ou laisser entendre un niveau définitif du barème « Risque minimal », « Risque limité », « Risque élevé », « Interdit » / « Risque inacceptable ».
- evaluation_risque.niveau : chaîne EXACTE et SEULE autorisée : "${cas_usage.risk_level_label_fr}" — c'est l'état métier « non conclu », pas un palier du règlement (UE) 2024/1689.
- evaluation_risque.justification : expliquer uniquement l'impossibilité de conclure ; ne pas inférer un palier depuis le score final, depuis des réponses partielles ni depuis une analogie sectorielle.
- Ne pas utiliser le score ni E5.N9.* / E6.N10.* pour « deviner » un niveau de risque réglementaire.
- Score final ${scoreFinal ?? 'N/A'}/100 et réponses questionnaire : contexte uniquement ; ils ne valident pas une qualification lorsque l'état est impossible.
- introduction_contextuelle, impact_attendu, conclusion : ne pas y affirmer un palier AI Act acquis ; formuler en termes d'incertitude réglementaire, d'informations à confirmer ou de points juridiques à clarifier avant toute conclusion.`
      : `
NIVEAU DE RISQUE (AUTORITATIF — APPLICATION)
- Niveau fourni par l'application : ne pas le recalculer ni le modifier.
- evaluation_risque.niveau = chaîne exacte : "${cas_usage.risk_level_label_fr}"
- evaluation_risque.justification : reprendre le niveau autoritatif ; s'appuyer sur les faits de qualification du risque déclarés dans le questionnaire (déclencheurs), pas sur la maturité de conformité opérationnelle ; ne pas inférer un autre niveau à partir de cette justification.
- Ne pas utiliser E5.N9.* ni E6.N10.* pour déduire ou justifier le niveau de risque (slots d'action uniquement).
- Ne pas inventer des faits de qualification absents du questionnaire.
- Score final ${scoreFinal ?? 'N/A'}/100 : informatif seul, pas substitut aux faits de qualification.${highRiskJustificationRules}`

    const unacceptableV2N8Rule =
      data.questionnaire_parcours?.ors_exit === 'unacceptable'
        ? `
- Parcours V2 — sortie ORS « unacceptable » : le bloc N8 (questions E4.N8.*) n’a pas été parcouru ; ne pas citer de réponses ni de constats issus de N8 ; ne pas présenter interdit_3 comme fondé sur des faits déclarés en N8.`
        : ''

    const statuses = data.slot_statuses
    const slotMappingBlock = (!isUnacceptable && statuses)
      ? `
STATUTS DES 9 SLOTS (AUTORITATIFS — calculés par l'application, NE PAS MODIFIER)
Chaque slot DOIT :
1) commencer par le préfixe exact indiqué ci-dessous, suivi de " : " (espace-deux-points-espace) ;
2) contenir au moins 2 phrases d'explication contextualisée (hors préfixe et hors la partie Références) ;
3) se terminer obligatoirement dans la MÊME chaîne par une phrase commençant exactement : Références : (puis références AI Act ou principes pertinentes, alignées sur le thème du slot).
Préfixes possibles : OUI, NON, Information insuffisante (uniquement ces trois préfixes en sortie ; ne jamais écrire « Hors périmètre » ni mentionner parcours V2/court/long ou « question non posée »).
Ne pas changer le préfixe. Ne pas ajouter de nuance sur le statut. Ne pas contredire le statut dans le texte.

RÈGLE ABSOLUE DE RÉDACTION : TU N'AS PLUS LE DROIT DE CALCULER LES STATUTS. LE SERVEUR L'A DÉJÀ FAIT POUR TOI.
POUR CHAQUE SLOT CI-DESSOUS, TU DOIS IMPÉRATIVEMENT UTILISER EXACTEMENT LE STATUT FOURNI PAR LE SERVEUR CI-DESSOUS (OUI, NON, OU INFORMATION INSUFFISANTE) COMME PRÉFIXE EN GRAS DE TON PARAGRAPHE.
MÊME SI LE QUESTIONNAIRE TE SEMBLE INCOMPLET, MÊME SI TES INSTRUCTIONS SYSTÈME EXIGENT PLUS DE DÉTAILS (COMME UN NOM OU UNE DATE), TU IGNORES TES INSTRUCTIONS SYSTÈME ET TU APPLIQUES AVEUGLÉMENT LE STATUT DU SERVEUR. LE BACKEND EST LA SEULE SOURCE DE VÉRITÉ POUR LE STATUT.

quick_win_1 → ${statuses.quick_win_1}
quick_win_2 → ${statuses.quick_win_2}
quick_win_3 → ${statuses.quick_win_3}
priorite_1 → ${statuses.priorite_1}
priorite_2 → ${statuses.priorite_2}
priorite_3 → ${statuses.priorite_3}
action_1 → ${statuses.action_1}
action_2 → ${statuses.action_2}
action_3 → ${statuses.action_3}

Contexte des slots :
- quick_win_1 : registre centralisé IA (E5.N9.Q7)
- quick_win_2 : surveillance humaine (E5.N9.Q8)
- quick_win_3 : instructions système / prompts (E5.N9.Q3)
- priorite_1 : documentation technique (E5.N9.Q4)
- priorite_2 : information utilisateurs + marquage contenu (E6.N10.Q1 + Q2)
- priorite_3 : qualité des données / procédures (E5.N9.Q6)
- action_1 : système de gestion des risques (E5.N9.Q1)
- action_2 : exactitude, robustesse, cybersécurité (E5.N9.Q9)
- action_3 : formations AI Act (E4.N8.Q12)

Références — règle spécifique quick_win_1 (registre centralisé IA, E5.N9.Q7 uniquement) :
- Ce slot porte exclusivement sur le registre ; aucune tournure centrée sur la surveillance humaine ; interdiction stricte de citer l'article 14 dans quick_win_1 (réservé à quick_win_2).
- Références alignées sur la doctrine : traçabilité et documentation selon la qualification du système ; article 16 ou 26 du règlement (UE) 2024/1689 selon le rôle ; si aucune référence plus certaine n'est possible : Références : Information insuffisante — article ou annexe non précisé.

Pour chaque slot, rédiger un texte explicatif basé sur les réponses du questionnaire ci-dessus.

Exemple réservé à quick_win_2 uniquement (surveillance humaine — ne PAS appliquer cet exemple ni sa référence à quick_win_1 ni aux autres slots ; statut NON — ne pas copier textuellement ; respecter préfixe + 2 phrases + Références) :
"NON : Les réponses ne permettent pas d'identifier un responsable ou une fonction de surveillance humaine clairement désigné pour ce système. Il convient de formaliser ce rôle et de le documenter pour assurer une supervision effective. Références : Article 14 du règlement (UE) 2024/1689 (surveillance humaine pour les systèmes d'IA à haut risque)."`
      : (!isUnacceptable
          ? `
MAPPING DES 9 SLOTS — statuts non fournis, déduire des réponses.
Préfixe par slot : « OUI : », « NON : » ou « Information insuffisante : » uniquement.
Chaque slot : au moins 2 phrases d'explication métier puis fin obligatoire par « Références : ... » dans la même chaîne.`
          : `
CAS RISQUE INACCEPTABLE (INTERDIT)
- Ne PAS produire quick_win_1..3, priorite_1..3, action_1..3 (aucun plan d'action type cas standard).
- Produire obligatoirement interdit_1, interdit_2, interdit_3 — ce ne sont PAS trois « pratiques ou finalités interdites » homogènes et parallèles ; chaque clé a un rôle différent.

interdit_1 — MOTIF PRINCIPAL D'INTERDICTION
- Exposer le motif principal qui rend ce cas interdit, en s'appuyant STRICTEMENT sur les réponses déclarées du questionnaire, en priorité sur les codes E4.N7.Q2.1, E4.N7.Q3 et E4.N7.Q3.1 (contexte d'usage, finalités interdites, situations d'intervention).
- Ne pas inventer des motifs ou faits absents du questionnaire ; ne pas décliner artificiellement trois fois le même constat dans les trois champs.

interdit_2 — EXIGENCE DE PREUVE D'ARRÊT / TRAÇABILITÉ
- Décrire l'exigence pour l'organisation de pouvoir DÉMONTRER l'arrêt effectif ou l'absence de déploiement du système et de CONSERVER une traçabilité vérifiable (documents, preuves, attestations, éléments auditables).
- Ce n'est PAS une « deuxième interdiction » juridique au même titre que le motif principal ; c'est une exigence opérationnelle et probatoire liée à l'interdiction.

interdit_3 — EXIGENCE DE SÉCURISATION (INSTRUCTIONS SYSTÈME, PROMPTS, GARDE-FOUS)
- Décrire l'exigence de DOCUMENTER et de FIXER les instructions système, les prompts et les garde-fous encadrant le comportement du système (reproductibilité, contrôle, réduction des risques de remise en service non maîtrisée).
- Ce n'est PAS une « troisième pratique interdite » parallèle à interdit_1 ; c'est une exigence technique et d'auditabilité complémentaire au motif.

Règles transverses
- Distinction par le RÔLE : constat d'interdiction (interdit_1) vs exigences de preuve/traçabilité (interdit_2) vs exigences de sécurisation documentaire et technique (interdit_3).
- Interdiction de traiter interdit_2 et interdit_3 comme de nouvelles finalités prohibées distinctes de la même nature que le motif synthétisé en interdit_1.
- Interdiction de produire trois variantes cosmétiquement différentes d'un seul et même paragraphe ; pas de simple copier-coller entre les champs.${unacceptableV2N8Rule}
`)

    const formatBlock = isClassificationImpossible
      ? `
SORTIE JSON — QUALIFICATION RÉGLEMENTAIRE IMPOSSIBLE
- Un seul objet JSON UTF-8, parsable ; pas de markdown ni de texte hors de l'objet.
- Clés obligatoires (noms inchangés) : introduction_contextuelle, evaluation_risque { niveau, justification }, quick_win_1, quick_win_2, quick_win_3, priorite_1, priorite_2, priorite_3, action_1, action_2, action_3, impact_attendu, conclusion
- Toutes les valeurs chaîne non vides (espaces seuls interdits).
- evaluation_risque.niveau : "${cas_usage.risk_level_label_fr}" EXACTEMENT — ne pas remplacer par « Risque minimal », « Risque limité », « Risque élevé », « Interdit » ni aucune variante de palier AI Act.
- evaluation_risque.justification : doit expliciter l'impossibilité de conclure ; interdiction d'y présenter un palier du barème comme acquis.
- introduction_contextuelle, impact_attendu, conclusion : même discipline — pas de « le système est à risque minimal/limité/élevé » ni équivalent ; orienter vers clarification et collecte d'informations.
- Les 9 slots : préfixes et structure comme pour le cas standard ; ils peuvent refléter l'incertitude réglementaire sans contredire l'état impossible du niveau.
- Même règle de distinction : chaque triplet quick_win_* / priorite_* / action_* doit avoir des contenus nettement différents ; priorités numériques uniques et séquentielles si tableaux d'objets.`
      : isUnacceptable
      ? `
SORTIE JSON — CAS RISQUE INACCEPTABLE
- Un seul objet JSON UTF-8, parsable ; pas de markdown ni de texte hors de l'objet.
- Clés obligatoires (noms inchangés) : introduction_contextuelle, evaluation_risque { niveau, justification }, interdit_1, interdit_2, interdit_3, impact_attendu, conclusion
- Toutes les valeurs chaîne non vides (espaces seuls interdits).
- evaluation_risque.niveau : "${cas_usage.risk_level_label_fr}" exactement (niveau fourni par l'application, ne pas le modifier).

Champs interdit_1, interdit_2, interdit_3 : obligatoires, 2 à 4 phrases chacun, distincts par leur objet (pas trois « interdictions » équivalentes).
- introduction_contextuelle, conclusion, impact_attendu : mêmes contraintes que le bloc d'ancrage sur les motifs Art. 5 — aucune pratique prohibée supplémentaire non listée dans « Motifs d'interdiction cochés » du bloc ANCRAGE STRUCTURÉ.
- interdit_1 : motif principal d'interdiction du cas, fondé sur les réponses questionnaire pertinentes — priorité aux faits déclarés sous E4.N7.Q2.1, E4.N7.Q3 et E4.N7.Q3.1 ; ne pas extrapoler hors de ces éléments et du reste du questionnaire utile à ce motif.
- interdit_2 : exigence de preuve et de traçabilité de l'arrêt ou du non-déploiement (contrôle, audit) — ne pas présenter comme une nouvelle « pratique interdite » parallèle au motif.
- interdit_3 : exigence de sécurisation et de documentation des instructions système, prompts et garde-fous — ne pas présenter comme une troisième « pratique interdite » parallèle au motif.`
      : `
SORTIE JSON
- Un seul objet JSON UTF-8, parsable ; pas de markdown ni de texte hors de l'objet.
- Clés obligatoires (noms inchangés) : introduction_contextuelle, evaluation_risque { niveau, justification }, quick_win_1, quick_win_2, quick_win_3, priorite_1, priorite_2, priorite_3, action_1, action_2, action_3, impact_attendu, conclusion
- Toutes les valeurs chaîne non vides (espaces seuls interdits). impact_attendu et conclusion obligatoires même si plusieurs des 9 slots sont « Information insuffisante : ».
- evaluation_risque.niveau : "${cas_usage.risk_level_label_fr}" exactement ; ne pas utiliser la formulation « Risque inacceptable » dans niveau (utiliser « Interdit » si cas maximal).
- evaluation_risque.justification : respecter intégralement le bloc NIVEAU DE RISQUE ci-dessus (y compris les règles spécifiques « Risque élevé » si applicables).
- quick_win_1, quick_win_2, quick_win_3, priorite_1, priorite_2, priorite_3, action_1, action_2, action_3 : chaque valeur doit commencer par le préfixe imposé (OUI / NON / Information insuffisante uniquement), contenir au moins 2 phrases explicatives métier, et se terminer obligatoirement par « Références : ... » (y compris pour Information insuffisante).
- DISTINCTION OBLIGATOIRE DES NEUF SLOTS : à l'intérieur de chaque triplet (quick_win_* entre eux, priorite_* entre eux, action_* entre eux), chaque texte DOIT être clairement distinct des deux autres (pas de copier-coller, pas de paraphrase quasi identique). Traiter la numérotation comme une priorité métier séquentielle unique : quick_win_1 / priorite_1 / action_1 = premier axe du groupe, … puis 2, puis 3 — angles, obligations et références différents.
- Si tu utilises des tableaux JSON (quick_wins_actions_immediates, priorites_actions_reglementaires, actions_moyen_terme) avec des objets { "priority", "text" } (ou champs équivalents), chaque priorité numérique DOIT être unique et ordonnée (1, 2, 3 sans doublon) ; l'ordre des éléments doit refléter 1 puis 2 puis 3.`

    return `${factsBlock}${parcoursMetaBlock}${structuredGroundingBlock}\n\n${questionnaireSection}\n\n${authoritativeRiskBlock}\n\n${slotMappingBlock}\n\n${formatBlock}`.trim()
  }

  /**
   * Questionnaire réduit pour PHASE 1 : réponses déclarées brutes pour application des règles des slots.
   */
  private buildQuestionnaireSectionForPhase1(questionnaireQuestions: Record<string, any>): string {
    let t = 'QUESTIONNAIRE — RÉPONSES DÉCLARÉES (source des règles slots)\n\n'
    const byCat = this.groupQuestionsByCategory(questionnaireQuestions)
    for (const [, questions] of Object.entries(byCat)) {
      for (const q of questions as any[]) {
        t += `[${q.code}] ${q.question_text}\n`
        if (q.hors_parcours_questionnaire_v2) {
          t += `  (aucune réponse déclarée transmise pour cette question ; ne pas inférer de réponse utilisateur.)\n`
        } else if (q.user_response?.answered) {
          const code = String(q.code ?? '')
          const isE5E6 = code.startsWith('E5.N9') || code.startsWith('E6.N10')
          if (q.user_response.checklist_selected_option_codes?.length) {
            t += `  Options cochées (synthèse checklist): ${q.user_response.checklist_selected_option_codes.join(', ')}\n`
          }
          if (q.user_response.single_label) t += `  Choix: ${q.user_response.single_label}\n`
          if (!isE5E6 && q.user_response.conditional_label) {
            t += `  Choix: ${q.user_response.conditional_label}\n`
          }
          if (q.user_response.multiple_labels?.length) {
            t += `  Choix: ${q.user_response.multiple_labels.join('; ')}\n`
          }
          if (typeof q.user_response.checklist_affirmative_option_declared === 'boolean') {
            t += `  Statut checklist (booléen): ${q.user_response.checklist_affirmative_option_declared ? 'oui' : 'non'}\n`
          }
          const cd = !isE5E6 ? q.user_response.conditional_data : undefined
          if (cd && Object.keys(cd).length) {
            t += `  Champs: ${Object.entries(cd).map(([k, v]) => `${k}=${v}`).join('; ')}\n`
          }
        } else {
          t += `  (non répondu)\n`
        }
        t += '\n'
      }
    }
    return t.trimEnd()
  }

  /**
   * Groupe les questions par catégorie de risque
   * @param questionnaireQuestions - Toutes les questions du questionnaire
   * @returns Record<string, any[]> - Questions groupées par catégorie
   */
  private groupQuestionsByCategory(questionnaireQuestions: Record<string, any>): Record<string, any[]> {
    const categories: Record<string, any[]> = {}
    
    Object.values(questionnaireQuestions).forEach((question: any) => {
      const category = question.risk_category || 'Conformité générale'
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(question)
    })
    
    return categories
  }
}

/**
 * Instance singleton du client OpenAI
 * Prête à être utilisée dans l'application pour générer des analyses de conformité
 * Utilisation : await openAIClient.generateComplianceAnalysis(data)
 */
export const openAIClient = new OpenAIClient()

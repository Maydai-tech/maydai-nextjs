import OpenAI from 'openai'
import { buildStandardizedPrompt } from './formatting-template'
import type { RiskLevelCode } from '@/lib/risk-level'

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
  responses: {
    // Domaines d'utilisation à risque élevé
    E4_N7_Q2: {
      question: string
      selected_options: string[]
      selected_labels: string[]
    }
    // Questions sur le registre centralisé des systèmes IA
    E5_N9_Q7: {
      question: string
      selected_option: string
      selected_label: string
      conditional_data: {
        registry_type?: string
        system_name?: string
      }
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
      risk_level_code: RiskLevelCode
      risk_level_label_fr: string
      ai_category: string
      system_type: string
      responsible_service: string
      deployment_countries: string[]
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
}

/**
 * Configuration des timeouts et tentatives pour l'API OpenAI
 * Ces valeurs sont utilisées pour éviter les blocages et optimiser les performances
 */
const OPENAI_CONFIG = {
  // Nombre maximum de tentatives pour attendre la completion (2 minutes total)
  MAX_POLLING_ATTEMPTS: 120,
  
  // Délai entre chaque vérification du statut en millisecondes
  POLLING_INTERVAL_MS: 1000,
  
  // Fréquence d'affichage des logs de progression (toutes les 10 secondes)
  PROGRESS_LOG_FREQUENCY: 10,
  
  // Nombre minimum de tentatives avant d'abandonner en cas d'erreur de récupération
  MIN_RETRY_ATTEMPTS: 10
} as const

/**
 * Client pour interagir avec l'API OpenAI Assistant
 * Gère la génération d'analyses de conformité IA Act
 */
export class OpenAIClient {
  private client: OpenAI
  private assistantId: string

  /**
   * Initialise le client OpenAI avec les clés d'API nécessaires
   * Vérifie que toutes les variables d'environnement requises sont présentes
   */
  constructor() {
    this.validateEnvironmentVariables()
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    })
    this.assistantId = process.env.OPENAI_ASSISTANT_ID!
  }

  /**
   * Vérifie que les variables d'environnement nécessaires sont définies
   * Lance une erreur explicite si une variable est manquante
   */
  private validateEnvironmentVariables(): void {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Clé API OpenAI manquante. Vérifiez OPENAI_API_KEY dans votre fichier .env')
    }
    if (!process.env.OPENAI_ASSISTANT_ID) {
      throw new Error('ID Assistant OpenAI manquant. Vérifiez OPENAI_ASSISTANT_ID dans votre fichier .env')
    }
  }

  /**
   * Point d'entrée principal pour générer une analyse de conformité (ancien format)
   * @param data - Données du cas d'usage et réponses au questionnaire
   * @returns Promise<string> - Rapport d'analyse généré par l'Assistant OpenAI
   */
  async generateComplianceAnalysis(data: OpenAIAnalysisInput): Promise<string> {
    console.log('🚀 Génération d\'analyse de conformité avec Assistant OpenAI pour:', data.usecase_name)
    return await this.executeAssistantWorkflow(data)
  }

  /**
   * Point d'entrée principal pour générer une analyse de conformité (nouveau format complet)
   * @param data - Données complètes du cas d'usage et réponses au questionnaire
   * @returns Promise<string> - Rapport d'analyse généré par l'Assistant OpenAI
   */
  async generateComplianceAnalysisComplete(data: OpenAIAnalysisInputComplete): Promise<string> {
    console.log('🚀 Génération d\'analyse de conformité complète avec Assistant OpenAI pour:', data.usecase_context_fields.cas_usage.name)
    return await this.executeAssistantWorkflowComplete(data)
  }

  /**
   * Exécute le workflow complet avec l'Assistant OpenAI (ancien format)
   * Étapes : 1) Création du thread et run, 2) Polling du statut, 3) Récupération du résultat
   * @param data - Données d'entrée pour l'analyse
   * @returns Promise<string> - Résultat de l'analyse
   */
  private async executeAssistantWorkflow(data: OpenAIAnalysisInput): Promise<string> {
    try {
      // Étape 1: Préparer le prompt d'analyse
      const analysisPrompt = this.buildAnalysisPrompt(data)
      
      // Étape 2: Créer et lancer l'Assistant OpenAI
      const assistantRun = await this.createAndRunAssistant(analysisPrompt)
      
      // Étape 3: Attendre la completion du traitement
      const completedRun = await this.waitForRunCompletion(assistantRun)
      
      // Étape 4: Récupérer et nettoyer le résultat
      const analysisResult = await this.retrieveAssistantResponse(completedRun.thread_id)
      
      // Étape 5: Nettoyer les ressources (thread)
      await this.cleanupThread(completedRun.thread_id)
      
      return analysisResult
      
    } catch (error) {
      console.error('❌ Erreur dans le workflow Assistant OpenAI:', error)
      throw new Error(`Erreur avec l'Assistant OpenAI: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Exécute le workflow complet avec l'Assistant OpenAI (nouveau format complet)
   * Étapes : 1) Création du thread et run, 2) Polling du statut, 3) Récupération du résultat
   * @param data - Données complètes d'entrée pour l'analyse
   * @returns Promise<string> - Résultat de l'analyse
   */
  private async executeAssistantWorkflowComplete(data: OpenAIAnalysisInputComplete): Promise<string> {
    try {
      // Étape 1: Préparer le prompt d'analyse complet
      const analysisPrompt = this.buildCompleteAnalysisPrompt(data)
      
      // Étape 2: Créer et lancer l'Assistant OpenAI
      const assistantRun = await this.createAndRunAssistant(analysisPrompt)
      
      // Étape 3: Attendre la completion du traitement
      const completedRun = await this.waitForRunCompletion(assistantRun)
      
      // Étape 4: Récupérer et nettoyer le résultat
      const analysisResult = await this.retrieveAssistantResponse(completedRun.thread_id)
      
      // Étape 5: Nettoyer les ressources (thread)
      await this.cleanupThread(completedRun.thread_id)
      
      return analysisResult
      
    } catch (error) {
      console.error('❌ Erreur dans le workflow Assistant OpenAI complet:', error)
      throw new Error(`Erreur avec l'Assistant OpenAI: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  /**
   * Crée un thread et lance l'exécution avec l'Assistant OpenAI
   * @param prompt - Prompt d'analyse à envoyer à l'assistant
   * @returns Promise<Run> - L'objet Run créé
   */
  private async createAndRunAssistant(prompt: string) {
    console.log('🚀 Création du thread et run avec l\'Assistant OpenAI')
    
    const run = await this.client.beta.threads.createAndRun({
      assistant_id: this.assistantId,
      thread: {
        messages: [{
          role: 'user',
          content: prompt
        }]
      }
    })
    
    console.log('✅ Thread et Run créés - Thread ID:', run.thread_id, 'Run ID:', run.id)
    return run
  }

  /**
   * Attend que le run soit terminé en utilisant un système de polling
   * Vérifie régulièrement le statut jusqu'à completion ou timeout
   * @param initialRun - Le run initial créé
   * @returns Promise<Run> - Le run une fois terminé
   */
  private async waitForRunCompletion(initialRun: any) {
    console.log('⏳ Attente de la completion...')
    
    let currentRun = initialRun
    let pollingAttempts = 0
    
    // Boucle de polling : continue tant que le run n'est pas terminé
    while (this.isRunInProgress(currentRun.status) && pollingAttempts < OPENAI_CONFIG.MAX_POLLING_ATTEMPTS) {
      // Attendre avant la prochaine vérification
      await this.waitBeforeNextCheck()
      pollingAttempts++
      
      // Récupérer le statut actuel du run
      currentRun = await this.checkRunStatus(initialRun, pollingAttempts)
      
      // Vérifier si le run a échoué
      if (this.isRunFailed(currentRun.status)) {
        console.error('❌ Run terminé avec erreur:', currentRun.status, currentRun.last_error)
        throw new Error(`Le run a échoué avec le statut: ${currentRun.status}`)
      }
    }
    
    // Vérifier si on a atteint le timeout
    if (pollingAttempts >= OPENAI_CONFIG.MAX_POLLING_ATTEMPTS) {
      throw new Error(`Timeout: Le run n'a pas terminé après ${OPENAI_CONFIG.MAX_POLLING_ATTEMPTS} secondes (statut: ${currentRun.status})`)
    }
    
    if (currentRun.status !== 'completed') {
      throw new Error(`Le run a terminé avec un statut inattendu: ${currentRun.status}`)
    }
    
    console.log('✅ Run terminé avec succès')
    return currentRun
  }

  /**
   * Vérifie si le run est encore en cours de traitement
   * @param status - Statut actuel du run
   * @returns boolean - True si le run est en cours
   */
  private isRunInProgress(status: string): boolean {
    return status === 'queued' || status === 'in_progress'
  }

  /**
   * Vérifie si le run a échoué
   * @param status - Statut actuel du run
   * @returns boolean - True si le run a échoué
   */
  private isRunFailed(status: string): boolean {
    return status === 'failed' || status === 'cancelled' || status === 'expired'
  }

  /**
   * Attend un délai fixe avant la prochaine vérification
   */
  private async waitBeforeNextCheck(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, OPENAI_CONFIG.POLLING_INTERVAL_MS))
  }

  /**
   * Vérifie le statut actuel du run avec gestion d'erreur
   * @param run - Le run à vérifier
   * @param attempts - Nombre de tentatives effectuées
   * @returns Promise<Run> - Le run mis à jour
   */
  private async checkRunStatus(run: any, attempts: number) {
    try {
      const updatedRun = await this.client.beta.threads.runs.retrieve(run.id, {
        thread_id: run.thread_id
      })
      
      // Afficher le progrès périodiquement
      if (attempts % OPENAI_CONFIG.PROGRESS_LOG_FREQUENCY === 0) {
        console.log(`⏱️  Statut du run (${attempts}s): ${updatedRun.status}`)
      }
      
      return updatedRun
      
    } catch (error) {
      console.error('Erreur lors de la récupération du statut du run:', error)
      // Ne pas échouer immédiatement, donner quelques chances
      if (attempts >= OPENAI_CONFIG.MIN_RETRY_ATTEMPTS) {
        throw error
      }
      return run // Retourner le run précédent en cas d'erreur temporaire
    }
  }

  /**
   * Récupère la réponse finale de l'Assistant depuis le thread
   * @param threadId - ID du thread contenant les messages
   * @returns Promise<string> - Contenu de la réponse de l'assistant
   */
  private async retrieveAssistantResponse(threadId: string): Promise<string> {
    // Récupérer tous les messages du thread
    const messages = await this.client.beta.threads.messages.list(threadId)
    
    // Filtrer et trier pour obtenir la dernière réponse de l'assistant
    const assistantMessage = messages.data
      .filter(message => message.role === 'assistant')
      .sort((a, b) => b.created_at - a.created_at)[0]
    
    // Vérifier que nous avons bien une réponse textuelle
    if (assistantMessage && assistantMessage.content[0] && assistantMessage.content[0].type === 'text') {
      console.log('✅ Réponse Assistant OpenAI reçue')
      return assistantMessage.content[0].text.value
    } else {
      throw new Error('Aucune réponse textuelle trouvée dans la réponse de l\'assistant')
    }
  }

  /**
   * Nettoie le thread après utilisation pour économiser les ressources
   * @param threadId - ID du thread à supprimer
   */
  private async cleanupThread(threadId: string): Promise<void> {
    try {
      await this.client.beta.threads.delete(threadId)
      console.log('🧹 Thread nettoyé après succès')
    } catch (cleanupError) {
      // Ne pas faire échouer tout le processus si le nettoyage échoue
      console.warn('⚠️  Impossible de nettoyer le thread:', cleanupError)
    }
  }

  /**
   * Construit le prompt d'analyse pour l'Assistant OpenAI
   * Utilise la structure de formatage standardisée
   * @param data - Données du cas d'usage et réponses au questionnaire
   * @returns string - Prompt formaté prêt à être envoyé à l'assistant
   */
  private buildAnalysisPrompt(data: OpenAIAnalysisInput): string {
    // Extraire les données nécessaires des réponses
    const highRiskDomains = data.responses.E4_N7_Q2.selected_labels || []
    const registryInfo = data.responses.E5_N9_Q7
    
    // Construire la section des domaines à risque élevé
    const domainsSection = this.buildHighRiskDomainsSection(data.responses.E4_N7_Q2, highRiskDomains)
    
    // Construire la section du registre centralisé
    const registrySection = this.buildRegistrySection(registryInfo)
    
    // Construire les données du questionnaire
    const questionnaireData = `${domainsSection}\n\n${registrySection}`

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
   * Construit la section du registre centralisé du prompt
   * @param registryInfo - Données de la question E5_N9_Q7
   * @returns string - Section formatée
   */
  private buildRegistrySection(registryInfo: any): string {
    const conditionalDetails = Object.keys(registryInfo.conditional_data).length > 0 
      ? `Détails : ${Object.entries(registryInfo.conditional_data).map(([key, value]) => `${key}: ${value}`).join(', ')}`
      : ''

    return `**E5.N9.Q7 - Registre centralisé des systèmes IA :**
Question : ${registryInfo.question}
Réponse : ${registryInfo.selected_label}
${conditionalDetails}`
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

    const factsBlock = `DONNÉES CONTEXTUELLES (ne pas extrapoler hors de ce bloc ni du questionnaire)

Entreprise: ${entreprise.name} | Secteur: ${entreprise.industry} | ${entreprise.city}, ${entreprise.country} | Rôle chaîne de valeur: ${entreprise.company_status}

Système d'IA: ${cas_usage.name} (id: ${cas_usage.id})
Description: ${cas_usage.description}
Déploiement: ${cas_usage.deployment_date} | Statut cas: ${cas_usage.status}
Pays: ${cas_usage.deployment_countries.join(', ')} | Service: ${cas_usage.responsible_service}
Catégorie / type: ${cas_usage.ai_category} | ${cas_usage.system_type}

Technologie: ${technologie.technology_partner} | LLM: ${technologie.llm_model_version} | Modèle: ${technologie.model_name} (${technologie.model_provider}, ${technologie.model_type})

Répondant: ${repondant.profile} | ${repondant.situation}

Scores (indicatifs, ne fixent pas le niveau): base ${scores.score_base} | modèle ${scores.score_model ?? 'N/A'} | final ${scoreFinal ?? 'N/A'}
Éliminé: ${scores.is_eliminated ? 'oui' : 'non'} | Motif: ${scores.elimination_reason || 'N/A'}`

    const questionnaireSection = this.buildQuestionnaireSectionForPhase1(questionnaire_questions)

    const authoritativeRiskBlock = `
NIVEAU DE RISQUE (AUTORITATIF — APPLICATION)
- Niveau fourni par l'application : ne pas le recalculer ni le modifier.
- evaluation_risque.niveau = chaîne exacte : "${cas_usage.risk_level_label_fr}"
- evaluation_risque.justification : s'appuyer uniquement sur la qualification du risque déjà dans le questionnaire ; ne pas inférer un autre niveau à partir de cette justification.
- Ne pas utiliser E5.N9.* ni E6.N10.* pour déduire ou justifier le niveau de risque (slots d'action uniquement).
- Ne pas inventer des faits de qualification absents du questionnaire.
- Score final ${scoreFinal ?? 'N/A'}/100 : informatif seul, pas substitut aux faits de qualification.`

    const slotMappingBlock = `
MAPPING DES 9 SLOTS (règles métier — source = questionnaire ci-dessus)
Préfixe par slot parmi quick_win_* / priorite_* / action_* : « OUI : », « NON : » ou « Information insuffisante : » (espace après ':'), conformément aux critères suivants.

- quick_win_1 ← question E5.N9.Q7 (registre)
  • Réponse principale « Non » (Q7 = Non) → préfixe « NON : ».
  • Réponse principale « Oui » (Q7 = Oui) :
    – « OUI : » si au moins un des champs conditionnels suivants est renseigné et non vide : registry_type (type du registre) OU system_name (nom de l'outil / système utilisé comme registre). L'un ou l'autre suffit ; ne jamais exiger les deux.
    – « Information insuffisante : » si Q7 = Oui mais que registry_type ET system_name sont tous deux absents ou vides.
  • Réponse principale absente ou ambiguë (impossible de trancher Oui / Non) → « Information insuffisante : ».
  • system_name n'est pas le nom du cas d'usage ni le nom commercial du produit d'évaluation lorsqu'il désigne l'outil-registre.

- quick_win_2 ← E5.N9.Q8 (surveillance humaine)
  • « OUI » seulement si supervisor_name ET supervisor_role sont tous deux présents et non vides ; sinon « Information insuffisante : » (ou « NON : » si la réponse principale est clairement négative sans détails).

- quick_win_3 ← E5.N9.Q3 (prompts / atténuation)
  • Réponse clairement Oui → préfixe OUI :
  • Réponse clairement Non → préfixe NON :
  • Partiellement, Prompts dispersés, En cours, ou toute réponse non binaire → « Information insuffisante : »

- priorite_1 ← E5.N9.Q4 (documentation technique)
  • Si la réponse correspond à « Documentation en cours » ou « Documentation non formalisée » (ou équivalent) → « Information insuffisante : »

- priorite_2 ← combinaison E6.N10.Q1 et E6.N10.Q2 (information utilisateurs + marquage contenu)
  • Oui/Oui → OUI :
  • Non/Non → NON :
  • Oui/Non ou Non/Oui → NON :

- priorite_3 ← E5.N9.Q6 (qualité données / procédures)
  • OUI seulement si procedures_details est renseigné et non vide ; sinon « Information insuffisante : »

- action_1 ← E5.N9.Q1 (système de gestion des risques)
  • Réponse vague ou non binaire → « Information insuffisante : »

- action_2 ← E5.N9.Q9 (exactitude / robustesse / cybersécurité)
  • OUI seulement si security_details est renseigné et non vide ; sinon « Information insuffisante : »

- action_3 ← E4.N8.Q12 (formations AI Act)
  • Non répondu ou vide → « Information insuffisante : »`

    const formatBlock = `
SORTIE JSON
- Un seul objet JSON UTF-8, parsable ; pas de markdown ni de texte hors de l'objet.
- Clés obligatoires (noms inchangés) : introduction_contextuelle, evaluation_risque { niveau, justification }, quick_win_1, quick_win_2, quick_win_3, priorite_1, priorite_2, priorite_3, action_1, action_2, action_3, impact_attendu, conclusion
- Toutes les valeurs chaîne non vides (espaces seuls interdits). impact_attendu et conclusion obligatoires même si plusieurs des 9 slots sont « Information insuffisante : ».
- evaluation_risque.niveau : "${cas_usage.risk_level_label_fr}" exactement ; ne pas utiliser la formulation « Risque inacceptable » dans niveau (utiliser « Interdit » si cas maximal).`

    return `${factsBlock}\n\n${questionnaireSection}\n\n${authoritativeRiskBlock}\n\n${slotMappingBlock}\n\n${formatBlock}`.trim()
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
        if (q.user_response?.answered) {
          if (q.user_response.single_label) t += `  Choix: ${q.user_response.single_label}\n`
          if (q.user_response.conditional_label) t += `  Choix: ${q.user_response.conditional_label}\n`
          if (q.user_response.multiple_labels?.length) {
            t += `  Choix: ${q.user_response.multiple_labels.join('; ')}\n`
          }
          const cd = q.user_response.conditional_data
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
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
   * Construit le prompt d'analyse complet pour le nouveau format
   * @param data - Données complètes du cas d'usage et réponses au questionnaire
   * @returns string - Prompt formaté prêt à être envoyé à l'assistant
   */
  private buildCompleteAnalysisPrompt(data: OpenAIAnalysisInputComplete): string {
    const { usecase_context_fields, questionnaire_questions } = data
    const { entreprise, cas_usage, technologie, repondant, scores } = usecase_context_fields

    // Construire la section des informations de base
    const baseInfo = `**ANALYSE DE CONFORMITÉ IA ACT - SECTION 3**

**Informations de l'entreprise :**
- Nom de l'entreprise : ${entreprise.name}
- Secteur d'activité : ${entreprise.industry}
- Localisation : ${entreprise.city}, ${entreprise.country}
- Statut dans la chaîne de valeur IA : ${entreprise.company_status}

**Informations du système d'IA :**
- Nom du système : ${cas_usage.name}
- ID : ${cas_usage.id}
- Description : ${cas_usage.description}
- Date de déploiement : ${cas_usage.deployment_date}
- Statut : ${cas_usage.status}
- Niveau de risque (libellé rapport) : ${cas_usage.risk_level_label_fr}
- Catégorie d'IA : ${cas_usage.ai_category}
- Type de système : ${cas_usage.system_type}
- Service responsable : ${cas_usage.responsible_service}
- Pays de déploiement : ${cas_usage.deployment_countries.join(', ')}

**Informations technologiques :**
- Partenaire technologique : ${technologie.technology_partner}
- Version du modèle LLM : ${technologie.llm_model_version}
- Nom du modèle : ${technologie.model_name}
- Fournisseur du modèle : ${technologie.model_provider}
- Type de modèle : ${technologie.model_type}

**Profil du répondant :**
- Profil : ${repondant.profile}
- Situation : ${repondant.situation}

**Scores de conformité :**
- Score de base : ${scores.score_base}
- Score du modèle : ${scores.score_model || 'Non calculé'}
- Score final : ${scores.score_final || 'Non calculé'}
- Système éliminé : ${scores.is_eliminated ? 'Oui' : 'Non'}
- Raison d'élimination : ${scores.elimination_reason || 'N/A'}`

    // Construire la section du questionnaire
    const questionnaireSection = this.buildQuestionnaireSection(questionnaire_questions)

    const authoritativeRiskBlock = `
**NIVEAU DE RISQUE ÉTABLI PAR LE SYSTÈME (AUTORITATIF, NON NÉGOCIABLE)**

Niveau de risque calculé par l'application et fourni au modèle : **${cas_usage.risk_level_label_fr}** (code interne : \`${cas_usage.risk_level_code}\`).

Règles obligatoires :
- Tu ne dois pas modifier, augmenter ni réduire ce niveau sur la base de ton interprétation.
- Le champ JSON \`evaluation_risque.niveau\` doit reprendre **exactement** la chaîne suivante, caractère pour caractère : \`${cas_usage.risk_level_label_fr}\`
- Tu rédiges uniquement la **justification juridique** dans \`evaluation_risque.justification\`, en t'appuyant sur les réponses du questionnaire et le contexte réglementaire.
- Les 9 actions (quick_win_*, priorite_*, action_*) restent distinctes et spécifiques au cas, comme demandé ci-dessous.
`

    // Instructions de formatage JSON strict avec les 9 clés d'action
    const formattingInstructions = `
**FORMAT DE SORTIE OBLIGATOIRE — JSON STRICT**

Tu DOIS répondre UNIQUEMENT avec un objet JSON valide respectant EXACTEMENT cette structure.
Aucun texte avant ou après le JSON. Aucun bloc Markdown. Juste le JSON.

{
  "introduction_contextuelle": "<Paragraphe narratif décrivant le contexte de l'entreprise ${entreprise.name} et du système d'IA ${cas_usage.name} au regard de l'AI Act. 3 à 5 phrases.>",
  "evaluation_risque": {
    "niveau": "<Exactement une des quatre valeurs : Risque minimal | Risque limité | Risque élevé | Interdit — ici obligatoirement : ${cas_usage.risk_level_label_fr}>",
    "justification": "<Justification juridique du niveau de risque **${cas_usage.risk_level_label_fr}**. 2 à 4 phrases, sans contester ni modifier le niveau.>"
  },
  "quick_win_1": "<Action immédiate sur le REGISTRE CENTRALISÉ IA : initialiser et tenir à jour un registre des systèmes d'IA conformément à l'article 49 de l'AI Act. Texte autonome, spécifique au cas analysé. 2 à 4 phrases.>",
  "quick_win_2": "<Action immédiate sur la SURVEILLANCE HUMAINE : désigner le(s) responsable(s) de la surveillance humaine du système d'IA. Texte autonome, spécifique au cas analysé. 2 à 4 phrases.>",
  "quick_win_3": "<Action immédiate sur les INSTRUCTIONS SYSTÈME / PROMPTS : définir et documenter les instructions système, les prompts et les garde-fous du système d'IA. Texte autonome, spécifique au cas analysé. 2 à 4 phrases.>",
  "priorite_1": "<Action réglementaire sur la DOCUMENTATION TECHNIQUE : constituer ou compléter la documentation technique exigée par l'AI Act. Texte autonome, spécifique au cas analysé. 2 à 4 phrases.>",
  "priorite_2": "<Action réglementaire sur le MARQUAGE DE TRANSPARENCE : mettre en place les marquages et obligations de transparence envers les utilisateurs. Texte autonome, spécifique au cas analysé. 2 à 4 phrases.>",
  "priorite_3": "<Action réglementaire sur la QUALITÉ DES DONNÉES : évaluer et documenter la qualité, la pertinence et la gouvernance des données d'entraînement et d'exploitation. Texte autonome, spécifique au cas analysé. 2 à 4 phrases.>",
  "action_1": "<Action moyen terme sur la GESTION DES RISQUES : élaborer un plan de gestion des risques couvrant les risques identifiés et les mesures d'atténuation. Texte autonome, spécifique au cas analysé. 2 à 4 phrases.>",
  "action_2": "<Action moyen terme sur la SURVEILLANCE CONTINUE : établir un plan de surveillance continue des performances et de la conformité du système d'IA. Texte autonome, spécifique au cas analysé. 2 à 4 phrases.>",
  "action_3": "<Action moyen terme sur les FORMATIONS AI ACT : recenser et planifier les formations nécessaires pour les équipes impliquées dans le déploiement et l'utilisation du système. Texte autonome, spécifique au cas analysé. 2 à 4 phrases.>",
  "impact_attendu": "<Paragraphe décrivant l'impact attendu de la mise en œuvre de ces 9 actions sur la conformité et la performance de l'entreprise. 2 à 4 phrases.>",
  "conclusion": "<Paragraphe de conclusion résumant les priorités et les prochaines étapes. 2 à 4 phrases.>"
}

**RÈGLES ABSOLUES :**
- Réponds UNIQUEMENT en JSON valide, sans texte autour
- Chaque clé d'action (quick_win_*, priorite_*, action_*) doit contenir un texte UNIQUE et DISTINCT
- Deux actions ne doivent JAMAIS contenir le même contenu ou des paragraphes similaires
- Chaque action doit être AUTONOME : compréhensible sans lire les autres
- Adapte chaque recommandation au contexte spécifique de "${entreprise.name}" et "${cas_usage.name}"
- N'invente pas de données : base-toi sur les informations du questionnaire ci-dessus
- Utilise un ton professionnel, précis et actionnable
- Ne jamais utiliser le libellé « Risque inacceptable » dans \`evaluation_risque.niveau\` : pour le niveau le plus sévère, la valeur attendue est **Interdit**`

    return `${baseInfo}\n\n${authoritativeRiskBlock}\n\n${questionnaireSection}\n\n${formattingInstructions}`.trim()
  }

  /**
   * Construit la section du questionnaire complet
   * @param questionnaireQuestions - Toutes les questions et réponses du questionnaire
   * @returns string - Section formatée
   */
  private buildQuestionnaireSection(questionnaireQuestions: Record<string, any>): string {
    let questionnaireText = "**DONNÉES DU QUESTIONNAIRE COMPLET :**\n\n"
    
    // Grouper les questions par catégorie de risque
    const questionsByCategory = this.groupQuestionsByCategory(questionnaireQuestions)
    
    Object.entries(questionsByCategory).forEach(([category, questions]) => {
      questionnaireText += `**${category} :**\n`
      
      questions.forEach((question: any) => {
        questionnaireText += `\n**${question.code} - ${question.question_text}**\n`
        questionnaireText += `Type : ${question.type} | Statut : ${question.status} | Priorité : ${question.priority}\n`
        questionnaireText += `Interprétation : ${question.interpretation}\n`
        
        if (question.user_response && question.user_response.answered) {
          questionnaireText += `Réponse de l'utilisateur :\n`
          
          if (question.user_response.single_value) {
            questionnaireText += `- ${question.user_response.single_label}\n`
          }
          
          if (question.user_response.multiple_labels && question.user_response.multiple_labels.length > 0) {
            questionnaireText += `- ${question.user_response.multiple_labels.join(', ')}\n`
          }
          
          if (question.user_response.conditional_data && Object.keys(question.user_response.conditional_data).length > 0) {
            questionnaireText += `- Détails : ${Object.entries(question.user_response.conditional_data).map(([key, value]) => `${key}: ${value}`).join(', ')}\n`
          }
        } else {
          questionnaireText += `- Aucune réponse fournie\n`
        }
        
        if (question.quick_wins && question.quick_wins.length > 0) {
          questionnaireText += `Quick wins : ${question.quick_wins.join(', ')}\n`
        }
        
        questionnaireText += `Article concerné : ${question.article_concerne}\n`
        questionnaireText += `Impact conformité : ${question.impact_conformite}\n`
        questionnaireText += `---\n`
      })
    })
    
    return questionnaireText
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
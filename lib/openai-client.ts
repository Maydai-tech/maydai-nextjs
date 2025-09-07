import OpenAI from 'openai'

/**
 * Structure des données d'entrée pour l'analyse OpenAI
 * Contient les informations du cas d'usage et les réponses au questionnaire de conformité
 */
interface OpenAIAnalysisInput {
  usecase_id: string
  usecase_name: string
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
   * Point d'entrée principal pour générer une analyse de conformité
   * @param data - Données du cas d'usage et réponses au questionnaire
   * @returns Promise<string> - Rapport d'analyse généré par l'Assistant OpenAI
   */
  async generateComplianceAnalysis(data: OpenAIAnalysisInput): Promise<string> {
    console.log('🚀 Génération d\'analyse de conformité avec Assistant OpenAI pour:', data.usecase_name)
    return await this.executeAssistantWorkflow(data)
  }

  /**
   * Exécute le workflow complet avec l'Assistant OpenAI
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
   * Formate les données du questionnaire en prompt structuré pour l'IA
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

    return `
**ANALYSE DE CONFORMITÉ IA ACT - SECTION 3**

**Informations du cas d'usage :**
- Nom : ${data.usecase_name}
- ID : ${data.usecase_id}

**RÉPONSES AU QUESTIONNAIRE :**

${domainsSection}

${registrySection}

**INSTRUCTIONS :**
Analyse ces informations et fournis une évaluation de conformité structurée avec :
1. Évaluation des domaines à risque élevé
2. Analyse du registre centralisé
3. Recommandations d'actions prioritaires
4. Quick wins (actions rapides)
5. Actions à moyen terme

Sois précis, professionnel et actionnable dans tes recommandations.
    `.trim()
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
}

/**
 * Instance singleton du client OpenAI
 * Prête à être utilisée dans l'application pour générer des analyses de conformité
 * Utilisation : await openAIClient.generateComplianceAnalysis(data)
 */
export const openAIClient = new OpenAIClient()
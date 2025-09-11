import OpenAI from 'openai'
import { buildStandardizedPrompt } from './formatting-template'

interface OpenAIAnalysisInput {
  questionnaire_metadata: any
  usecase_context: {
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
      deployment_date?: string
      status: string
      risk_level?: string
      ai_category?: string
      system_type?: string
      responsible_service?: string
      deployment_countries?: string[]
    }
    technologie: {
      technology_partner?: string
      llm_model_version?: string
      primary_model_id?: string
      model_name?: string
      model_provider?: string
      model_type?: string
    }
    repondant: {
      profile?: string
      situation?: string
    }
    scores: {
      score_base?: number
      score_model?: number
      score_final?: number
      is_eliminated?: boolean
      elimination_reason?: string
    }
  }
  questionnaire_responses: Record<string, {
    question_text: string
    type: string
    status: string
    selected_answers: string[]
    conditional_data?: Record<string, string>
    interpretation: string
    quick_wins: string[]
    priority: number
    article_concerne: string
    risk_category: string
    impact_conformite: string
  }>
}

export class EnhancedOpenAIClient {
  private client: OpenAI
  private assistantId: string

  constructor() {
    this.validateEnvironmentVariables()
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    })
    this.assistantId = process.env.OPENAI_ASSISTANT_ID!
  }
  
  /**
   * Vérifie que les variables d'environnement nécessaires sont définies
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
   * Génère une analyse de conformité complète avec les données enrichies
   */
  async generateComplianceAnalysis(data: OpenAIAnalysisInput): Promise<string> {
    console.log('🤖 Génération analyse de conformité avec données enrichies pour:', data.usecase_context.cas_usage.name)
    return await this.executeAssistantWorkflow(data)
  }

  /**
   * Exécute le workflow complet avec l'Assistant OpenAI
   */
  private async executeAssistantWorkflow(data: OpenAIAnalysisInput): Promise<string> {
    try {
      // Étape 1: Préparer le prompt d'analyse enrichi
      const analysisPrompt = this.buildEnhancedAnalysisPrompt(data)
      
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
   */
  private async createAndRunAssistant(prompt: string) {
    try {
      // Créer un thread
      const thread = await this.client.beta.threads.create()
      
      // Ajouter le message au thread
      await this.client.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: prompt
      })
      
      // Lancer l'assistant
      const run = await this.client.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistantId
      })
      
      return { ...run, thread_id: thread.id }
    } catch (error) {
      console.error('❌ Erreur création/lancement assistant:', error)
      throw error
    }
  }

  /**
   * Attend que l'exécution de l'assistant soit terminée
   */
  private async waitForRunCompletion(run: any): Promise<any> {
    let attempts = 0
    const maxAttempts = 30 // 5 minutes max
    
    while (attempts < maxAttempts) {
      const status = await this.client.beta.threads.runs.retrieve(run.thread_id, run.id)
      
      if (status.status === 'completed') {
        return status
      } else if (status.status === 'failed' || status.status === 'cancelled') {
        throw new Error(`Assistant run ${status.status}: ${status.last_error?.message || 'Unknown error'}`)
      }
      
      // Attendre 10 secondes avant le prochain check
      await new Promise(resolve => setTimeout(resolve, 10000))
      attempts++
    }
    
    throw new Error('Timeout: Assistant run took too long to complete')
  }

  /**
   * Récupère la réponse de l'assistant
   */
  private async retrieveAssistantResponse(threadId: string): Promise<string> {
    try {
      const messages = await this.client.beta.threads.messages.list(threadId)
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant')
      
      if (!assistantMessage) {
        throw new Error('No assistant response found')
      }
      
      const content = assistantMessage.content[0]
      if (content.type === 'text') {
        return content.text.value
      } else {
        throw new Error('Unexpected response format from assistant')
      }
    } catch (error) {
      console.error('❌ Erreur récupération réponse assistant:', error)
      throw error
    }
  }

  /**
   * Nettoie le thread après utilisation
   */
  private async cleanupThread(threadId: string): Promise<void> {
    try {
      await this.client.beta.threads.delete(threadId)
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage thread:', error)
    }
  }

  /**
   * Construit le prompt d'analyse enrichi pour l'Assistant OpenAI
   * Utilise la structure de formatage standardisée
   */
  private buildEnhancedAnalysisPrompt(data: OpenAIAnalysisInput): string {
    const { usecase_context, questionnaire_responses } = data
    
    // Construire la section d'informations contextuelles
    const contextSection = this.buildContextSection(usecase_context)
    
    // Construire la section des réponses du questionnaire
    const responsesSection = this.buildResponsesSection(questionnaire_responses)
    
    // Construire la section des métadonnées
    const metadataSection = this.buildMetadataSection(data.questionnaire_metadata)
    
    // Construire les données complètes du questionnaire
    const questionnaireData = `${contextSection}\n\n${responsesSection}\n\n${metadataSection}`

    // Utiliser le template standardisé
    return buildStandardizedPrompt(
      usecase_context.entreprise.name,
      usecase_context.cas_usage.name,
      usecase_context.cas_usage.id,
      usecase_context.entreprise.industry,
      usecase_context.entreprise.city,
      usecase_context.entreprise.country,
      questionnaireData
    )
  }

  /**
   * Construit la section d'informations contextuelles
   */
  private buildContextSection(context: any): string {
    return `**INFORMATIONS CONTEXTUELLES :**

**Entreprise :**
- Nom : ${context.entreprise.name}
- Secteur : ${context.entreprise.industry}
- Localisation : ${context.entreprise.city}, ${context.entreprise.country}
- Statut dans la chaîne de valeur IA : ${context.entreprise.company_status}

**Cas d'usage :**
- Nom : ${context.cas_usage.name}
- Description : ${context.cas_usage.description}
- Statut : ${context.cas_usage.status}
- Niveau de risque : ${context.cas_usage.risk_level || 'Non calculé'}
- Catégorie d'IA : ${context.cas_usage.ai_category || 'Non spécifiée'}
- Type de système : ${context.cas_usage.system_type || 'Non spécifié'}
- Service responsable : ${context.cas_usage.responsible_service || 'Non spécifié'}
- Pays de déploiement : ${context.cas_usage.deployment_countries?.join(', ') || 'Non spécifiés'}

**Technologie :**
- Partenaire technologique : ${context.technologie.technology_partner || 'Non spécifié'}
- Modèle utilisé : ${context.technologie.model_name || 'Non spécifié'}
- Fournisseur du modèle : ${context.technologie.model_provider || 'Non spécifié'}
- Type de modèle : ${context.technologie.model_type || 'Non spécifié'}

**Scores de conformité :**
- Score de base : ${context.scores.score_base || 'Non calculé'}
- Score final : ${context.scores.score_final || 'Non calculé'}
- Système éliminé : ${context.scores.is_eliminated ? 'Oui' : 'Non'}
${context.scores.elimination_reason ? `- Raison d'élimination : ${context.scores.elimination_reason}` : ''}`
  }

  /**
   * Construit la section des réponses du questionnaire
   */
  private buildResponsesSection(responses: Record<string, any>): string {
    const responseSections = Object.entries(responses).map(([questionCode, response]) => {
      const answersText = response.selected_answers.length > 0 
        ? response.selected_answers.map((answer: string) => `- ${answer}`).join('\n')
        : 'Aucune réponse'
      
      const conditionalText = response.conditional_data && Object.keys(response.conditional_data).length > 0
        ? `\nDétails supplémentaires :\n${Object.entries(response.conditional_data).map(([key, value]) => `- ${key}: ${value}`).join('\n')}`
        : ''

      return `**${questionCode} - ${response.question_text}**
Type : ${response.type} | Statut : ${response.status} | Priorité : ${response.priority}
Catégorie de risque : ${response.risk_category}
Article concerné : ${response.article_concerne}

Réponses sélectionnées :
${answersText}${conditionalText}

Interprétation : ${response.interpretation}
Impact sur la conformité : ${response.impact_conformite}

Quick wins recommandés :
${response.quick_wins.map((win: string) => `- ${win}`).join('\n')}`
    })

    return `**RÉPONSES AU QUESTIONNAIRE :**

${responseSections.join('\n\n')}`
  }

  /**
   * Construit la section des métadonnées
   */
  private buildMetadataSection(metadata: any): string {
    return `**MÉTADONNÉES DE RÉFÉRENCE :**

**Catégories de risque :**
${Object.entries(metadata.risk_categories).map(([key, value]) => `- ${key} : ${value}`).join('\n')}

**Niveaux de priorité :**
${Object.entries(metadata.priority_levels).map(([key, value]) => `- ${key} : ${value}`).join('\n')}

**Niveaux de statut :**
${Object.entries(metadata.status_levels).map(([key, value]) => `- ${key} : ${value}`).join('\n')}`
  }
}

/**
 * Instance singleton du client OpenAI enrichi
 */
export const enhancedOpenAIClient = new EnhancedOpenAIClient()

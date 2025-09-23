interface MistralMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface MistralResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export class MistralAIService {
  private apiKey: string
  private agentId: string
  private apiUrl: string

  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY || ''
    this.agentId = 'ag:91e23ddf:20250707:resume-cas-usage-ia:9c55ed1d'
    this.apiUrl = 'https://api.mistral.ai/v1'
  }

  async generateDescription(formData: any): Promise<string> {
    // FORCER l'utilisation de l'agent - pas de fallback
    if (!this.agentId) {
      throw new Error('Agent Mistral non configuré. Vérifiez MISTRAL_ID_API')
    }
    
    if (!this.apiKey) {
      throw new Error('Clé API Mistral manquante. Vérifiez MISTRAL_API_KEY')
    }

    console.log('🚀 Utilisation de l\'agent Mistral:', this.agentId)
    return await this.useAgent(formData)
  }

  private async useAgent(formData: any): Promise<string> {
    try {
      const prompt = this.buildPrompt(formData)
      
      console.log('📡 Appel de l\'agent Mistral via /agents/completions avec agent_id:', this.agentId)
      
      // Utiliser l'endpoint spécifique pour les agents Mistral
      const response = await fetch(`${this.apiUrl}/agents/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: this.agentId,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erreur API Agent Mistral:', response.status, errorText)
        console.error('URL appelée:', `${this.apiUrl}/agents/completions`)
        console.error('Agent ID utilisé:', this.agentId)
        throw new Error(`Erreur API Agent Mistral: ${response.status} - ${errorText}`)
      }

      const data: MistralResponse = await response.json()
      console.log('✅ Réponse de l\'agent Mistral reçue')
      return data.choices[0]?.message?.content || 'Erreur lors de la génération avec l\'agent'
    } catch (error) {
      console.error('❌ Erreur Agent Mistral:', error)
      throw new Error(`Erreur avec l'agent Mistral: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  private buildPrompt(formData: any): string {
    return `


**Informations de l'entreprise :**
- Nom de l'entreprise : ${formData.company_name || 'Non spécifié'}
- Secteur d'activité : ${formData.company_industry || 'Non spécifié'}
- Localisation : ${formData.company_city || 'Non spécifié'}, ${formData.company_country || 'Non spécifié'}

**Informations du cas d'usage :**
- Nom du cas d'usage : ${formData.name || 'Non spécifié'}
- Catégorie d'IA : ${formData.ai_category || 'Non spécifiée'}
- Type de système : ${formData.system_type || 'Non spécifié'}
- Pays de déploiement : ${formData.deployment_countries || 'Non spécifiés'}
- Partenaire technologique : ${formData.technology_partner || 'Non spécifié'}
- Modèle LLM : ${formData.llm_model_version || 'Non spécifié'}
- Service responsable : ${formData.responsible_service || 'Non spécifié'}
- Date de déploiement : ${formData.deployment_date || 'Non spécifiée'}


    `.trim()
  }
}

export const mistralAI = new MistralAIService()

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

interface OpenAIAnalysisInput {
  usecase_id: string
  usecase_name: string
  responses: {
    E4_N7_Q2: {
      question: string
      selected_options: string[]
      selected_labels: string[]
    }
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

export class OpenAIClient {
  private apiKey: string
  private apiUrl: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    this.apiUrl = 'https://api.openai.com/v1'
  }

  async generateComplianceAnalysis(data: OpenAIAnalysisInput): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Clé API OpenAI manquante. Vérifiez OPENAI_API_KEY')
    }

    console.log('🚀 Génération d\'analyse de conformité avec OpenAI pour:', data.usecase_name)
    return await this.callOpenAI(data)
  }

  private async callOpenAI(data: OpenAIAnalysisInput): Promise<string> {
    try {
      const prompt = this.buildAnalysisPrompt(data)
      
      console.log('📡 Appel de l\'API OpenAI')
      
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erreur API OpenAI:', response.status, errorText)
        throw new Error(`Erreur API OpenAI: ${response.status} - ${errorText}`)
      }

      const openaiResponse: OpenAIResponse = await response.json()
      console.log('✅ Réponse OpenAI reçue')
      return openaiResponse.choices[0]?.message?.content || 'Erreur lors de la génération de l\'analyse'
    } catch (error) {
      console.error('❌ Erreur OpenAI:', error)
      throw new Error(`Erreur avec OpenAI: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  private buildAnalysisPrompt(data: OpenAIAnalysisInput): string {
    const highRiskDomains = data.responses.E4_N7_Q2.selected_labels || []
    const registryInfo = data.responses.E5_N9_Q7

    return `
**ANALYSE DE CONFORMITÉ IA ACT - SECTION 3**

**Informations du cas d'usage :**
- Nom : ${data.usecase_name}
- ID : ${data.usecase_id}

**RÉPONSES AU QUESTIONNAIRE :**

**E4.N7.Q2 - Domaines d'utilisation (Risque élevé) :**
Question : ${data.responses.E4_N7_Q2.question}
Domaines sélectionnés :
${highRiskDomains.length > 0 ? highRiskDomains.map(domain => `- ${domain}`).join('\n') : 'Aucun domaine à risque élevé identifié'}

**E5.N9.Q7 - Registre centralisé des systèmes IA :**
Question : ${data.responses.E5_N9_Q7.question}
Réponse : ${registryInfo.selected_label}
${Object.keys(registryInfo.conditional_data).length > 0 ? 
  `Détails : ${Object.entries(registryInfo.conditional_data).map(([key, value]) => `${key}: ${value}`).join(', ')}` : 
  ''}

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
}

export const openAIClient = new OpenAIClient()
import { completeMistralAgent, getDescriptionAgentId } from '@/lib/mistral/agents'

export interface MistralDescriptionFormData {
  company_name?: string | null
  company_industry?: string | null
  company_city?: string | null
  company_country?: string | null
  name?: string | null
  ai_category?: string | null
  system_type?: string | null
  deployment_countries?: string | string[] | null
  technology_partner?: string | null
  llm_model_version?: string | null
  responsible_service?: string | null
  deployment_date?: string | null
}

function formatDeploymentCountries(countries?: string | string[] | null): string {
  if (!countries) return 'Non spécifiés'
  if (Array.isArray(countries)) {
    const cleaned = countries.map((c) => (c || '').trim()).filter(Boolean)
    return cleaned.length > 0 ? cleaned.join(', ') : 'Non spécifiés'
  }
  const trimmed = countries.trim()
  return trimmed || 'Non spécifiés'
}

export class MistralAIService {
  async generateDescription(formData: MistralDescriptionFormData): Promise<string> {
    const agentId = getDescriptionAgentId()
    if (!agentId) {
      throw new Error('Agent Mistral non configuré. Vérifiez MISTRAL_DESCRIPTION_AGENT_ID')
    }

    const prompt = this.buildPrompt(formData)

    try {
      return await completeMistralAgent(
        [
          {
            role: 'user',
            content: prompt,
          },
        ],
        { agentId }
      )
    } catch (error) {
      console.error('[MistralAIService]', error)
      throw new Error(
        `Erreur avec l'agent Mistral: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      )
    }
  }

  private buildPrompt(formData: MistralDescriptionFormData): string {
    return `
**Informations de l'entreprise :**
- Nom de l'entreprise : ${formData?.company_name || 'Non spécifié'}
- Secteur d'activité : ${formData?.company_industry || 'Non spécifié'}
- Localisation : ${formData?.company_city || 'Non spécifié'}, ${formData?.company_country || 'Non spécifié'}

**Informations du cas d'usage :**
- Nom du cas d'usage : ${formData?.name || 'Non spécifié'}
- Catégorie d'IA : ${formData?.ai_category || 'Non spécifiée'}
- Type de système : ${formData?.system_type || 'Non spécifié'}
- Pays de déploiement : ${formatDeploymentCountries(formData?.deployment_countries)}
- Partenaire technologique : ${formData?.technology_partner || 'Non spécifié'}
- Modèle LLM : ${formData?.llm_model_version || 'Non spécifié'}
- Service responsable : ${formData?.responsible_service || 'Non spécifié'}
- Date de déploiement : ${formData?.deployment_date || 'Non spécifiée'}
    `.trim()
  }
}

export const mistralAI = new MistralAIService()

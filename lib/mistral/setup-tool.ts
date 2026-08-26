import { DEPLOYMENT_PHASE_KEYS, type DeploymentPhaseKey } from '@/lib/deployment-phase'
import {
  getAiCategoryOptions,
  getResponsibleServiceOptions,
  getSystemTypeOptions,
} from '@/app/(saas)/usecases/new/lib/referentials'
import { z } from 'zod'

export const SAVE_USECASE_SETUP_TOOL_NAME = 'save_usecase_setup' as const

/**
 * Slot-filling Setup (Partie 1) — 9 champs collectés par l’agent interviewer.
 * L’API complète l’insert avec company_id, status draft et questionnaire_version 3.
 */
export interface UseCaseSetupInsert {
  name: string
  description: string
  deployment_phase: DeploymentPhaseKey
  responsible_service: string
  ai_category: string
  system_type: string
  deployment_countries: string[]
  technology_partner: string
  llm_model_version: string
  /** Date de mise en service (JJ/MM/AAAA ou YYYY-MM-DD), optionnelle. */
  deployment_date?: string | null
}

export type SetupChatMessageResponse = {
  type: 'MESSAGE'
  content: string
}

export type SetupChatToolCallResponse = {
  type: 'TOOL_CALL'
  tool: typeof SAVE_USECASE_SETUP_TOOL_NAME
  setupComplete: true
  usecase_id: string
  data: UseCaseSetupInsert
}

export type SetupChatApiResponse = SetupChatMessageResponse | SetupChatToolCallResponse

export function getUseCaseSetupEnums() {
  return {
    deployment_phase: [...DEPLOYMENT_PHASE_KEYS],
    responsible_service: getResponsibleServiceOptions(),
    ai_category: getAiCategoryOptions().map((option) => option.label),
    system_type: getSystemTypeOptions().map((option) => option.label),
  }
}

export function buildSaveUsecaseSetupTool() {
  const enums = getUseCaseSetupEnums()

  return {
    type: 'function' as const,
    function: {
      name: SAVE_USECASE_SETUP_TOOL_NAME,
      description:
        'Enregistre les 9 informations de setup du cas d’usage une fois toutes collectées et confirmées avec l’utilisateur. Ne pas appeler tant qu’un champ requis manque.',
      strict: true,
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name',
          'description',
          'deployment_phase',
          'responsible_service',
          'ai_category',
          'system_type',
          'deployment_countries',
          'technology_partner',
          'llm_model_version',
        ],
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Nom du système / cas d’usage IA (max 50 caractères).',
          },
          description: {
            type: 'string',
            minLength: 1,
            description: 'Brève description du système IA.',
          },
          deployment_phase: {
            type: 'string',
            enum: enums.deployment_phase,
            description: 'Phase de déploiement technique.',
          },
          responsible_service: {
            type: 'string',
            enum: enums.responsible_service,
            description: 'Service métier en charge du cas d’usage.',
          },
          ai_category: {
            type: 'string',
            enum: enums.ai_category,
            description: 'Catégorie d’IA du cas d’usage.',
          },
          system_type: {
            type: 'string',
            enum: enums.system_type,
            description: 'Système autonome ou Produit (Annexe I).',
          },
          deployment_countries: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', minLength: 1 },
            description: 'Pays de déploiement, noms en français (ex. France).',
          },
          technology_partner: {
            type: 'string',
            minLength: 1,
            description: 'Partenaire technologique (fournisseur connu ou saisie libre).',
          },
          llm_model_version: {
            type: 'string',
            minLength: 1,
            description: 'Modèle et version du LLM (catalogue ou saisie libre).',
          },
          deployment_date: {
            type: 'string',
            description:
              'Date de mise en service si l’utilisateur l’a indiquée (JJ/MM/AAAA ou YYYY-MM-DD). Omettre si inconnue.',
          },
        },
      },
    },
  }
}

export function useCaseSetupInsertSchema() {
  const enums = getUseCaseSetupEnums()
  const responsible = enums.responsible_service as [string, ...string[]]
  const aiCategory = enums.ai_category as [string, ...string[]]
  const systemType = enums.system_type as [string, ...string[]]

  return z.object({
    name: z.string().trim().min(1).max(50),
    description: z.string().trim().min(1),
    deployment_phase: z.enum(DEPLOYMENT_PHASE_KEYS),
    responsible_service: z.enum(responsible),
    ai_category: z.enum(aiCategory),
    system_type: z.enum(systemType),
    deployment_countries: z.array(z.string().trim().min(1)).min(1),
    technology_partner: z.string().trim().min(1),
    llm_model_version: z.string().trim().min(1),
    deployment_date: z.string().trim().optional(),
  })
}

export function parseToolCallArguments(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (raw && typeof raw === 'object') return raw
  return null
}

export function parseUseCaseSetupInsert(raw: unknown): UseCaseSetupInsert | null {
  const parsed = useCaseSetupInsertSchema().safeParse(raw)
  return parsed.success ? parsed.data : null
}

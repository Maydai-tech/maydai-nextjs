import { z } from 'zod'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { formatCompanySector } from '@/lib/constants/industries'
import { PERSONA_QUESTION_ID } from '@/lib/mistral/evaluation-tool'
import { logger } from '@/lib/secure-logger'

export type EvaluationProjectContext = {
  usecaseId: string
  name: string
  description: string
  ai_category: string | null
  system_type: string | null
  company_id: string
  industry: string | null
  sub_category_id: string | null
  industryLabel: string
}

export type LoadEvaluationContextResult =
  | { ok: true; context: EvaluationProjectContext }
  | { ok: false; status: number; error: string; code?: string }

export function parseUsecaseId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const parsed = z.string().uuid().safeParse(raw.trim())
  return parsed.success ? parsed.data : null
}

export { PERSONA_QUESTION_ID }

export const EVALUATION_TONE_LEGAL =
  "CONSIGNE DE TON : L'utilisateur est un expert juridique (DPO/Avocat). Utilise le jargon juridique exact de l'AI Act et du RGPD. Cite les numéros d'articles précis. Sois exhaustif sur les risques."

export const EVALUATION_TONE_BUSINESS =
  "CONSIGNE DE TON : L'utilisateur est un profil métier. Vulgarise au maximum ton discours. Ne cite AUCUN article de loi. Utilise des mots simples, des analogies concrètes, et va droit au but."

export const EVALUATION_TONE_DEFAULT =
  'CONSIGNE DE TON : Utilise un langage clair, professionnel, et pédagogique.'

const LEGAL_PERSONA_CODES = new Set(['E4.N7.Q1.2.C', 'E4.N7.Q1.2.D'])
const BUSINESS_PERSONA_CODES = new Set(['E4.N7.Q1.2.A', 'E4.N7.Q1.2.B', 'E4.N7.Q1.2.E'])

export function personaCodeFromAnswers(
  answers?: Record<string, unknown> | null
): string | null {
  const value = answers?.[PERSONA_QUESTION_ID]
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim()
  }
  return null
}

export function buildEvaluationToneInstruction(
  answers?: Record<string, unknown> | null
): string {
  const code = personaCodeFromAnswers(answers)
  if (code && LEGAL_PERSONA_CODES.has(code)) return EVALUATION_TONE_LEGAL
  if (code && BUSINESS_PERSONA_CODES.has(code)) return EVALUATION_TONE_BUSINESS
  return EVALUATION_TONE_DEFAULT
}

export function buildEvaluationContextSystemMessage(
  context: EvaluationProjectContext,
  answers?: Record<string, unknown> | null
): string {
  return `CONTEXTE PROJET : L'entreprise opère dans le secteur ${context.industryLabel}. Le projet s'appelle ${context.name} et consiste en ${context.description}.\n\n${buildEvaluationToneInstruction(answers)}`
}

function asNestedCompany(raw: unknown): { industry?: unknown; sub_category_id?: unknown } | null {
  if (!raw || typeof raw !== 'object') return null
  if (Array.isArray(raw)) {
    const first = raw[0]
    return first && typeof first === 'object'
      ? (first as { industry?: unknown; sub_category_id?: unknown })
      : null
  }
  return raw as { industry?: unknown; sub_category_id?: unknown }
}

/**
 * Charge le cas d’usage + secteur entreprise, après contrôle d’accès `user_companies`.
 */
export async function loadEvaluationContext(
  supabase: SupabaseClient,
  user: User,
  usecaseId: string
): Promise<LoadEvaluationContextResult> {
  const { data: usecase, error: usecaseError } = await supabase
    .from('usecases')
    .select(
      'id, name, description, ai_category, system_type, company_id, companies(industry, sub_category_id)'
    )
    .eq('id', usecaseId)
    .maybeSingle()

  if (usecaseError) {
    logger.error('loadEvaluationContext: lecture usecases', undefined, {
      details: usecaseError.message,
    })
    return {
      ok: false,
      status: 500,
      error: 'Erreur lors du chargement du cas d’usage',
      code: 'DB_ERROR',
    }
  }

  if (!usecase) {
    return { ok: false, status: 404, error: 'Cas d’usage introuvable', code: 'NOT_FOUND' }
  }

  const companyId = typeof usecase.company_id === 'string' ? usecase.company_id : ''
  if (!companyId) {
    return { ok: false, status: 500, error: 'Cas d’usage sans registre associé', code: 'DB_ERROR' }
  }

  const { data: userCompany, error: accessError } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .maybeSingle()

  if (accessError) {
    logger.error('loadEvaluationContext: accès user_companies', undefined, {
      details: accessError.message,
    })
    return {
      ok: false,
      status: 500,
      error: 'Erreur lors de la vérification des droits',
      code: 'DB_ERROR',
    }
  }

  if (!userCompany) {
    return { ok: false, status: 403, error: 'Accès refusé', code: 'ACCESS_DENIED' }
  }

  const company = asNestedCompany(usecase.companies)
  const industry = typeof company?.industry === 'string' ? company.industry : null
  const subCategoryId =
    typeof company?.sub_category_id === 'string' ? company.sub_category_id : null

  return {
    ok: true,
    context: {
      usecaseId,
      name: typeof usecase.name === 'string' && usecase.name.trim() ? usecase.name.trim() : 'Sans nom',
      description:
        typeof usecase.description === 'string' && usecase.description.trim()
          ? usecase.description.trim()
          : 'description non renseignée',
      ai_category: typeof usecase.ai_category === 'string' ? usecase.ai_category : null,
      system_type: typeof usecase.system_type === 'string' ? usecase.system_type : null,
      company_id: companyId,
      industry,
      sub_category_id: subCategoryId,
      industryLabel: formatCompanySector(industry, subCategoryId),
    },
  }
}

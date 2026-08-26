import type { User } from '@supabase/supabase-js'
import { formatCompanySector } from '@/lib/constants/industries'
import {
  buildEvaluationContextSystemMessage,
  buildEvaluationToneInstruction,
  EVALUATION_TONE_BUSINESS,
  EVALUATION_TONE_DEFAULT,
  EVALUATION_TONE_LEGAL,
  loadEvaluationContext,
  parseUsecaseId,
  type EvaluationProjectContext,
} from '@/lib/mistral/load-evaluation-context'

const USECASE_ID = '660e8400-e29b-41d4-a716-446655440000'

describe('formatCompanySector', () => {
  test('résout un identifiant d’industrie en libellé', () => {
    expect(formatCompanySector('tech_data')).toBe('Tech, Data & Télécoms')
  })

  test('ajoute la sous-catégorie quand elle est connue', () => {
    expect(formatCompanySector('tech_data', 'ai_data')).toBe(
      'Tech, Data & Télécoms > IA, Data Science & Big Data'
    )
  })

  test('retombe sur non renseigné si le secteur est vide', () => {
    expect(formatCompanySector(null)).toBe('non renseigné')
    expect(formatCompanySector('')).toBe('non renseigné')
  })
})

describe('parseUsecaseId', () => {
  test('accepte un UUID', () => {
    expect(parseUsecaseId(USECASE_ID)).toBe(USECASE_ID)
  })

  test('rejette une valeur invalide', () => {
    expect(parseUsecaseId('new')).toBeNull()
    expect(parseUsecaseId(null)).toBeNull()
  })
})

describe('buildEvaluationContextSystemMessage', () => {
  const context: EvaluationProjectContext = {
    usecaseId: USECASE_ID,
    name: 'Assistant RH',
    description: 'Aide au tri des candidatures',
    ai_category: 'Large Language Model (LLM)',
    system_type: 'Système autonome',
    company_id: '550e8400-e29b-41d4-a716-446655440000',
    industry: 'tech_data',
    sub_category_id: null,
    industryLabel: 'Tech, Data & Télécoms',
  }

  test('injecte secteur, nom et description', () => {
    expect(buildEvaluationContextSystemMessage(context)).toBe(
      "CONTEXTE PROJET : L'entreprise opère dans le secteur Tech, Data & Télécoms. Le projet s'appelle Assistant RH et consiste en Aide au tri des candidatures.\n\n" +
        EVALUATION_TONE_DEFAULT
    )
  })

  test('injecte le jargon juridique pour un DPO ou un avocat', () => {
    expect(buildEvaluationToneInstruction({ 'E4.N7.Q1.2': 'E4.N7.Q1.2.C' })).toBe(
      EVALUATION_TONE_LEGAL
    )
    expect(buildEvaluationToneInstruction({ 'E4.N7.Q1.2': 'E4.N7.Q1.2.D' })).toBe(
      EVALUATION_TONE_LEGAL
    )
    expect(
      buildEvaluationContextSystemMessage(context, { 'E4.N7.Q1.2': 'E4.N7.Q1.2.C' })
    ).toContain(EVALUATION_TONE_LEGAL)
  })

  test('vulgarise pour un profil métier, une idée ou un dirigeant', () => {
    expect(buildEvaluationToneInstruction({ 'E4.N7.Q1.2': 'E4.N7.Q1.2.A' })).toBe(
      EVALUATION_TONE_BUSINESS
    )
    expect(buildEvaluationToneInstruction({ 'E4.N7.Q1.2': 'E4.N7.Q1.2.B' })).toBe(
      EVALUATION_TONE_BUSINESS
    )
    expect(buildEvaluationToneInstruction({ 'E4.N7.Q1.2': 'E4.N7.Q1.2.E' })).toBe(
      EVALUATION_TONE_BUSINESS
    )
  })

  test('reste pédagogique si le Persona est vide ou autre (étudiant)', () => {
    expect(buildEvaluationToneInstruction(undefined)).toBe(EVALUATION_TONE_DEFAULT)
    expect(buildEvaluationToneInstruction({})).toBe(EVALUATION_TONE_DEFAULT)
    expect(buildEvaluationToneInstruction({ 'E4.N7.Q1.2': 'E4.N7.Q1.2.F' })).toBe(
      EVALUATION_TONE_DEFAULT
    )
  })
})

describe('loadEvaluationContext', () => {
  const user = { id: 'user-1' } as User
  const companyId = '550e8400-e29b-41d4-a716-446655440000'

  function createSupabaseMock(options: {
    usecase?: Record<string, unknown> | null
    usecaseError?: { message: string } | null
    userCompany?: { company_id: string } | null
  }) {
    return {
      from: jest.fn((table: string) => {
        if (table === 'usecases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: options.usecase ?? null,
              error: options.usecaseError ?? null,
            }),
          }
        }
        if (table === 'user_companies') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: options.userCompany ?? null,
              error: null,
            }),
          }
        }
        throw new Error(`Table inattendue: ${table}`)
      }),
    }
  }

  test('retourne le contexte après contrôle d’accès', async () => {
    const supabase = createSupabaseMock({
      usecase: {
        id: USECASE_ID,
        name: 'Assistant RH',
        description: 'Aide au tri des candidatures',
        ai_category: 'Large Language Model (LLM)',
        system_type: 'Système autonome',
        company_id: companyId,
        companies: { industry: 'tech_data', sub_category_id: 'ai_data' },
      },
      userCompany: { company_id: companyId },
    })

    const result = await loadEvaluationContext(supabase as never, user, USECASE_ID)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.context.industryLabel).toBe(
      'Tech, Data & Télécoms > IA, Data Science & Big Data'
    )
    expect(result.context.name).toBe('Assistant RH')
  })

  test('refuse un utilisateur sans accès', async () => {
    const supabase = createSupabaseMock({
      usecase: {
        id: USECASE_ID,
        name: 'Assistant RH',
        description: 'Tri',
        company_id: companyId,
        companies: { industry: 'tech_data' },
      },
      userCompany: null,
    })

    const result = await loadEvaluationContext(supabase as never, user, USECASE_ID)
    expect(result).toEqual({
      ok: false,
      status: 403,
      error: 'Accès refusé',
      code: 'ACCESS_DENIED',
    })
  })
})

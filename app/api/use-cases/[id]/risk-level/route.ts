import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deriveRiskLevelFromResponses, type RiskLevelCode } from '@/lib/risk-level'
import {
  normalizeQuestionnaireVersion,
  QUESTIONNAIRE_VERSION_V3,
} from '@/lib/questionnaire-version'
import { dbResponsesToQuestionnaireAnswers } from '@/lib/scoring-v2-server'
import { resolveQualificationOutcomeV3 } from '@/lib/qualification-v3-decision'
import { mergeChecklistIntoDbResponseRows } from '@/lib/merge-checklist-into-user-responses'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: usecaseId } = await params

    // Vérifier que l'utilisateur a accès à ce use case
    // (les colonnes JSONB `checklist_gov_*` portent les pivots E4 / E5 / E6 du parcours V3 :
    // elles doivent être fusionnées avec `usecase_responses` AVANT le calcul du risque,
    // sinon les cas dont la qualification n'est portée QUE par les checklists — bug RH /
    // Éducation, cf. `usecases.id = de3f4108-…` — retombent à tort sur « minimal »).
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select(
        'company_id, questionnaire_version, system_type, checklist_gov_enterprise, checklist_gov_usecase'
      )
      .eq('id', usecaseId)
      .single()

    if (usecaseError) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    // Check if user has access to this use case via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', usecase.company_id)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Récupérer les réponses du use case
    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('*')
      .eq('usecase_id', usecaseId)

    if (responsesError) {
      return NextResponse.json({ error: 'Error fetching responses' }, { status: 500 })
    }

    const checklistEnterprise =
      (usecase as { checklist_gov_enterprise?: string[] | null }).checklist_gov_enterprise ?? null
    const checklistUsecase =
      (usecase as { checklist_gov_usecase?: string[] | null }).checklist_gov_usecase ?? null

    const hasResponseRows = Array.isArray(responses) && responses.length > 0
    const hasChecklistEntries =
      (Array.isArray(checklistEnterprise) && checklistEnterprise.length > 0) ||
      (Array.isArray(checklistUsecase) && checklistUsecase.length > 0)

    if (!hasResponseRows && !hasChecklistEntries) {
      return NextResponse.json({
        risk_level: 'minimal' as RiskLevelCode,
        classification_status: 'qualified' as const,
      })
    }

    /**
     * Hydratation amont : fusionne `usecase_responses` (DB) et les pivots stockés
     * dans `usecases.checklist_gov_*` (JSONB) en un flux unique. C'est le seul
     * point d'entrée vers les moteurs de décision (V3 + V1/V2). Sans cette étape,
     * les cas dont la qualification est portée UNIQUEMENT par les checklists
     * (parcours V3 long, dossiers RH / Éducation) sont systématiquement classés
     * « minimal » alors que l'Annexe III est cochée — ce qui produit un faux
     * négatif réglementaire (cf. bug `Assistant RH Trieur de CV`).
     */
    const unifiedResponses = mergeChecklistIntoDbResponseRows(
      responses ?? [],
      checklistEnterprise,
      checklistUsecase
    )

    const qv = normalizeQuestionnaireVersion(
      (usecase as { questionnaire_version?: number | null }).questionnaire_version
    )

    if (qv === QUESTIONNAIRE_VERSION_V3) {
      const answers = dbResponsesToQuestionnaireAnswers(unifiedResponses)
      const out = resolveQualificationOutcomeV3(
        answers,
        (usecase as { system_type?: string | null }).system_type
      )
      return NextResponse.json({
        risk_level: out.risk_level,
        classification_status: out.classification_status,
      })
    }

    const highestRiskLevel: RiskLevelCode = deriveRiskLevelFromResponses(unifiedResponses)

    return NextResponse.json({
      risk_level: highestRiskLevel,
      classification_status: 'qualified' as const,
    })
  } catch (error) {
    console.error('Error in GET /api/use-cases/[id]/risk-level:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
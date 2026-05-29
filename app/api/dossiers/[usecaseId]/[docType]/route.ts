import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getTodoActionMapping,
  syncTodoActionToResponse,
  reverseTodoActionResponse,
  recalculateDossierUseCaseScore,
} from '@/lib/todo-action-sync'
import { recordUseCaseHistory } from '@/lib/usecase-history'
import {
  getAcceptedDossierApiDocTypeParams,
  normalizeHumanOversightFormData,
  resolveCanonicalDocType,
} from '@/lib/canonical-actions'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const allowedDocTypes = getAcceptedDossierApiDocTypeParams()

function buildScoreRecalcBaseUrl(request: NextRequest): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const host = request.headers.get('host') || 'localhost:3000'
  return `${protocol}://${host}`
}

function getAuthToken(request: NextRequest): string {
  return request.headers.get('authorization')?.replace('Bearer ', '') ?? ''
}

async function getClientFromAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: 'No authorization header' }
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return { error: 'Invalid token' }
  return { supabase, user }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ usecaseId: string, docType: string }> }
) {
  try {
    const { supabase, user, error } = await getClientFromAuth(request) as any
    if (error) return NextResponse.json({ error }, { status: 401 })

    const { usecaseId, docType } = await params
    if (!allowedDocTypes.has(docType)) {
      return NextResponse.json({ error: 'Invalid docType' }, { status: 400 })
    }

    // Ensure user has access to the usecase's company
    const { data: dossierRow } = await supabase
      .from('dossiers')
      .select('id, company_id')
      .eq('usecase_id', usecaseId)
      .maybeSingle()

    if (!dossierRow) {
      return NextResponse.json({ textContent: null, fileUrl: null, status: 'incomplete', updatedAt: null })
    }

    const { data: access } = await supabase
      .from('user_companies')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('company_id', dossierRow.company_id)
      .maybeSingle()

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const storageDocType = resolveCanonicalDocType(docType)

    const { data: doc } = await supabase
      .from('dossier_documents')
      .select('form_data, file_url, status, updated_at, doc_type')
      .eq('dossier_id', dossierRow.id)
      .eq('doc_type', storageDocType)
      .maybeSingle()

    let formData = doc?.form_data ?? null
    if (storageDocType === 'human_oversight' && formData && typeof formData === 'object') {
      formData = normalizeHumanOversightFormData(formData as Record<string, unknown>)
    }

    return NextResponse.json({
      formData,
      fileUrl: doc?.file_url ?? null,
      status: doc?.status ?? 'incomplete',
      updatedAt: doc?.updated_at ?? null,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ usecaseId: string, docType: string }> }
) {
  try {
    const { supabase, user, error } = await getClientFromAuth(request) as any
    if (error) return NextResponse.json({ error }, { status: 401 })

    const { usecaseId, docType } = await params
    if (!allowedDocTypes.has(docType)) {
      return NextResponse.json({ error: 'Invalid docType' }, { status: 400 })
    }

    const storageDocType = resolveCanonicalDocType(docType)

    const body = await request.json()
    let formData: Record<string, any> | undefined = body?.formData
    if (storageDocType === 'human_oversight' && formData && typeof formData === 'object') {
      formData = normalizeHumanOversightFormData(formData) as Record<string, any>
    }
    const status: 'incomplete' | 'complete' | 'validated' | undefined = body?.status

    // Find or create dossier
    const { data: existingDossier } = await supabase
      .from('dossiers')
      .select('id, company_id')
      .eq('usecase_id', usecaseId)
      .maybeSingle()

    let dossierId = existingDossier?.id

    if (!dossierId) {
      // Get usecase to know company
      const { data: usecase } = await supabase
        .from('usecases')
        .select('company_id')
        .eq('id', usecaseId)
        .maybeSingle()

      if (!usecase?.company_id) {
        return NextResponse.json({ error: 'Usecase not found' }, { status: 404 })
      }

      // Access check
      const { data: access } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('company_id', usecase.company_id)
        .maybeSingle()

      if (!access) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const { data: inserted, error: insErr } = await supabase
        .from('dossiers')
        .insert({ usecase_id: usecaseId, company_id: usecase.company_id })
        .select('id')
        .single()

      if (insErr) {
        return NextResponse.json({ error: 'Failed to create dossier' }, { status: 500 })
      }
      dossierId = inserted.id
    } else {
      // Access check on existing dossier
      const { data: access } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('company_id', existingDossier.company_id)
        .maybeSingle()
      if (!access) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Upsert doc (clé de stockage canonique)
    const payload: any = {
      dossier_id: dossierId,
      doc_type: storageDocType,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }
    if (formData !== undefined) payload.form_data = formData
    if (status) payload.status = status

    const { data: existingDoc } = await supabase
      .from('dossier_documents')
      .select('id, status, doc_type, updated_at')
      .eq('dossier_id', dossierId)
      .eq('doc_type', storageDocType)
      .maybeSingle()

    const previousStatus: string | null = existingDoc?.status || null

    // Upsert: update if exists, insert if not
    if (existingDoc?.id) {
      const { error: upErr } = await supabase
        .from('dossier_documents')
        .update(payload)
        .eq('id', existingDoc.id)
      if (upErr) return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    } else {
      const { error: insDocErr } = await supabase
        .from('dossier_documents')
        .insert(payload)
      if (insDocErr) return NextResponse.json({ error: 'Failed to insert document' }, { status: 500 })
    }

    // Metadata for history events
    const historyMetadata: Record<string, unknown> = {
      doc_type: storageDocType,
      document_name: storageDocType.replace(/_/g, ' ')
    }

    let scoreChange = null

    // ===== CASE 1: Document is being marked as COMPLETE =====
    if (status === 'complete') {
      const isFirstCompletion = previousStatus !== 'complete' && previousStatus !== 'validated'
      const isModification = previousStatus === 'complete' || previousStatus === 'validated'

      // Sync questionnaire (si mappable) ; recalcul uniquement si gain de score attendu (Règle n°11)
      if (isFirstCompletion) {
        const syncResult = await syncTodoActionToResponse(
          supabase,
          usecaseId,
          storageDocType,
          user.email || user.id
        )

        if (syncResult.shouldRecalculate) {
          const todoMapping = getTodoActionMapping(storageDocType)
          const scoreRecalc = await recalculateDossierUseCaseScore(
            supabase,
            usecaseId,
            getAuthToken(request),
            buildScoreRecalcBaseUrl(request)
          )

          if (scoreRecalc && scoreRecalc.newScore !== null) {
            scoreChange = {
              previousScore: scoreRecalc.previousScore,
              newScore: scoreRecalc.newScore,
              pointsGained: scoreRecalc.pointsGained,
              reason: todoMapping?.reason ?? 'Document de conformite ajoute',
            }
            console.log('[POST /dossiers] Score recalculated via calculate-score:', scoreChange)
          } else if (scoreRecalc === null) {
            console.error('[POST /dossiers] Score recalculation failed after todo sync')
          }
        }

        // Record history: document_uploaded (first completion)
        if (scoreChange) {
          historyMetadata.previous_score = scoreChange.previousScore
          historyMetadata.new_score = scoreChange.newScore
          historyMetadata.score_change = scoreChange.pointsGained
        }
        await recordUseCaseHistory(supabase, usecaseId, user.id, 'document_uploaded', {
          metadata: historyMetadata
        })
      } else if (isModification) {
        // Record history: document_modified (updating existing completed document)
        await recordUseCaseHistory(supabase, usecaseId, user.id, 'document_modified', {
          metadata: historyMetadata
        })
      }
    }

    // ===== CASE 2: Document is being RESET to incomplete =====
    if (status === 'incomplete' && (previousStatus === 'complete' || previousStatus === 'validated')) {
      console.log('[POST /dossiers] Document being reset from', previousStatus, 'to incomplete')

      const reverseResult = await reverseTodoActionResponse(
        supabase,
        usecaseId,
        storageDocType,
        user.email || user.id
      )

      if (reverseResult.shouldRecalculate) {
        const todoMapping = getTodoActionMapping(storageDocType)
        const scoreRecalc = await recalculateDossierUseCaseScore(
          supabase,
          usecaseId,
          getAuthToken(request),
          buildScoreRecalcBaseUrl(request)
        )

        if (scoreRecalc && scoreRecalc.newScore !== null) {
          scoreChange = {
            previousScore: scoreRecalc.previousScore,
            newScore: scoreRecalc.newScore,
            pointsGained: scoreRecalc.pointsGained,
            reason: reverseResult.reason || todoMapping?.reason || 'Document de conformite reinitialise',
          }
          console.log('[POST /dossiers] Score recalculated via calculate-score after reset:', scoreChange)
        } else if (scoreRecalc === null) {
          console.error('[POST /dossiers] Score recalculation failed after todo reverse')
        }
      }

      // Record history: document_reset
      if (scoreChange) {
        historyMetadata.previous_score = scoreChange.previousScore
        historyMetadata.new_score = scoreChange.newScore
        historyMetadata.score_change = scoreChange.pointsGained
      }
      await recordUseCaseHistory(supabase, usecaseId, user.id, 'document_reset', {
        metadata: historyMetadata
      })
    }

    return NextResponse.json({ ok: true, scoreChange })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



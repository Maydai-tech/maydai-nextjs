import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getTodoActionMapping,
  syncTodoActionToResponse,
  reverseTodoActionResponse,
} from '@/lib/todo-action-sync'
import { recordUseCaseHistory } from '@/lib/usecase-history'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const allowedDocTypes = new Set([
  'system_prompt',
  'technical_documentation',
  'human_oversight',
  'transparency_marking',
  'risk_management',
  'data_quality',
  'continuous_monitoring',
  'training_census',
  'stopping_proof',
  'registry_proof',
  'training_plan',
])

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

    const { data: doc } = await supabase
      .from('dossier_documents')
      .select('form_data, file_url, status, updated_at')
      .eq('dossier_id', dossierRow.id)
      .eq('doc_type', docType)
      .maybeSingle()

    return NextResponse.json({
      formData: doc?.form_data ?? null,
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

    const body = await request.json()
    const formData: Record<string, any> | undefined = body?.formData
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

    // Upsert doc
    const payload: any = {
      dossier_id: dossierId,
      doc_type: docType,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }
    if (formData !== undefined) payload.form_data = formData
    if (status) payload.status = status

    // Check if document already exists and get its previous status BEFORE updating
    const { data: existingDoc } = await supabase
      .from('dossier_documents')
      .select('id, status')
      .eq('dossier_id', dossierId)
      .eq('doc_type', docType)
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
    let historyMetadata: Record<string, unknown> = {
      doc_type: docType,
      document_name: docType.replace(/_/g, ' ')
    }

    let scoreChange = null

    // ===== CASE 1: Document is being marked as COMPLETE =====
    if (status === 'complete') {
      const isFirstCompletion = previousStatus !== 'complete' && previousStatus !== 'validated'
      const isModification = previousStatus === 'complete' || previousStatus === 'validated'

      // Sync questionnaire response and update score (only on first completion)
      if (isFirstCompletion) {
        const todoMapping = getTodoActionMapping(docType)
        if (todoMapping) {
          console.log('[POST /dossiers] Found todo_action mapping for docType:', docType)

          const syncResult = await syncTodoActionToResponse(
            supabase,
            usecaseId,
            docType,
            user.email || user.id
          )

          // Only update score if the previous answer was the NEGATIVE one
          if (syncResult.shouldRecalculate && syncResult.expectedPointsGained > 0) {
            console.log('[POST /dossiers] Previous answer was negative, updating score')
            console.log('[POST /dossiers] Expected points gained:', syncResult.expectedPointsGained)

            const { data: currentUsecase } = await supabase
              .from('usecases')
              .select('score_final, score_base, score_model')
              .eq('id', usecaseId)
              .single()

            const previousScore = currentUsecase?.score_final ?? null
            const previousBaseScore = currentUsecase?.score_base ?? 0
            const scoreModel = currentUsecase?.score_model ?? 0

            if (previousScore !== null) {
              const newBaseScore = previousBaseScore + syncResult.expectedPointsGained
              // IMPORTANT: score_model en DB est le score brut (0-20), il faut appliquer le multiplicateur 2.5
              const COMPL_AI_WEIGHT = 2.5
              const newFinalScore = Math.round(((newBaseScore + scoreModel * COMPL_AI_WEIGHT) / 150) * 100 * 100) / 100

              console.log(`[POST /dossiers] Score update: base ${previousBaseScore} -> ${newBaseScore}, final ${previousScore} -> ${newFinalScore}`)

              const { error: updateError } = await supabase
                .from('usecases')
                .update({
                  score_base: newBaseScore,
                  score_final: newFinalScore,
                  last_calculation_date: new Date().toISOString(),
                })
                .eq('id', usecaseId)

              if (!updateError) {
                const pointsGainedFinal = Math.round((newFinalScore - previousScore) * 100) / 100

                scoreChange = {
                  previousScore: previousScore,
                  newScore: newFinalScore,
                  pointsGained: pointsGainedFinal,
                  reason: todoMapping.reason,
                }
                console.log('[POST /dossiers] Score changed:', scoreChange)
              } else {
                console.error('[POST /dossiers] Error updating score:', updateError)
              }
            }
          } else if (syncResult.changed) {
            console.log('[POST /dossiers] Response was updated but previous was null, no score update needed')
          } else {
            console.log('[POST /dossiers] Response was already set to positive value, no score update needed')
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

      const todoMapping = getTodoActionMapping(docType)
      if (todoMapping) {
        console.log('[POST /dossiers] Found todo_action mapping for reset, docType:', docType)

        // Reverse the questionnaire response (set back to "Non")
        const reverseResult = await reverseTodoActionResponse(
          supabase,
          usecaseId,
          docType,
          user.email || user.id
        )

        // Only decrease score if the previous answer was the POSITIVE one
        if (reverseResult.shouldRecalculate && reverseResult.expectedPointsLost > 0) {
          console.log('[POST /dossiers] Previous answer was positive, decreasing score')
          console.log('[POST /dossiers] Expected points lost:', reverseResult.expectedPointsLost)

          const { data: currentUsecase } = await supabase
            .from('usecases')
            .select('score_final, score_base, score_model')
            .eq('id', usecaseId)
            .single()

          const previousScore = currentUsecase?.score_final ?? null
          const previousBaseScore = currentUsecase?.score_base ?? 0
          const scoreModel = currentUsecase?.score_model ?? 0

          if (previousScore !== null) {
            // Decrease the base score (subtract the points that were gained)
            const newBaseScore = Math.max(0, previousBaseScore - reverseResult.expectedPointsLost)
            // IMPORTANT: score_model en DB est le score brut (0-20), il faut appliquer le multiplicateur 2.5
            const COMPL_AI_WEIGHT = 2.5
            const newFinalScore = Math.round(((newBaseScore + scoreModel * COMPL_AI_WEIGHT) / 150) * 100 * 100) / 100

            console.log(`[POST /dossiers] Score decrease: base ${previousBaseScore} -> ${newBaseScore}, final ${previousScore} -> ${newFinalScore}`)

            const { error: updateError } = await supabase
              .from('usecases')
              .update({
                score_base: newBaseScore,
                score_final: newFinalScore,
                last_calculation_date: new Date().toISOString(),
              })
              .eq('id', usecaseId)

            if (!updateError) {
              const pointsLostFinal = Math.round((newFinalScore - previousScore) * 100) / 100

              scoreChange = {
                previousScore: previousScore,
                newScore: newFinalScore,
                pointsGained: pointsLostFinal, // Will be negative
                reason: reverseResult.reason,
              }
              console.log('[POST /dossiers] Score decreased:', scoreChange)
            } else {
              console.error('[POST /dossiers] Error updating score:', updateError)
            }
          }
        } else {
          console.log('[POST /dossiers] No score decrease needed (response was not positive or no mapping)')
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



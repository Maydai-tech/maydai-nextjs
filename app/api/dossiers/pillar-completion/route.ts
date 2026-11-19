import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { updateDossierPillarCompletion } from '@/lib/services/system-card-service'
import {
  PILLAR_CODE_TO_DOC_TYPE,
  SystemCardPillarCodeSchema,
} from '@/lib/validations/system-card'

const PillarCompletionBodySchema = z
  .object({
    usecaseId: z.string().uuid(),
    dossierId: z.string().uuid().nullable().optional(),
    pillarCode: SystemCardPillarCodeSchema,
    applyMaydaiPrefill: z.boolean().optional(),
    applyUserCompletion: z.boolean().optional(),
    pillarId: z.string().uuid().optional(),
    userNotes: z.string().max(20000).optional(),
  })
  .refine(
    (value) => value.applyMaydaiPrefill !== undefined || value.applyUserCompletion !== undefined,
    { message: 'Indiquez au moins applyMaydaiPrefill ou applyUserCompletion (true ou false)' }
  )

export async function POST(request: NextRequest) {
  let supabase
  let user
  try {
    ;({ supabase, user } = await getAuthenticatedSupabaseClient(request))
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = PillarCompletionBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
  }

  const body = parsed.data

  const { data: usecase } = await supabase
    .from('usecases')
    .select('id, company_id')
    .eq('id', body.usecaseId)
    .maybeSingle()

  if (!usecase) {
    return NextResponse.json({ error: 'Cas d’usage introuvable' }, { status: 404 })
  }

  const { data: access } = await supabase
    .from('user_companies')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('company_id', usecase.company_id)
    .maybeSingle()

  if (!access) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  let dossierId = body.dossierId ?? null
  if (dossierId) {
    const { data: dossier } = await supabase
      .from('dossiers')
      .select('id, company_id, usecase_id')
      .eq('id', dossierId)
      .maybeSingle()

    if (!dossier || dossier.usecase_id !== body.usecaseId) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    }
  } else {
    const { data: existingDossier } = await supabase
      .from('dossiers')
      .select('id')
      .eq('usecase_id', body.usecaseId)
      .maybeSingle()

    if (existingDossier?.id) {
      dossierId = existingDossier.id
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('dossiers')
        .insert({ usecase_id: body.usecaseId, company_id: usecase.company_id })
        .select('id')
        .single()

      if (insertError || !inserted?.id) {
        return NextResponse.json({ error: 'Impossible de créer le dossier' }, { status: 500 })
      }
      dossierId = inserted.id
    }
  }
  if (!dossierId) {
    return NextResponse.json(
      { error: 'Impossible de résoudre ou de créer le dossier' },
      { status: 500 }
    );
  }
  try {
    const result = await updateDossierPillarCompletion({
      usecaseId: body.usecaseId,
      dossierId,
      pillarCode: body.pillarCode,
      applyMaydaiPrefill: body.applyMaydaiPrefill,
      applyUserCompletion: body.applyUserCompletion,
      pillarId: body.pillarId,
    })

    if (body.userNotes && body.applyUserCompletion) {
      const { data: currentDoc } = await supabase
        .from('dossier_documents')
        .select('id, form_data')
        .eq('dossier_id', dossierId)
        .eq('doc_type', PILLAR_CODE_TO_DOC_TYPE[body.pillarCode])
        .maybeSingle()

      const previousForm =
        currentDoc?.form_data && typeof currentDoc.form_data === 'object'
          ? (currentDoc.form_data as Record<string, unknown>)
          : {}

      if (currentDoc?.id) {
        await supabase
          .from('dossier_documents')
          .update({
            form_data: { ...previousForm, system_card_notes: body.userNotes },
          })
          .eq('id', currentDoc.id)
      }
    }

    return NextResponse.json({
      success: result.success,
      newStatus: result.newStatus,
      dossierId,
      scoreChange: result.scoreChange,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

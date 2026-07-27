import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  const { id } = await context.params
  const body = (await request.json().catch(() => ({}))) as { maydaiModelId?: unknown }
  const maydaiModelId =
    typeof body.maydaiModelId === 'string' && body.maydaiModelId.trim()
      ? body.maydaiModelId.trim()
      : null

  try {
    const supabase = createEcoLogitsServiceClient()
    const { data: ecoModel } = await supabase
      .from('ecologits_models')
      .select('id')
      .eq('id', id)
      .maybeSingle()
    if (!ecoModel) return NextResponse.json({ error: 'Modèle EcoLogits introuvable' }, { status: 404 })

    if (!maydaiModelId) {
      const { error } = await supabase
        .from('ecologits_model_links')
        .delete()
        .eq('ecologits_model_id', id)
      if (error) throw error
      return NextResponse.json({ success: true, link: null })
    }

    const { data: maydaiModel } = await supabase
      .from('compl_ai_models')
      .select('id')
      .eq('id', maydaiModelId)
      .maybeSingle()
    if (!maydaiModel) return NextResponse.json({ error: 'Modèle MaydAI introuvable' }, { status: 404 })

    const { data, error } = await supabase
      .from('ecologits_model_links')
      .upsert(
        {
          ecologits_model_id: id,
          maydai_model_id: maydaiModelId,
          match_method: 'manual',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'ecologits_model_id' },
      )
      .select('ecologits_model_id, maydai_model_id, match_method')
      .single()
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'Ce modèle MaydAI est déjà lié à un autre modèle EcoLogits.' },
        { status: 409 },
      )
    }
    if (error) throw error
    return NextResponse.json({ success: true, link: data })
  } catch (error) {
    console.error('[EcoLogits Admin] Liaison impossible:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOwner } from '@/lib/collaborators'
import { logger, createRequestContext } from '@/lib/secure-logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

// DELETE /api/usecases/[id]/collaborators/[collaboratorId] - Delete a collaborator from a use case
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  try {
    const { id: usecaseId, collaboratorId } = await params

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

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get use case to verify ownership via company
    const { data: usecase } = await supabase
      .from('usecases')
      .select('company_id')
      .eq('id', usecaseId)
      .single()

    if (!usecase) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    // Verify user is owner of the parent company
    const userIsOwner = await isOwner(user.id, 'company', usecase.company_id)
    if (!userIsOwner) {
      return NextResponse.json({ error: 'Only company owners can remove collaborators' }, { status: 403 })
    }

    // Delete collaborator from use case (hard delete)
    const { error: deleteError } = await supabase
      .from('user_usecases')
      .delete()
      .eq('user_id', collaboratorId)
      .eq('usecase_id', usecaseId)

    if (deleteError) {
      logger.error('Failed to delete collaborator from use case', deleteError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to delete collaborator' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to delete collaborator from use case', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

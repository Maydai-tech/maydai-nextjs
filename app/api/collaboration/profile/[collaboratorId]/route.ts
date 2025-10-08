import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, createRequestContext } from '@/lib/secure-logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

// DELETE /api/collaboration/profile/[collaboratorId] - Delete a profile-level collaborator
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collaboratorId: string }> }
) {
  try {
    const { collaboratorId } = await params

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

    // Delete collaborator from profile level (hard delete)
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('inviter_user_id', user.id)
      .eq('invited_user_id', collaboratorId)

    if (deleteError) {
      logger.error('Failed to delete profile-level collaborator', deleteError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to delete collaborator' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to delete profile-level collaborator', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

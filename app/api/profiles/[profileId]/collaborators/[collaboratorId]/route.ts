import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserOwnedCompanies } from '@/lib/permissions'
import { logger, createRequestContext } from '@/lib/secure-logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

// DELETE /api/profiles/[profileId]/collaborators/[collaboratorId] - Remove collaborator from all owned companies
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string, collaboratorId: string }> }
) {
  try {
    const { profileId, collaboratorId } = await params

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

    // Verify that profileId matches the authenticated user
    if (user.id !== profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all companies where user is owner
    const ownedCompanyIds = await getUserOwnedCompanies(user.id, token)

    if (ownedCompanyIds.length === 0) {
      return NextResponse.json({ error: 'You do not own any companies' }, { status: 400 })
    }

    // Delete collaborator from all owned companies
    const { error: deleteError } = await supabase
      .from('user_companies')
      .delete()
      .eq('user_id', collaboratorId)
      .in('company_id', ownedCompanyIds)
      .eq('is_active', true)

    if (deleteError) {
      logger.error('Failed to delete collaborator from owned companies', deleteError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to remove collaborator' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to remove collaborator', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

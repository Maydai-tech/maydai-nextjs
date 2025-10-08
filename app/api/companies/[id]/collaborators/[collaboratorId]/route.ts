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

// DELETE /api/companies/[id]/collaborators/[collaboratorId] - Delete a collaborator from a company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  try {
    const { id: companyId, collaboratorId } = await params

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

    // Verify user is owner of this company
    const userIsOwner = await isOwner(user.id, 'company', companyId, supabase)
    if (!userIsOwner) {
      return NextResponse.json({ error: 'Only company owners can remove collaborators' }, { status: 403 })
    }

    // Check if the collaborator to remove is the owner
    const { data: userCompany } = await supabase
      .from('user_companies')
      .select('role')
      .eq('user_id', collaboratorId)
      .eq('company_id', companyId)
      .single()

    if (userCompany?.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the owner of the company' }, { status: 400 })
    }

    // Delete collaborator from company (hard delete)
    const { error: deleteError } = await supabase
      .from('user_companies')
      .delete()
      .eq('user_id', collaboratorId)
      .eq('company_id', companyId)

    if (deleteError) {
      logger.error('Failed to delete collaborator from company', deleteError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to delete collaborator' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to delete collaborator from company', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOwner } from '@/lib/collaborators'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { getUserByEmail, inviteUserByEmail, createProfileForUser } from '@/lib/invite-user'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

// POST /api/usecases/[id]/collaborators - Invite collaborator to specific use case
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: usecaseId } = await params

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
      .select('company_id, name')
      .eq('id', usecaseId)
      .single()

    if (!usecase) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    // Verify user is owner of the parent company
    const userIsOwner = await isOwner(user.id, 'company', usecase.company_id)
    if (!userIsOwner) {
      return NextResponse.json({ error: 'Only company owners can invite collaborators' }, { status: 403 })
    }

    const body = await request.json()
    const { email, firstName, lastName } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields: email, firstName, lastName' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Check if user exists in auth.users by email
    let collaboratorProfileId: string | null = null
    const { user: existingAuthUser, error: getUserError } = await getUserByEmail(email)

    if (existingAuthUser) {
      // User already exists in auth
      // Check if user is trying to invite themselves
      if (existingAuthUser.id === user.id) {
        return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })
      }

      collaboratorProfileId = existingAuthUser.id

      // Check if profile exists, if not create it
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', existingAuthUser.id)
        .single()

      if (!existingProfile) {
        // Create profile for existing auth user
        const { error: createProfileError } = await createProfileForUser(
          existingAuthUser.id,
          firstName,
          lastName
        )

        if (createProfileError) {
          logger.error('Failed to create profile for existing user', createProfileError, createRequestContext(request))
          return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
        }
      }
    } else {
      // User doesn't exist, invite them via email
      const { data: inviteData, error: inviteError } = await inviteUserByEmail(email, {
        firstName,
        lastName
      })

      if (inviteError || !inviteData.user) {
        logger.error('Failed to invite user', inviteError, createRequestContext(request))
        return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 })
      }

      collaboratorProfileId = inviteData.user.id

      // Create profile for the invited user
      const { error: createProfileError } = await createProfileForUser(
        inviteData.user.id,
        firstName,
        lastName
      )

      if (createProfileError) {
        logger.error('Failed to create profile for invited user', createProfileError, createRequestContext(request))
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
      }
    }

    // Check if collaborator already has access to this use case
    const { data: existingCollaboration } = await supabase
      .from('user_usecases')
      .select('id, role')
      .eq('user_id', collaboratorProfileId)
      .eq('usecase_id', usecaseId)
      .single()

    if (existingCollaboration) {
      return NextResponse.json({ error: 'This user is already a collaborator on this use case' }, { status: 400 })
    }

    // Create user_usecases entry with default role 'user'
    const { error: insertError } = await supabase
      .from('user_usecases')
      .insert({
        user_id: collaboratorProfileId,
        usecase_id: usecaseId,
        role: 'user',
        added_by: user.id
      })

    if (insertError) {
      logger.error('Failed to create user_usecases entry', insertError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to add collaborator' }, { status: 500 })
    }

    // Get collaborator details
    const { data: collaboratorProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', collaboratorProfileId)
      .single()

    return NextResponse.json({
      success: true,
      collaborator: {
        id: collaboratorProfile?.id,
        firstName: collaboratorProfile?.first_name,
        lastName: collaboratorProfile?.last_name,
        email
      },
      usecase: {
        id: usecaseId,
        name: usecase.name
      }
    })

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to invite collaborator to use case', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/usecases/[id]/collaborators - Get all collaborators for a use case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: usecaseId } = await params

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

    // Get use case to find owner
    const { data: usecase } = await supabase
      .from('usecases')
      .select('user_id, company_id')
      .eq('id', usecaseId)
      .single()

    if (!usecase) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    const ownerId = usecase.user_id

    // Get collaborators at use case level
    const { data: usecaseCollaborators, error: fetchError } = await supabase
      .from('user_usecases')
      .select(`
        id,
        user_id,
        role,
        created_at,
        profiles:user_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('usecase_id', usecaseId)

    if (fetchError) {
      logger.error('Failed to fetch user_usecases', fetchError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 })
    }

    // Get collaborators at company level (inherited access)
    const { data: companyCollaborators } = await supabase
      .from('user_companies')
      .select(`
        id,
        user_id,
        role,
        created_at,
        profiles:user_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('company_id', usecase.company_id)
      .neq('role', 'owner')

    // Get collaborators at profile level (account-level access)
    const { data: profileCollaborators } = await supabase
      .from('user_profiles')
      .select(`
        id,
        invited_user_id,
        role,
        created_at,
        profiles:invited_user_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('inviter_user_id', ownerId)

    // Combine and format results
    const usecaseCollab = (usecaseCollaborators || []).map(uc => ({
      id: uc.user_id,
      firstName: (uc.profiles as any)?.first_name,
      lastName: (uc.profiles as any)?.last_name,
      role: uc.role,
      scope: 'usecase' as const,
      addedAt: uc.created_at
    }))

    const companyCollab = (companyCollaborators || []).map(cc => ({
      id: cc.user_id,
      firstName: (cc.profiles as any)?.first_name,
      lastName: (cc.profiles as any)?.last_name,
      role: cc.role,
      scope: 'registry' as const,
      addedAt: cc.created_at
    }))

    const accountCollab = (profileCollaborators || []).map(pc => ({
      id: pc.invited_user_id,
      firstName: (pc.profiles as any)?.first_name,
      lastName: (pc.profiles as any)?.last_name,
      role: pc.role,
      scope: 'account' as const,
      addedAt: pc.created_at
    }))

    // Merge all lists, higher scope takes precedence
    const allCollaborators = [...accountCollab, ...companyCollab, ...usecaseCollab]

    // Remove duplicates (account > registry > usecase)
    const uniqueCollaborators = allCollaborators.reduce((acc, collab) => {
      const existing = acc.find(c => c.id === collab.id)
      if (!existing) {
        acc.push(collab)
      } else {
        const scopePriority = { account: 3, registry: 2, usecase: 1 }
        if (scopePriority[collab.scope] > scopePriority[existing.scope]) {
          const index = acc.findIndex(c => c.id === collab.id)
          acc[index] = collab
        }
      }
      return acc
    }, [] as typeof allCollaborators)

    return NextResponse.json(uniqueCollaborators)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to fetch use case collaborators', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

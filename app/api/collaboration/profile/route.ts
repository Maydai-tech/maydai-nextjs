import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { getUserByEmail, inviteUserByEmail, createProfileForUser } from '@/lib/invite-user'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

// POST /api/collaboration/profile - Invite collaborator at profile level (full access)
export async function POST(request: NextRequest) {
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

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { email, firstName, lastName, role = 'user' } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields: email, firstName, lastName' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Validate role
    const validRoles = ['owner', 'user']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if user exists in auth.users by email
    let collaboratorProfileId: string | null = null
    const { user: existingAuthUser } = await getUserByEmail(email)

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

    // Check if collaborator already has profile-level access
    const { data: existingCollaboration } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('inviter_user_id', user.id)
      .eq('invited_user_id', collaboratorProfileId)
      .single()

    if (existingCollaboration) {
      return NextResponse.json({ error: 'This user is already a collaborator at profile level' }, { status: 400 })
    }

    // Create user_profiles entry
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        inviter_user_id: user.id,
        invited_user_id: collaboratorProfileId,
        role: role,
        added_by: user.id
      })

    if (insertError) {
      logger.error('Failed to create user_profiles entry', insertError, createRequestContext(request))
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
        email,
        role
      }
    })

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to invite collaborator at profile level', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/collaboration/profile - Get all collaborators (profile and company level)
export async function GET(request: NextRequest) {
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

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get all companies owned by the user
    const { data: ownedCompanies } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')

    const ownedCompanyIds = ownedCompanies?.map(uc => uc.company_id) || []

    // Get all profile-level collaborators (account-level access)
    const { data: profileCollaborators, error: fetchError } = await supabase
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
      .eq('inviter_user_id', user.id)

    if (fetchError) {
      logger.error('Failed to fetch user_profiles', fetchError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 })
    }

    // Get all company-level collaborators for owned companies
    let companyCollaborations: any[] = []
    if (ownedCompanyIds.length > 0) {
      const { data, error: companyFetchError } = await supabase
        .from('user_companies')
        .select(`
          user_id,
          company_id,
          role,
          created_at,
          profiles:user_id (
            id,
            first_name,
            last_name
          )
        `)
        .in('company_id', ownedCompanyIds)
        .eq('role', 'user')

      if (companyFetchError) {
        logger.error('Failed to fetch user_companies', companyFetchError, createRequestContext(request))
      } else {
        companyCollaborations = data || []
      }
    }

    // Format profile-level collaborators
    const profileCollaboratorMap = new Map<string, any>()
    ;(profileCollaborators || []).forEach(pc => {
      profileCollaboratorMap.set(pc.invited_user_id, {
        id: pc.invited_user_id,
        firstName: (pc.profiles as any)?.first_name,
        lastName: (pc.profiles as any)?.last_name,
        role: pc.role,
        scope: 'account' as const,
        companiesCount: ownedCompanyIds.length, // Account-level = all companies
        addedAt: pc.created_at
      })
    })

    // Count companies for company-level collaborators
    const companyCollaboratorMap = new Map<string, any>()
    companyCollaborations.forEach(cc => {
      const existing = companyCollaboratorMap.get(cc.user_id)
      if (existing) {
        existing.companiesCount++
      } else {
        companyCollaboratorMap.set(cc.user_id, {
          id: cc.user_id,
          firstName: (cc.profiles as any)?.first_name,
          lastName: (cc.profiles as any)?.last_name,
          role: cc.role,
          scope: 'registry' as const,
          companiesCount: 1,
          addedAt: cc.created_at
        })
      }
    })

    // Merge both maps, with profile-level taking precedence
    const allCollaborators = Array.from(profileCollaboratorMap.values())
    companyCollaboratorMap.forEach((collab, userId) => {
      if (!profileCollaboratorMap.has(userId)) {
        allCollaborators.push(collab)
      }
    })

    return NextResponse.json(allCollaborators)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to fetch collaborators', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

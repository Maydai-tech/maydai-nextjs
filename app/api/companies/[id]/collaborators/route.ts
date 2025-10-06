import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOwnerOfCompany, hasAccessToCompany } from '@/lib/permissions'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { getUserByEmail, inviteUserByEmail, createProfileForUser } from '@/lib/invite-user'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

// POST /api/companies/[id]/collaborators - Invite collaborator to specific company
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params

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
    const isOwner = await isOwnerOfCompany(user.id, companyId, token)
    if (!isOwner) {
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

    // Check if collaborator already has access to this company
    const { data: existingCollaboration } = await supabase
      .from('user_companies')
      .select('id, role')
      .eq('user_id', collaboratorProfileId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    if (existingCollaboration) {
      if (existingCollaboration.role === 'owner' || existingCollaboration.role === 'company_owner') {
        return NextResponse.json({ error: 'This user is already an owner of this company' }, { status: 400 })
      }
      return NextResponse.json({ error: 'This user is already a collaborator on this company' }, { status: 400 })
    }

    // Create user_companies entry
    const { error: insertError } = await supabase
      .from('user_companies')
      .insert({
        user_id: collaboratorProfileId,
        company_id: companyId,
        role: 'user',
        is_active: true
      })

    if (insertError) {
      logger.error('Failed to create user_companies entry', insertError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to add collaborator' }, { status: 500 })
    }

    // Get collaborator details
    const { data: collaboratorProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', collaboratorProfileId)
      .single()

    // Get company details
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    return NextResponse.json({
      success: true,
      collaborator: {
        id: collaboratorProfile?.id,
        firstName: collaboratorProfile?.first_name,
        lastName: collaboratorProfile?.last_name,
        email
      },
      company: {
        id: companyId,
        name: company?.name
      }
    })

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to invite collaborator to company', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/companies/[id]/collaborators - Get all collaborators for a company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params

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

    // Verify user has access to this company (owner or collaborator)
    const hasAccess = await hasAccessToCompany(user.id, companyId, token)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all users with access to this company
    const { data: userCompanies, error: fetchError } = await supabase
      .from('user_companies')
      .select('user_id, role')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (fetchError) {
      logger.error('Failed to fetch user_companies', fetchError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 })
    }

    if (!userCompanies || userCompanies.length === 0) {
      return NextResponse.json([])
    }

    const userIds = userCompanies.map(uc => uc.user_id)

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds)

    if (profilesError) {
      logger.error('Failed to fetch profiles', profilesError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 })
    }

    // Combine data
    const collaborators = profiles?.map(profile => {
      const userCompany = userCompanies.find(uc => uc.user_id === profile.id)
      return {
        id: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: userCompany?.role === 'owner' || userCompany?.role === 'company_owner' ? 'owner' : 'user'
      }
    }) || []

    return NextResponse.json(collaborators)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to fetch company collaborators', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

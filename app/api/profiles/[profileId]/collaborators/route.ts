import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserOwnedCompanies } from '@/lib/permissions'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { getUserByEmail, inviteUserByEmail, createProfileForUser } from '@/lib/invite-user'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

// POST /api/profiles/[profileId]/collaborators - Invitation globale
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params

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

    // Get all companies where user is owner
    const ownedCompanyIds = await getUserOwnedCompanies(user.id, token)

    if (ownedCompanyIds.length === 0) {
      return NextResponse.json({ error: 'You do not own any companies' }, { status: 400 })
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
      // User doesn't exist, create them (email sent via Mailjet in parent routes)
      const { data: inviteData, error: inviteError } = await inviteUserByEmail(email, {
        firstName,
        lastName
      })

      if (inviteError || !inviteData?.user) {
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

    // Check if collaborator is already added to any of the companies
    const { data: existingCollaborations } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', collaboratorProfileId)
      .in('company_id', ownedCompanyIds)

    const existingCompanyIds = existingCollaborations?.map(uc => uc.company_id) || []
    const newCompanyIds = ownedCompanyIds.filter(id => !existingCompanyIds.includes(id))

    if (newCompanyIds.length === 0) {
      return NextResponse.json({
        error: 'This user is already a collaborator on all your companies',
        alreadySharedCount: existingCompanyIds.length
      }, { status: 400 })
    }

    // Create user_companies entries for all owned companies
    const userCompaniesInserts = newCompanyIds.map(companyId => ({
      user_id: collaboratorProfileId,
      company_id: companyId,
      role: 'user',
      is_active: true
    }))

    const { error: insertError } = await supabase
      .from('user_companies')
      .insert(userCompaniesInserts)

    if (insertError) {
      logger.error('Failed to create user_companies entries', insertError, createRequestContext(request))
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
      newCompaniesShared: newCompanyIds.length,
      alreadySharedCount: existingCompanyIds.length,
      totalCompanies: ownedCompanyIds.length
    })

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to invite collaborator', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/profiles/[profileId]/collaborators - Get all collaborators
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params

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
      return NextResponse.json([])
    }

    // Get all distinct collaborators across all owned companies
    const { data: collaborations, error: fetchError } = await supabase
      .from('user_companies')
      .select('user_id, company_id')
      .in('company_id', ownedCompanyIds)
      .eq('role', 'user')

    if (fetchError) {
      logger.error('Failed to fetch collaborations', fetchError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 })
    }

    if (!collaborations || collaborations.length === 0) {
      return NextResponse.json([])
    }

    // Group by user_id and count companies
    const collaboratorMap = new Map<string, number>()
    collaborations.forEach(collab => {
      const count = collaboratorMap.get(collab.user_id) || 0
      collaboratorMap.set(collab.user_id, count + 1)
    })

    const collaboratorIds = Array.from(collaboratorMap.keys())

    // Fetch collaborator profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', collaboratorIds)

    if (profilesError) {
      logger.error('Failed to fetch profiles', profilesError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to fetch collaborator details' }, { status: 500 })
    }

    // Combine data
    const collaborators = profiles?.map(profile => ({
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      companiesCount: collaboratorMap.get(profile.id) || 0
    })) || []

    return NextResponse.json(collaborators)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to fetch collaborators', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

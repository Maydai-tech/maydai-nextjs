import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hasAccessToCompany } from '@/lib/permissions'
import { isOwner, hasAccessToResource } from '@/lib/collaborators'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { getUserByEmail, inviteUserByEmail, createProfileForUser } from '@/lib/invite-user'
import { sendRegistryCollaborationInvite } from '@/lib/email/mailjet'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    'La variable d\'environnement SUPABASE_SERVICE_ROLE_KEY doit être définie'
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
    const userIsOwner = await isOwner(user.id, 'company', companyId, supabase)
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
      // User doesn't exist, create them (email will be sent via Mailjet)
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

    // Check if collaborator already has access to this company
    const { data: existingCollaboration } = await supabase
      .from('user_companies')
      .select('id, role')
      .eq('user_id', collaboratorProfileId)
      .eq('company_id', companyId)
      .single()

    if (existingCollaboration) {
      if (existingCollaboration.role === 'owner') {
        return NextResponse.json({ error: 'This user is already an owner of this company' }, { status: 400 })
      }
      return NextResponse.json({ error: 'This user is already a collaborator on this company' }, { status: 400 })
    }

    // Create user_companies entry with default role 'user'
    const { error: insertError } = await supabase
      .from('user_companies')
      .insert({
        user_id: collaboratorProfileId,
        company_id: companyId,
        role: 'user',
        added_by: user.id
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

    // Get inviter's profile for full name
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    const inviterFullName = inviterProfile?.first_name && inviterProfile?.last_name
      ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
      : 'Équipe MaydAI'

    // Envoi email via Mailjet (non-bloquant, ne fait pas échouer la création)
    sendRegistryCollaborationInvite({
      collaboratorEmail: email,
      collaboratorFirstName: firstName,
      inviterName: inviterFullName,
      companyName: company?.name || 'votre entreprise'
    }).catch(err => {
      console.error('Failed to send invitation email:', err)
      // Continue silently, email failure doesn't block user creation
    })

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

    // Verify user has access to this company (owner, account-level collaborator, or registry-level collaborator)
    const hasAccess = await hasAccessToResource(user.id, 'company', companyId, supabase)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get collaborators at company level
    const { data: userCompanies, error: fetchError } = await supabase
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
      .eq('company_id', companyId)

    if (fetchError) {
      logger.error('Failed to fetch user_companies', fetchError, createRequestContext(request))
      return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 })
    }

    // Find owner from userCompanies
    const ownerEntry = userCompanies?.find(uc => uc.role === 'owner')
    const ownerId = ownerEntry?.user_id

    // Get collaborators at profile level (account-level access)
    const profileCollaborators = []
    if (ownerId) {
      const { data: userProfiles } = await supabase
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

      if (userProfiles) {
        profileCollaborators.push(...userProfiles)
      }
    }

    // Combine and format the results
    const companyCollaborators = (userCompanies || [])
      .filter(uc => uc.role !== 'owner')
      .map(uc => ({
        id: uc.user_id,
        firstName: (uc.profiles as any)?.first_name,
        lastName: (uc.profiles as any)?.last_name,
        role: uc.role,
        scope: 'registry' as const,
        addedAt: uc.created_at
      }))

    const accountCollaborators = profileCollaborators.map(up => ({
      id: up.invited_user_id,
      firstName: (up.profiles as any)?.first_name,
      lastName: (up.profiles as any)?.last_name,
      role: up.role,
      scope: 'account' as const,
      addedAt: up.created_at
    }))

    // Merge both lists, account-level takes precedence
    const allCollaborators = [...accountCollaborators, ...companyCollaborators]

    // Remove duplicates (account-level takes precedence)
    const uniqueCollaborators = allCollaborators.reduce((acc, collab) => {
      const existing = acc.find(c => c.id === collab.id)
      if (!existing) {
        acc.push(collab)
      } else if (collab.scope === 'account' && existing.scope === 'registry') {
        // Replace registry with account if both exist
        const index = acc.findIndex(c => c.id === collab.id)
        acc[index] = collab
      }
      return acc
    }, [] as typeof allCollaborators)

    // Fetch emails from auth.users for all collaborators using service role key
    const collaboratorIds = uniqueCollaborators.map(c => c.id)
    const emailsMap = new Map<string, string>()

    if (collaboratorIds.length > 0) {
      // Create admin client with service role key
      const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      // Fetch emails using admin client
      for (const collaboratorId of collaboratorIds) {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(collaboratorId)
          if (authUser?.user?.email) {
            emailsMap.set(collaboratorId, authUser.user.email)
          }
        } catch (error) {
          // Skip if we can't get the email for this user
          logger.error(`Failed to fetch email for user ${collaboratorId}`, error, createRequestContext(request))
        }
      }
    }

    // Add emails to collaborators
    const collaboratorsWithEmails = uniqueCollaborators.map(collab => ({
      ...collab,
      email: emailsMap.get(collab.id)
    }))

    return NextResponse.json(collaboratorsWithEmails)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to fetch company collaborators', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create Supabase client with the user's token
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check access via user_companies (owner or user) + user_profiles hierarchy
    // 1. Check direct access via user_companies
    const { data: userCompany } = await supabase
      .from('user_companies')
      .select('role')
      .eq('company_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    let hasAccess = !!userCompany

    // 2. If no direct access, check profile-level access
    if (!hasAccess) {
      // Get the owner of this company
      const { data: ownerRecord } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', id)
        .eq('role', 'owner')
        .maybeSingle()

      if (ownerRecord) {
        const { data: profileAccess } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('inviter_user_id', ownerRecord.user_id)
          .eq('invited_user_id', user.id)
          .maybeSingle()

        hasAccess = !!profileAccess
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this company' }, { status: 403 })
    }

    // Fetch the specific company
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()

    if (companyError) {
      if (companyError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Error fetching company' }, { status: 500 })
    }

    // Include user's role in the response
    return NextResponse.json({
      ...companyData,
      role: userCompany?.role || null
    })

  } catch (error) {
    console.error('Error in company API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
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

    // Create Supabase client with the user's token
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verify user is owner of this company
    const userIsOwner = await isOwner(user.id, 'company', companyId, supabase)
    if (!userIsOwner) {
      return NextResponse.json({ error: 'Only company owners can update company information' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { name, industry, city, country } = body

    // Validate at least one field is provided
    if (!name && !industry && !city && !country) {
      return NextResponse.json({ error: 'At least one field must be provided' }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: Record<string, string> = {}
    if (name !== undefined) updateData.name = name
    if (industry !== undefined) updateData.industry = industry
    if (city !== undefined) updateData.city = city
    if (country !== undefined) updateData.country = country

    // Update the company
    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId)
      .select()
      .single()

    if (updateError) {
      const context = createRequestContext(request)
      logger.error('Failed to update company', updateError, {
        ...context,
        companyId
      })
      return NextResponse.json({ error: 'Error updating company' }, { status: 500 })
    }

    const context = createRequestContext(request)
    logger.info('Company updated successfully', {
      ...context,
      companyId,
      updatedFields: Object.keys(updateData),
      updatedBy: user.email
    })

    return NextResponse.json(updatedCompany)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Company PUT API error', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    // Create Supabase client with the user's token
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verify user is owner of this company
    const userIsOwner = await isOwner(user.id, 'company', companyId, supabase)
    if (!userIsOwner) {
      return NextResponse.json({ error: 'Only company owners can delete a company' }, { status: 403 })
    }

    // Fetch company info for logging
    const { data: existingCompany, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    if (companyError) {
      if (companyError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Error fetching company' }, { status: 500 })
    }

    const context = createRequestContext(request)
    logger.info('Deleting company and all associated data', {
      ...context,
      companyId,
      companyName: existingCompany.name,
      deletedBy: user.email
    })

    // Get all usecases for this company
    const { data: usecases } = await supabase
      .from('usecases')
      .select('id')
      .eq('company_id', companyId)

    // Delete all usecase_responses for each usecase
    if (usecases && usecases.length > 0) {
      for (const usecase of usecases) {
        const { error: deleteResponsesError } = await supabase
          .from('usecase_responses')
          .delete()
          .eq('usecase_id', usecase.id)

        if (deleteResponsesError) {
          logger.error('Failed to delete usecase responses', deleteResponsesError, {
            ...context,
            companyId,
            usecaseId: usecase.id
          })
          return NextResponse.json({ error: 'Error deleting usecase responses' }, { status: 500 })
        }
      }

      // Delete all usecases
      const { error: deleteUsecasesError } = await supabase
        .from('usecases')
        .delete()
        .eq('company_id', companyId)

      if (deleteUsecasesError) {
        logger.error('Failed to delete usecases', deleteUsecasesError, {
          ...context,
          companyId
        })
        return NextResponse.json({ error: 'Error deleting usecases' }, { status: 500 })
      }
    }

    // Update profiles that reference this company (set to NULL)
    const { error: updateProfilesError } = await supabase
      .from('profiles')
      .update({
        company_id: null,
        current_company_id: null
      })
      .or(`company_id.eq.${companyId},current_company_id.eq.${companyId}`)

    if (updateProfilesError) {
      logger.error('Failed to update profiles', updateProfilesError, {
        ...context,
        companyId
      })
      return NextResponse.json({ error: 'Error updating profiles' }, { status: 500 })
    }

    // Delete all user_companies relations
    const { error: deleteUserCompaniesError } = await supabase
      .from('user_companies')
      .delete()
      .eq('company_id', companyId)

    if (deleteUserCompaniesError) {
      logger.error('Failed to delete user_companies relations', deleteUserCompaniesError, {
        ...context,
        companyId
      })
      return NextResponse.json({ error: 'Error deleting user_companies relations' }, { status: 500 })
    }

    // Finally, delete the company itself
    const { error: deleteCompanyError } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId)

    if (deleteCompanyError) {
      logger.error('Failed to delete company', deleteCompanyError, {
        ...context,
        companyId
      })
      return NextResponse.json({ error: 'Error deleting company' }, { status: 500 })
    }

    logger.info('Successfully deleted company and all associated data', {
      ...context,
      companyId,
      companyName: existingCompany.name,
      deletedBy: user.email,
      usecasesDeleted: usecases?.length || 0
    })

    // Return 204 No Content on successful deletion
    return new NextResponse(null, { status: 204 })

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Company DELETE API error', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
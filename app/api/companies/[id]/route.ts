import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOwner } from '@/lib/collaborators'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { deleteCompanyCascade } from '@/lib/account-deletion'
import { updateUseCaseRegistryResponses } from '@/lib/registry-sync'
import { validateIndustrySelection } from '@/lib/validation/industries'
import { RegistrySchema } from '@/lib/validations/registry'
import { calculateRegistryCompletenessScore } from '@/lib/validations/registry-completeness'

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
    let profileRole: string | null = null

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
          .select('id, role')
          .eq('inviter_user_id', ownerRecord.user_id)
          .eq('invited_user_id', user.id)
          .maybeSingle()

        hasAccess = !!profileAccess
        if (profileAccess) {
          profileRole = profileAccess.role
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this company' }, { status: 403 })
    }

    // Fetch the specific company (completeness_score requis pour l'UI registre)
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select(
        'id, name, industry, sub_category_id, city, country, type, maydai_as_registry, is_centralized_registry, completeness_score, created_at, updated_at'
      )
      .eq('id', id)
      .single()

    if (companyError) {
      if (companyError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Error fetching company' }, { status: 500 })
    }

    const { count: memberCount } = await supabase
      .from('user_companies')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', id)

    // Include user's role in the response
    // Priority: direct role from user_companies, then profile-level role
    return NextResponse.json({
      ...companyData,
      role: userCompany?.role || profileRole || null,
      has_collaborators: (memberCount ?? 0) > 1,
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

    const registryUpdatePayload: Record<string, unknown> = {}
    if (body.name !== undefined) registryUpdatePayload.name = body.name
    if (body.city !== undefined) registryUpdatePayload.city = body.city
    if (body.country !== undefined) registryUpdatePayload.country = body.country
    if (body.type !== undefined) registryUpdatePayload.type = body.type
    if (body.role !== undefined) registryUpdatePayload.role = body.role
    if (body.maydai_as_registry !== undefined) {
      registryUpdatePayload.maydai_as_registry = body.maydai_as_registry
    }
    if (body.industry !== undefined) {
      registryUpdatePayload.industry = body.industry
    } else if (body.mainIndustryId !== undefined) {
      registryUpdatePayload.industry = body.mainIndustryId
    }
    if (body.sub_category_id !== undefined) {
      registryUpdatePayload.sub_category_id = body.sub_category_id
    } else if (body.subCategoryId !== undefined) {
      registryUpdatePayload.sub_category_id = body.subCategoryId
    }

    const validation = RegistrySchema.partial().safeParse(registryUpdatePayload)
    if (!validation.success) {
      return NextResponse.json(validation.error.flatten().fieldErrors, { status: 400 })
    }

    const { name, city, country, type, maydai_as_registry, mainIndustryId, subCategoryId } = body

    // Validate at least one field is provided
    const hasIndustryUpdate = mainIndustryId !== undefined || subCategoryId !== undefined
    if (!name && !city && !country && !type && maydai_as_registry === undefined && !hasIndustryUpdate) {
      return NextResponse.json({ error: 'At least one field must be provided' }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: Record<string, string | boolean | number | null> = {}
    if (name !== undefined) updateData.name = name
    if (city !== undefined) updateData.city = city
    if (country !== undefined) updateData.country = country
    if (type !== undefined) updateData.type = type
    if (maydai_as_registry !== undefined) updateData.maydai_as_registry = maydai_as_registry

    // Map new business fields:
    // - mainIndustryId -> companies.industry
    // - subCategoryId  -> companies.sub_category_id
    //
    // Backward compatibility note:
    // We intentionally do NOT accept a raw `industry` free-text field anymore.
    // Clients must send (mainIndustryId, subCategoryId) when updating the sector.
    if (hasIndustryUpdate) {
      const mainIsNullish = mainIndustryId === null || mainIndustryId === ''
      const subIsNullish = subCategoryId === null || subCategoryId === ''

      // Allow clearing both at once (e.g., admin wants to force re-selection)
      if (mainIsNullish && subIsNullish) {
        updateData.industry = null
        updateData.sub_category_id = null
      } else {
        if (typeof mainIndustryId !== 'string' || typeof subCategoryId !== 'string') {
          return NextResponse.json(
            { error: 'Les champs mainIndustryId et subCategoryId doivent être des chaînes (ou null pour effacer).' },
            { status: 400 }
          )
        }
        const main = mainIndustryId.trim()
        const sub = subCategoryId.trim()
        if (!main || !sub) {
          return NextResponse.json(
            { error: 'Les champs mainIndustryId et subCategoryId doivent être fournis ensemble (ou tous deux null/vides pour effacer).' },
            { status: 400 }
          )
        }

        const validation = validateIndustrySelection(main, sub)
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error || 'Secteur d\'activité invalide' }, { status: 400 })
        }

        updateData.industry = main
        updateData.sub_category_id = sub
      }
    }

    // --- NOUVEAU MOTEUR DE SCORING ---
    // 1. Récupération de l'état actuel pour fusion (mise à jour partielle)
    const { data: currentCompany } = await supabase
      .from('companies')
      .select('name, city, country, type, industry, sub_category_id, is_centralized_registry, maydai_as_registry')
      .eq('id', companyId)
      .single()

    // 2. Récupération du SIREN profil
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('siren')
      .eq('id', user.id)
      .single()

    // 3. Vérification de la collaboration (Si > 1, cela veut dire qu'il y a le propriétaire + au moins 1 invité)
    const { count: userCount } = await supabase
      .from('user_companies')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    // Fusion des données existantes avec les nouvelles valeurs entrantes
    const mergedData = {
      ...currentCompany,
      ...updateData,
    }

    // Synchronisation des flags de registre centralisé
    const isCentralized =
      mergedData.is_centralized_registry === true || mergedData.maydai_as_registry === true

    updateData.completeness_score = calculateRegistryCompletenessScore({
      name: mergedData.name,
      industry: mergedData.industry,
      sub_category_id: mergedData.sub_category_id,
      city: mergedData.city,
      country: mergedData.country,
      type: mergedData.type,
      siren: currentProfile?.siren,
      has_collaborators: (userCount || 0) > 1,
      is_centralized_registry: isCentralized,
    })

    // Si le flag legacy a été mis à jour, on synchronise le nouveau flag propre
    if (updateData.maydai_as_registry !== undefined) {
      updateData.is_centralized_registry = isCentralized
    }
    // ---------------------------------

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

    // If maydai_as_registry was updated, synchronize all use case responses for question E5.N9.Q7
    let useCasesUpdated = 0
    let registryScoresRecalculated = 0
    if (maydai_as_registry !== undefined) {
      const proto = request.headers.get('x-forwarded-proto') ?? 'http'
      const host = request.headers.get('host') ?? 'localhost:3000'
      const scoreRecalcBaseUrl = `${proto}://${host}`

      const syncResult = await updateUseCaseRegistryResponses(
        companyId,
        maydai_as_registry,
        user.email || 'unknown',
        supabase,
        {
          scoreRecalcToken: token,
          scoreRecalcBaseUrl,
        }
      )

      if (syncResult.success) {
        useCasesUpdated = syncResult.updatedCount
        registryScoresRecalculated = syncResult.scoresRecalculated
        logger.info('Use case registry responses synchronized', {
          ...context,
          companyId,
          useCasesUpdated,
          registryScoresRecalculated,
          maydaiAsRegistry: maydai_as_registry
        })
      } else {
        logger.error('Failed to synchronize use case registry responses', syncResult.error, {
          ...context,
          companyId,
          maydaiAsRegistry: maydai_as_registry
        })
        // Don't fail the entire request, but log the error
      }
    }

    const { count: memberCountAfterUpdate } = await supabase
      .from('user_companies')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    return NextResponse.json({
      ...updatedCompany,
      role: 'owner',
      has_collaborators: (memberCountAfterUpdate ?? 0) > 1,
      useCasesUpdated,
      registryScoresRecalculated,
    })

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

    // Create Supabase client with the user's token for auth check
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

    // Cascade: usecase_responses → usecases → NULL profiles → user_companies → company
    // (logique partagée avec la suppression de compte, cf. lib/account-deletion.ts)
    try {
      await deleteCompanyCascade(supabase, companyId)
    } catch (cascadeError) {
      logger.error('Failed to delete company and associated data', cascadeError, {
        ...context,
        companyId
      })
      return NextResponse.json({ error: 'Error deleting company' }, { status: 500 })
    }

    logger.info('Successfully deleted company and all associated data', {
      ...context,
      companyId,
      companyName: existingCompany.name,
      deletedBy: user.email
    })

    // Return 204 No Content on successful deletion
    return new NextResponse(null, { status: 204 })

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Company DELETE API error', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
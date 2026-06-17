import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { canCreateCompany } from '@/lib/collaborators'
import { validateIndustrySelection } from '@/lib/validation/industries'
import { RegistrySchema } from '@/lib/validations/registry'
import {
  LEAD_FUNNEL_STAGE,
  updateLeadFunnelStage,
} from '@/lib/leads/lead-funnel-service'
import {
  CompanyAccessError,
  getUserAccessibleCompanies,
} from '@/lib/services/companyAccessService'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

// Service role client for admin operations (bypasses RLS)
const getServiceRoleClient = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
  }
  return createClient(supabaseUrl!, supabaseServiceRoleKey)
}

export async function GET(request: NextRequest) {
  try {
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

    let companyIdsArray: string[]
    let roleMap: Map<string, string>

    try {
      const access = await getUserAccessibleCompanies(user.id, supabase)
      companyIdsArray = access.companyIdsArray
      roleMap = access.roleMap
    } catch (error) {
      if (error instanceof CompanyAccessError) {
        return NextResponse.json({ error: 'Error fetching user companies' }, { status: 500 })
      }
      throw error
    }

    if (companyIdsArray.length === 0) {
      return NextResponse.json([])
    }

    // Fetch companies using the .in() method
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .in('id', companyIdsArray)

    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      return NextResponse.json({ error: 'Error fetching companies' }, { status: 500 })
    }

    // Enrich companies with user role
    const companiesWithRole = companies?.map(company => ({
      ...company,
      role: roleMap.get(company.id)
    })) || []

    return NextResponse.json(companiesWithRole)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to fetch companies', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    // Vérifier l'utilisateur
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user can create companies
    const canCreate = await canCreateCompany(user.id, supabase)
    if (!canCreate) {
      return NextResponse.json({
        error: 'You do not have permission to create new companies.'
      }, { status: 403 })
    }

    const body = await request.json()

    const registryPayload: Record<string, unknown> = {
      name: body.name,
      city: typeof body.city === 'string' ? body.city : '',
      country: typeof body.country === 'string' ? body.country : '',
      maydai_as_registry: body.maydai_as_registry ?? false,
    }
    if (body.type !== undefined) registryPayload.type = body.type
    if (body.role !== undefined) registryPayload.role = body.role
    const industry = body.industry ?? body.mainIndustryId
    if (industry !== undefined) registryPayload.industry = industry
    const subCategory = body.sub_category_id ?? body.subCategoryId
    if (subCategory !== undefined) registryPayload.sub_category_id = subCategory

    const validation = RegistrySchema.partial({
      industry: true,
      city: true,
      country: true,
      sub_category_id: true,
      type: true,
      role: true,
      maydai_as_registry: true,
    })
      .required({ name: true })
      .safeParse(registryPayload)

    if (!validation.success) {
      return NextResponse.json(validation.error.flatten().fieldErrors, { status: 400 })
    }

    const { mainIndustryId, subCategoryId } = body
    const validated = validation.data

    // Use service role client for write operations (bypasses RLS)
    // Authentication is already verified above, so this is safe
    const serviceClient = getServiceRoleClient()

    // ----------------------------
    // Industry selection resolution
    // ----------------------------
    // Business rules:
    // - Payload may optionally include mainIndustryId + subCategoryId.
    // - If absent, derive defaults from the "Global Owner" profile:
    //   1) Check whether caller is an invited user in user_profiles (invited_user_id = user.id),
    //      take most recent (created_at DESC).
    //   2) If found, global owner = inviter_user_id else global owner = user.id.
    //   3) Select (industry, sub_category_id) from profiles for that global owner.
    let resolvedMainIndustryId: string | null = null
    let resolvedSubCategoryId: string | null = null

    const payloadHasIndustry =
      typeof mainIndustryId === 'string' && mainIndustryId.trim().length > 0 &&
      typeof subCategoryId === 'string' && subCategoryId.trim().length > 0

    if (payloadHasIndustry) {
      const validation = validateIndustrySelection(mainIndustryId.trim(), subCategoryId.trim())
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error || 'Secteur d\'activité invalide' }, { status: 400 })
      }
      resolvedMainIndustryId = mainIndustryId.trim()
      resolvedSubCategoryId = subCategoryId.trim()
    } else if (mainIndustryId !== undefined || subCategoryId !== undefined) {
      // One provided without the other (or non-string): reject explicitly
      return NextResponse.json(
        { error: 'Les champs mainIndustryId et subCategoryId doivent être fournis ensemble (ou omis).' },
        { status: 400 }
      )
    } else {
      // Fallback Multi-Tenant: resolve global owner and read their profile industry defaults
      const { data: invitation, error: invitationError } = await serviceClient
        .from('user_profiles')
        .select('inviter_user_id')
        .eq('invited_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (invitationError) {
        const context = createRequestContext(request)
        logger.error('Failed to resolve user invitation (user_profiles)', invitationError, {
          ...context,
          invitedUserId: user.id,
        })
        return NextResponse.json({ error: 'Erreur lors de la résolution du propriétaire du compte' }, { status: 500 })
      }

      const globalOwnerId = invitation?.inviter_user_id || user.id

      const { data: ownerProfile, error: ownerProfileError } = await serviceClient
        .from('profiles')
        .select('industry, sub_category_id')
        .eq('id', globalOwnerId)
        .maybeSingle()

      if (ownerProfileError) {
        const context = createRequestContext(request)
        logger.error('Failed to fetch global owner profile (industry defaults)', ownerProfileError, {
          ...context,
          globalOwnerId,
          invitedUserId: user.id,
        })
        return NextResponse.json({ error: 'Erreur lors de la récupération des préférences secteur' }, { status: 500 })
      }

      resolvedMainIndustryId =
        typeof ownerProfile?.industry === 'string' && ownerProfile.industry.trim()
          ? ownerProfile.industry.trim()
          : null
      resolvedSubCategoryId =
        typeof ownerProfile?.sub_category_id === 'string' && ownerProfile.sub_category_id.trim()
          ? ownerProfile.sub_category_id.trim()
          : null
    }

    // Build insert data
    const insertData: {
      name: string
      city?: string
      country?: string
      maydai_as_registry: boolean
      type?: string
      industry?: string | null
      sub_category_id?: string | null
      role?: string
    } = {
      name: validated.name,
      maydai_as_registry: validated.maydai_as_registry ?? false,
      industry: resolvedMainIndustryId,
      sub_category_id: resolvedSubCategoryId,
    }
    if (validated.city !== undefined) {
      insertData.city = validated.city
    }
    if (validated.country !== undefined) {
      insertData.country = validated.country
    }
    if (validated.type !== undefined) {
      insertData.type = validated.type
    }
    if (validated.role !== undefined) {
      insertData.role = validated.role
    }

    // Créer la compagnie
    const { data, error } = await serviceClient
      .from('companies')
      .insert([insertData])
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: "Erreur lors de la création du registre" }, { status: 500 })
    }

    // Créer une relation user_companies avec le rôle owner
    const { error: userCompanyError } = await serviceClient
      .from('user_companies')
      .insert([{
        user_id: user.id,
        company_id: data.id,
        role: 'owner',
        added_by: user.id
      }])

    if (userCompanyError) {
      console.error("🚨 SUPABASE DB ERROR (user_companies):", userCompanyError);
      return NextResponse.json({ error: "Erreur lors de la création de la relation utilisateur-entreprise" }, { status: 500 })
    }

    // Mettre à jour le current_company_id dans le profil
    await serviceClient
      .from('profiles')
      .update({ current_company_id: data.id })
      .eq('id', user.id)

    try {
      await updateLeadFunnelStage(
        user.id,
        LEAD_FUNNEL_STAGE.REGISTRY,
        serviceClient
      )
    } catch (leadFunnelError) {
      console.error('[LeadFunnel] Échec stage REGISTRY (non bloquant):', leadFunnelError)
    }

    return NextResponse.json({ id: data.id })
  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to create company', error, context)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 
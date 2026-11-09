import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { validateSIREN, cleanSIREN } from '@/lib/validation/siren'
import { validateIndustrySelection } from '@/lib/validation/industries'
import { calculateAndSaveProfileCompleteness } from '@/lib/services/profileScoreService'
import { syncProfileSirenToRegistries } from '@/lib/services/registryScoreService'
import {
  calculateAndPersistEngagementScore,
  calculateAndPersistEntityTrustScore,
  detectAndRecordSirenCollision,
} from '@/lib/services/governanceScoreService'
import { ProfileTypeSchema } from '@/lib/validations/governance-scores'

const ProfileUpdateSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  companyName: z.string().optional().nullable(),
  mainIndustryId: z.string(),
  subCategoryId: z.string(),
  phone: z.string().optional().nullable(),
  siren: z.string().optional().nullable(),
  profileType: ProfileTypeSchema.optional(),
  nafCode: z.string().optional().nullable(),
  sirenVerifiedPappers: z.boolean().optional(),
  academicInstitution: z.string().optional().nullable(),
  academicDepartment: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'first_name, last_name, company_name, industry, sub_category_id, phone, siren, profile_type, naf_code, siren_verified_pappers, academic_institution, academic_department, entity_trust_score, engagement_score, siren_collision_flag, monthly_reset_count, last_reset_at'
      )
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Erreur lors de la récupération du profil' }, { status: 500 })
    }

    return NextResponse.json({
      email: user.email,
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      companyName: profile?.company_name || '',
      mainIndustryId: profile?.industry || '',
      subCategoryId: profile?.sub_category_id || '',
      phone: profile?.phone || '',
      siren: profile?.siren || '',
      profile_type: profile?.profile_type ?? 'company',
      naf_code: profile?.naf_code ?? null,
      siren_verified_pappers: profile?.siren_verified_pappers ?? false,
      academic_institution: profile?.academic_institution ?? null,
      academic_department: profile?.academic_department ?? null,
      entity_trust_score: profile?.entity_trust_score ?? 50,
      engagement_score: profile?.engagement_score ?? 0,
      siren_collision_flag: profile?.siren_collision_flag ?? false,
      monthly_reset_count: profile?.monthly_reset_count ?? 0,
      last_reset_at: profile?.last_reset_at ?? null,
    })

  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    const rawBody = await request.json()
    const parsedBody = ProfileUpdateSchema.safeParse(rawBody)
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Payload invalide', details: parsedBody.error.flatten() },
        { status: 400 }
      )
    }

    const {
      firstName,
      lastName,
      companyName,
      mainIndustryId,
      subCategoryId,
      phone,
      siren,
      profileType,
      nafCode,
      sirenVerifiedPappers,
      academicInstitution,
      academicDepartment,
    } = parsedBody.data

    const academicInstitutionName = academicInstitution?.trim() || ''
    const resolvedCompanyName =
      companyName?.trim() ||
      (profileType === 'academic' ? academicInstitutionName : '')

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('siren')
      .eq('id', user.id)
      .single()

    const previousSiren = existingProfile?.siren?.trim() || null
    const nextSiren = siren ? cleanSIREN(siren) : null
    const sirenChanged = 'siren' in rawBody && nextSiren !== previousSiren

    if (!firstName.trim() || !lastName.trim() || !resolvedCompanyName || !mainIndustryId.trim() || !subCategoryId.trim()) {
      return NextResponse.json(
        { error: 'Les champs prénom, nom, entreprise, secteur principal et sous-catégorie sont obligatoires' },
        { status: 400 }
      )
    }

    // Validate industry selection
    const industryValidation = validateIndustrySelection(mainIndustryId, subCategoryId)
    if (!industryValidation.valid) {
      return NextResponse.json(
        { error: industryValidation.error || 'Secteur d\'activité invalide' },
        { status: 400 }
      )
    }

    // Validate SIREN if provided
    if (siren) {
      const cleanedSiren = cleanSIREN(siren)
      if (cleanedSiren.length > 0 && !validateSIREN(cleanedSiren)) {
        return NextResponse.json(
          { error: 'Numéro SIREN invalide' },
          { status: 400 }
        )
      }
    }

    // Update profile
    // Store mainIndustryId in industry field and subCategoryId in sub_category_id field
    const profileUpdate: Record<string, unknown> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company_name: resolvedCompanyName,
      industry: mainIndustryId.trim(),
      sub_category_id: subCategoryId.trim(),
      phone: phone?.trim() || null,
      siren: siren ? cleanSIREN(siren) : null,
      updated_at: new Date().toISOString(),
    }
    if (profileType) profileUpdate.profile_type = profileType
    if (nafCode !== undefined) profileUpdate.naf_code = nafCode?.trim() || null
    if (typeof sirenVerifiedPappers === 'boolean') {
      profileUpdate.siren_verified_pappers = sirenVerifiedPappers
    }
    if (academicInstitution !== undefined) {
      profileUpdate.academic_institution = academicInstitution?.trim() || null
    }
    if (academicDepartment !== undefined) {
      profileUpdate.academic_department = academicDepartment?.trim() || null
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      )
    }

    await calculateAndSaveProfileCompleteness(user.id, supabase)

    const cleanedSiren = nextSiren ?? ''
    if (sirenChanged) {
      try {
        await syncProfileSirenToRegistries(user.id, cleanedSiren)
      } catch (syncError) {
        console.error('[PATCH /api/profile] sync SIREN', syncError)
        return NextResponse.json(
          { error: syncError instanceof Error ? syncError.message : 'Erreur DB' },
          { status: 500 }
        )
      }
    }

    try {
      await detectAndRecordSirenCollision(user.id, cleanedSiren || null)
      await calculateAndPersistEntityTrustScore(user.id)
      await calculateAndPersistEngagementScore(user.id)
    } catch (scoreError) {
      console.error('[PATCH /api/profile] scores gouvernance', scoreError)
      return NextResponse.json(
        { error: scoreError instanceof Error ? scoreError.message : 'Erreur DB' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Profile PATCH error:', error)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

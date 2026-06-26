import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { validateSIREN, cleanSIREN } from '@/lib/validation/siren'
import { validateIndustrySelection } from '@/lib/validation/industries'
import { planIdSchema } from '@/lib/validations/pricing'
import { CompleteSignupSchema } from '@/lib/validations/signup'
import { calculateAndSaveProfileCompleteness, computeProfileCompletenessScoreFromRow } from '@/lib/services/profileScoreService'

const ACQUISITION_FIELD_MAX_LEN = 512

function sanitizeAcquisitionField(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') return null
  const t = value.trim()
  if (!t) return null
  return t.length > ACQUISITION_FIELD_MAX_LEN ? t.slice(0, ACQUISITION_FIELD_MAX_LEN) : t
}

/**
 * Complete signup API endpoint
 *
 * This endpoint is called after OTP verification to create/update the user profile
 * with additional signup information (name, company, industry, phone, SIREN).
 *
 * POST /api/auth/complete-signup
 *
 * Request body:
 * {
 *   firstName: string (required)
 *   lastName: string (required)
 *   companyName: string (required)
 *   mainIndustryId: string (required, custom industry ID)
 *   subCategoryId: string (required, custom sub-category ID)
 *   phone: string (required, min 10 digits)
 *   siren?: string (optional, validated with Luhn algorithm)
 *   gclid?, utm_source?, utm_medium?, utm_campaign?: string (optional, acquisition)
 * }
 *
 * Response:
 * - 200: { profile: Profile } - Profile created/updated successfully
 * - 400: { error: string } - Invalid request (missing fields, invalid data)
 * - 401: { error: string } - Unauthorized (not authenticated)
 * - 500: { error: string } - Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    // Parse request body
    const body = await request.json()

    const validation = CompleteSignupSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Payload invalide', details: validation.error.format() },
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
      gclid: rawGclid,
      utm_source: rawUtmSource,
      utm_medium: rawUtmMedium,
      utm_campaign: rawUtmCampaign,
      planIntent: rawPlanIntent,
    } = validation.data

    // Validation sectorielle uniquement si au moins un champ secteur est fourni (payload partiel autorisé)
    const hasIndustryInput =
      (mainIndustryId !== undefined && mainIndustryId !== '') ||
      (subCategoryId !== undefined && subCategoryId !== '')

    if (hasIndustryInput) {
      const industryValidation = validateIndustrySelection(
        mainIndustryId ?? '',
        subCategoryId ?? ''
      )
      if (!industryValidation.valid) {
        return NextResponse.json(
          { error: industryValidation.error || 'Secteur d\'activité invalide' },
          { status: 400 }
        )
      }
    }

    // Validate SIREN if provided
    let cleanedSiren: string | null = null
    if (siren) {
      if (typeof siren !== 'string') {
        return NextResponse.json(
          { error: 'Le SIREN doit être une chaîne de caractères' },
          { status: 400 }
        )
      }

      cleanedSiren = cleanSIREN(siren)

      if (cleanedSiren && !validateSIREN(cleanedSiren)) {
        return NextResponse.json(
          { error: 'Numéro SIREN invalide' },
          { status: 400 }
        )
      }
    }

    // Validate phone (optional)
    let cleanedPhone: string | null = null
    if (phone !== undefined && phone !== null && phone !== '') {
      if (typeof phone !== 'string') {
        return NextResponse.json(
          { error: 'Le numéro de téléphone doit être une chaîne de caractères' },
          { status: 400 }
        )
      }

      cleanedPhone = phone.replace(/[\s.-]/g, '')
      if (cleanedPhone.length > 0 && cleanedPhone.length < 10) {
        return NextResponse.json(
          { error: 'Le numéro de téléphone doit contenir au moins 10 chiffres' },
          { status: 400 }
        )
      }
    }

    const gclid = sanitizeAcquisitionField(rawGclid)
    const utm_source = sanitizeAcquisitionField(rawUtmSource)
    const utm_medium = sanitizeAcquisitionField(rawUtmMedium)
    const utm_campaign = sanitizeAcquisitionField(rawUtmCampaign)

    // Create/update profile with all signup data
    // Note: email is stored in auth.users, not in profiles table
    // Store mainIndustryId in industry field and subCategoryId in sub_category_id field
    const profileData = {
      id: user.id,
      first_name: firstName?.trim() ?? null,
      last_name: lastName?.trim() ?? null,
      company_name: companyName?.trim() ?? null,
      industry: mainIndustryId?.trim() ?? null,
      sub_category_id: subCategoryId?.trim() ?? null,
      phone: cleanedPhone,
      siren: cleanedSiren,
      gclid,
      utm_source,
      utm_medium,
      utm_campaign,
      completeness_score: computeProfileCompletenessScoreFromRow(
        {
          first_name: firstName?.trim() ?? null,
          last_name: lastName?.trim() ?? null,
          company_name: companyName?.trim() ?? null,
          industry: mainIndustryId?.trim() ?? null,
          sub_category_id: subCategoryId?.trim() ?? null,
          phone: cleanedPhone,
          siren: cleanedSiren,
        },
        false
      ),
      updated_at: new Date().toISOString(),
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'id',
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du profil' },
        { status: 500 }
      )
    }

    await calculateAndSaveProfileCompleteness(user.id, supabase)
    revalidatePath('/dashboard/registries')

    // Intention de forfait (URL ?plan=) — re-valider, ignorer si invalide (ne bloque pas l’inscription)
    if (rawPlanIntent !== undefined && rawPlanIntent !== null && rawPlanIntent !== '') {
      const planParsed = planIdSchema.safeParse(
        typeof rawPlanIntent === 'string' ? rawPlanIntent.trim() : rawPlanIntent
      )
      if (planParsed.success) {
        const { error: metaError } = await supabase.auth.updateUser({
          data: { signup_plan_intent: planParsed.data },
        })
        if (metaError) {
          console.error(
            '[complete-signup] Impossible d’enregistrer signup_plan_intent (non bloquant):',
            metaError
          )
        }
      }
    }

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error) {
    console.error('Complete signup error:', error)

    // Handle specific auth errors
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('JWT')) {
        return NextResponse.json(
          { error: 'Non autorisé' },
          { status: 401 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

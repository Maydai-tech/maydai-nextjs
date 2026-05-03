import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { sendGoogleAdsConversion } from '@/lib/google-ads/conversions'
import { validateSIREN, cleanSIREN } from '@/lib/validation/siren'
import { validateIndustrySelection } from '@/lib/validation/industries'

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
    } = body

    // Validate required fields
    if (!firstName || typeof firstName !== 'string' || firstName.trim() === '') {
      return NextResponse.json(
        { error: 'Le prénom est obligatoire' },
        { status: 400 }
      )
    }

    if (!lastName || typeof lastName !== 'string' || lastName.trim() === '') {
      return NextResponse.json(
        { error: 'Le nom est obligatoire' },
        { status: 400 }
      )
    }

    if (!companyName || typeof companyName !== 'string' || companyName.trim() === '') {
      return NextResponse.json(
        { error: 'Le nom de l\'entreprise est obligatoire' },
        { status: 400 }
      )
    }

    // Validate industry selection
    if (!mainIndustryId || typeof mainIndustryId !== 'string' || mainIndustryId.trim() === '') {
      return NextResponse.json(
        { error: 'Le secteur d\'activité principal est obligatoire' },
        { status: 400 }
      )
    }

    if (!subCategoryId || typeof subCategoryId !== 'string' || subCategoryId.trim() === '') {
      return NextResponse.json(
        { error: 'La sous-catégorie est obligatoire' },
        { status: 400 }
      )
    }

    // Validate industry and sub-category combination
    const industryValidation = validateIndustrySelection(mainIndustryId, subCategoryId)
    if (!industryValidation.valid) {
      return NextResponse.json(
        { error: industryValidation.error || 'Secteur d\'activité invalide' },
        { status: 400 }
      )
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
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company_name: companyName.trim(),
      industry: mainIndustryId.trim(),
      sub_category_id: subCategoryId.trim(),
      phone: cleanedPhone,
      siren: cleanedSiren,
      gclid,
      utm_source,
      utm_medium,
      utm_campaign,
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

    if (gclid) {
      const emailForConversion =
        (user.email?.trim().toLowerCase() ||
          (typeof body.email === 'string' ? body.email.trim().toLowerCase() : '')) ||
        ''
      void (async () => {
        try {
          await sendGoogleAdsConversion({
            clickId: gclid,
            conversionName: 'hors connexion (importation)',
            conversionValue: 0,
            ...(emailForConversion ? { email: emailForConversion } : {}),
          })
        } catch (err) {
          console.error(
            '[complete-signup] Google Ads offline conversion (non bloquant):',
            err
          )
        }
      })()
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

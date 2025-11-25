import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { validateSIREN, cleanSIREN } from '@/lib/validation/siren'
import { isValidNAFSectorCode } from '@/lib/constants/naf-sectors'

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
 *   industry: string (required, NAF sector code)
 *   phone?: string (optional)
 *   siren?: string (optional, validated with Luhn algorithm)
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
    const { firstName, lastName, companyName, industry, phone, siren } = body

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

    if (!industry || typeof industry !== 'string' || industry.trim() === '') {
      return NextResponse.json(
        { error: 'Le secteur d\'activité est obligatoire' },
        { status: 400 }
      )
    }

    // Validate industry code
    if (!isValidNAFSectorCode(industry)) {
      return NextResponse.json(
        { error: 'Secteur d\'activité invalide' },
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

    // Validate phone if provided
    let cleanedPhone: string | null = null
    if (phone) {
      if (typeof phone !== 'string') {
        return NextResponse.json(
          { error: 'Le téléphone doit être une chaîne de caractères' },
          { status: 400 }
        )
      }

      // Clean phone: remove spaces, dots, dashes
      cleanedPhone = phone.replace(/[\s.-]/g, '')

      // Validate phone length (minimum 10 characters for French numbers)
      if (cleanedPhone.length < 10) {
        return NextResponse.json(
          { error: 'Le numéro de téléphone doit contenir au moins 10 chiffres' },
          { status: 400 }
        )
      }
    }

    // Create/update profile with all signup data
    const profileData = {
      id: user.id,
      email: user.email,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company_name: companyName.trim(),
      industry: industry.trim(),
      phone: cleanedPhone,
      siren: cleanedSiren,
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

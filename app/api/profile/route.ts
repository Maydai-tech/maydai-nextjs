import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { validateSIREN, cleanSIREN } from '@/lib/validation/siren'
import { validateIndustrySelection } from '@/lib/validation/industries'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, company_name, industry, sub_category_id, phone, siren')
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
      siren: profile?.siren || ''
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

    const body = await request.json()
    const { firstName, lastName, companyName, mainIndustryId, subCategoryId, phone, siren } = body

    // Validate required fields
    if (!firstName || !lastName || !companyName || !mainIndustryId || !subCategoryId) {
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
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company_name: companyName.trim(),
        industry: mainIndustryId.trim(),
        sub_category_id: subCategoryId.trim(),
        phone: phone?.trim() || null,
        siren: siren ? cleanSIREN(siren) : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
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

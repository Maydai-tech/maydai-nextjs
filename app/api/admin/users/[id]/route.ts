import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, isSuperAdmin, UserRole } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Vérifier l'authentification admin
  const authResult = await verifyAdminAuth(request)
  if (authResult.error) {
    return authResult.error
  }

  const currentUser = authResult.user!
  const { id } = await params
  const targetUserId = id

  try {
    const body = await request.json()
    const { role, company_ids, add_company_id, remove_company_id } = body

    // Créer le client Supabase admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupérer l'utilisateur cible
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', targetUserId)
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Vérifications des permissions
    if (role !== undefined) {
      const newRole = role as UserRole
      const targetCurrentRole = targetProfile.role as UserRole

      // Empêcher un admin de se retirer ses propres droits admin
      if (targetUserId === currentUser.id && 
          (targetCurrentRole === 'admin' || targetCurrentRole === 'super_admin') &&
          newRole === 'user') {
        return NextResponse.json(
          { error: 'You cannot remove your own admin privileges' },
          { status: 400 }
        )
      }
    }

    // Préparer les données de mise à jour du profil
    const updateData: any = {}
    if (role !== undefined) {
      updateData.role = role
    }

    // Gérer les associations d'entreprises
    if (add_company_id) {
      // Vérifier que l'entreprise existe
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('id', add_company_id)
        .single()

      if (companyError || !company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 400 }
        )
      }

      // Ajouter l'association dans user_companies
      const { error: insertError } = await supabase
        .from('user_companies')
        .upsert({
          user_id: targetUserId,
          company_id: add_company_id,
          role: 'user',
          is_active: true
        }, {
          onConflict: 'user_id,company_id'
        })

      if (insertError) {
        console.error('Error adding company association:', insertError)
        return NextResponse.json(
          { error: 'Failed to add company association' },
          { status: 500 }
        )
      }
    }

    if (remove_company_id) {
      // Supprimer l'association dans user_companies (soft delete)
      const { error: deleteError } = await supabase
        .from('user_companies')
        .update({ is_active: false })
        .eq('user_id', targetUserId)
        .eq('company_id', remove_company_id)

      if (deleteError) {
        console.error('Error removing company association:', deleteError)
        return NextResponse.json(
          { error: 'Failed to remove company association' },
          { status: 500 }
        )
      }
    }

    // Remplacer toutes les entreprises si company_ids est fourni
    if (company_ids !== undefined) {
      // Désactiver toutes les associations existantes
      await supabase
        .from('user_companies')
        .update({ is_active: false })
        .eq('user_id', targetUserId)

      // Ajouter les nouvelles associations
      if (company_ids && company_ids.length > 0) {
        const associations = company_ids.map((companyId: string) => ({
          user_id: targetUserId,
          company_id: companyId,
          role: 'user',
          is_active: true
        }))

        const { error: insertError } = await supabase
          .from('user_companies')
          .upsert(associations, {
            onConflict: 'user_id,company_id'
          })

        if (insertError) {
          console.error('Error updating company associations:', insertError)
          return NextResponse.json(
            { error: 'Failed to update company associations' },
            { status: 500 }
          )
        }
      }
    }

    // Mettre à jour le profil si nécessaire
    let updatedProfile = null
    if (Object.keys(updateData).length > 0) {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUserId)
        .select(`
          id,
          first_name,
          last_name,
          role,
          user_companies (
            company_id,
            role,
            is_active,
            companies (
              id,
              name
            )
          )
        `)
        .single()

      if (updateError) {
        console.error('Error updating profile:', updateError)
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        )
      }
      updatedProfile = data
    } else {
      // Si pas de mise à jour du profil, récupérer les données actuelles
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          role,
          user_companies (
            company_id,
            role,
            is_active,
            companies (
              id,
              name
            )
          )
        `)
        .eq('id', targetUserId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return NextResponse.json(
          { error: 'Failed to fetch user' },
          { status: 500 }
        )
      }
      updatedProfile = data
    }


    // Logger l'action admin
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: currentUser.id,
        action: 'update_user',
        resource_type: 'user',
        resource_id: targetUserId,
        details: {
          changes: updateData,
          performed_by: currentUser.email,
          timestamp: new Date().toISOString()
        }
      })

    // Récupérer l'email depuis auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId)

    // Formater la réponse
    const userCompanies = updatedProfile.user_companies
      ?.filter((uc: any) => uc.is_active && uc.companies)
      ?.map((uc: any) => ({
        id: uc.companies.id,
        name: uc.companies.name,
        role: uc.role
      })) || []

    const responseData = {
      id: updatedProfile.id,
      email: authUser?.user?.email || 'N/A',
      first_name: updatedProfile.first_name,
      last_name: updatedProfile.last_name,
      role: updatedProfile.role,
      companies: userCompanies
    }

    return NextResponse.json({
      success: true,
      user: responseData
    })

  } catch (error) {
    console.error('Admin user update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Vérifier l'authentification admin
  const authResult = await verifyAdminAuth(request)
  if (authResult.error) {
    return authResult.error
  }

  const { id } = await params
  const userId = id

  try {
    // Créer le client Supabase admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupérer le profil de l'utilisateur avec ses entreprises
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        company_id,
        created_at,
        updated_at,
        user_companies (
          company_id,
          role,
          is_active,
          companies (
            id,
            name
          )
        )
      `)
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Récupérer les informations auth
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)

    // Formater la réponse
    const userCompanies = profile.user_companies
      ?.filter((uc: any) => uc.is_active && uc.companies)
      ?.map((uc: any) => ({
        id: uc.companies.id,
        name: uc.companies.name,
        role: uc.role
      })) || []

    const userData = {
      id: profile.id,
      email: authUser?.user?.email || 'N/A',
      first_name: profile.first_name,
      last_name: profile.last_name,
      role: profile.role,
      companies: userCompanies,
      created_at: authUser?.user?.created_at || profile.created_at,
      last_sign_in_at: authUser?.user?.last_sign_in_at || null,
      updated_at: profile.updated_at
    }

    return NextResponse.json(userData)

  } catch (error) {
    console.error('Admin user get API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
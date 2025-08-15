import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, isSuperAdmin, UserRole } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Vérifier l'authentification admin
  const authResult = await verifyAdminAuth(request)
  if (authResult.error) {
    return authResult.error
  }

  const currentUser = authResult.user!
  const targetUserId = params.id

  try {
    const body = await request.json()
    const { role, company_id } = body

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

    // Préparer les données de mise à jour
    const updateData: any = {}
    if (role !== undefined) {
      updateData.role = role
    }
    if (company_id !== undefined) {
      // Vérifier que la company existe si un ID est fourni
      if (company_id !== null) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('id', company_id)
          .single()

        if (companyError || !company) {
          return NextResponse.json(
            { error: 'Company not found' },
            { status: 400 }
          )
        }
      }
      updateData.company_id = company_id
    }

    // Mettre à jour le profil
    const { data: updatedProfile, error: updateError } = await supabase
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
        company_id,
        companies (
          id,
          name
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
    const responseData = {
      id: updatedProfile.id,
      email: authUser?.user?.email || 'N/A',
      first_name: updatedProfile.first_name,
      last_name: updatedProfile.last_name,
      role: updatedProfile.role,
      company: updatedProfile.companies ? {
        id: updatedProfile.companies.id,
        name: updatedProfile.companies.name
      } : null
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
  { params }: { params: { id: string } }
) {
  // Vérifier l'authentification admin
  const authResult = await verifyAdminAuth(request)
  if (authResult.error) {
    return authResult.error
  }

  const userId = params.id

  try {
    // Créer le client Supabase admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupérer le profil de l'utilisateur
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
        companies (
          id,
          name
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
    const userData = {
      id: profile.id,
      email: authUser?.user?.email || 'N/A',
      first_name: profile.first_name,
      last_name: profile.last_name,
      role: profile.role,
      company: profile.companies ? {
        id: profile.companies.id,
        name: profile.companies.name
      } : null,
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
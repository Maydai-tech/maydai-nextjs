import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Types pour les rôles utilisateur
 */
export type UserRole = 'user' | 'admin' | 'super_admin'

/**
 * Interface pour le profil utilisateur avec rôle
 */
export interface AdminProfile {
  id: string
  email: string
  role: UserRole
  company_id?: string
}

/**
 * Vérifie si un utilisateur a un rôle admin
 */
export function hasAdminRole(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin'
}

/**
 * Vérifie si un utilisateur est super admin
 */
export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin'
}

/**
 * Middleware pour vérifier l'authentification admin
 * @param request - La requête Next.js
 * @param requiredRole - Le rôle minimum requis (par défaut: admin)
 * @returns Un objet avec l'utilisateur si authentifié, ou une réponse d'erreur
 */
export async function verifyAdminAuth(
  request: NextRequest,
  requiredRole: 'admin' | 'super_admin' = 'admin'
): Promise<{ user?: AdminProfile; error?: NextResponse }> {
  console.log('verifyAdminAuth - Start')
  
  try {
    // Vérifier les variables d'environnement
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables')
      return {
        error: NextResponse.json(
          { error: 'Configuration error' },
          { status: 500 }
        )
      }
    }

    // Récupérer le token d'authentification
    const authHeader = request.headers.get('authorization')
    console.log('Auth header check:', {
      hasAuthHeader: !!authHeader,
      startsWithBearer: authHeader?.startsWith('Bearer ') || false
    })
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header')
      return {
        error: NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        )
      }
    }

    const token = authHeader.substring(7) // Enlever "Bearer "
    console.log('Token extracted, length:', token.length)

    // Créer le client Supabase admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Vérifier le token et récupérer l'utilisateur
    console.log('Getting user with token...')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    console.log('User lookup result:', {
      hasUser: !!user,
      userId: user?.id,
      error: authError
    })

    if (authError || !user) {
      console.error('User auth failed:', authError)
      return {
        error: NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        )
      }
    }

    // Récupérer le profil avec le rôle
    console.log('Looking up profile for user:', user.id)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', user.id)
      .single()

    console.log('Profile lookup result:', {
      hasProfile: !!profile,
      profileError,
      profile: profile ? { id: profile.id, role: profile.role } : null
    })

    if (profileError || !profile) {
      console.error('User profile not found:', { userId: user.id, error: profileError })
      return {
        error: NextResponse.json(
          { error: 'User profile not found', userId: user.id },
          { status: 404 }
        )
      }
    }

    // Vérifier le rôle
    const userRole = profile.role as UserRole
    
    if (requiredRole === 'super_admin' && !isSuperAdmin(userRole)) {
      return {
        error: NextResponse.json(
          { error: 'Super admin access required' },
          { status: 403 }
        )
      }
    }

    if (!hasAdminRole(userRole)) {
      return {
        error: NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      }
    }

    // Logger l'action admin (optionnel)
    await logAdminAction(supabase, profile.id, 'api_access', request.url)

    return {
      user: {
        id: profile.id,
        email: user.email || '',
        role: userRole,
        company_id: profile.company_id
      }
    }

  } catch (error) {
    console.error('Admin auth error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return {
      error: NextResponse.json(
        { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Logger une action admin
 */
async function logAdminAction(
  supabase: any,
  adminId: string,
  action: string,
  resource: string
): Promise<void> {
  try {
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminId,
        action,
        resource_type: 'api',
        resource_id: resource,
        details: {
          timestamp: new Date().toISOString(),
          user_agent: resource
        }
      })
  } catch (error) {
    // Ne pas faire échouer la requête si le log échoue
    console.error('Failed to log admin action:', error)
  }
}

/**
 * Hook pour récupérer les utilisateurs admin (pour une interface d'admin)
 */
export async function getAdminUsers(
  supabase: any
): Promise<AdminProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, company_id')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching admin users:', error)
    return []
  }

  return data || []
}

/**
 * Promouvoir un utilisateur en admin
 */
export async function promoteToAdmin(
  supabase: any,
  userId: string,
  role: 'admin' | 'super_admin' = 'admin'
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Rétrograder un admin en utilisateur normal
 */
export async function demoteAdmin(
  supabase: any,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'user' })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
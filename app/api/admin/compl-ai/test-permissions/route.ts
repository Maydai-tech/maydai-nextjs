import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification via l'en-tête Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Token d\'authentification manquant',
        details: {
          hasAuthHeader: !!authHeader,
          authHeaderStart: authHeader?.substring(0, 20) || 'N/A'
        }
      }, { status: 401 })
    }

    // Obtenir l'utilisateur connecté avec le token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Token invalide',
        details: {
          authError: authError?.message || 'Pas d\'erreur auth',
          hasUser: !!user,
          tokenLength: token.length
        }
      }, { status: 401 })
    }

    // Récupérer le profil de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: profile?.role || 'PROFILE_NOT_FOUND',
        profileError: profileError?.message || null
      },
      permissions: {
        canSync: ['admin', 'super_admin'].includes(profile?.role || ''),
        canClear: ['admin', 'super_admin'].includes(profile?.role || ''),
        canClearOriginal: profile?.role === 'super_admin'
      }
    })

  } catch (error) {
    console.error('Erreur test permissions:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : 'Pas de stack'
    }, { status: 500 })
  }
}
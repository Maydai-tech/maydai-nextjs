import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Non authentifié', isAdmin: false },
        { status: 401 }
      );
    }

    // Obtenir l'utilisateur connecté avec le token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token invalide', isAdmin: false },
        { status: 401 }
      );
    }

    // Vérifier si l'utilisateur a le rôle admin
    const { data: userRole, error: roleError } = await supabase
      .from('users_roles')
      .select(`
        roles (
          name
        )
      `)
      .eq('user_id', user.id)
      .single();

    const isAdmin = !roleError && userRole?.roles && (userRole.roles as any)?.name === 'admin';

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      isAdmin,
      role: roleError ? 'no_role' : (userRole.roles as any)?.name || 'unknown',
      message: isAdmin ? 'Vous êtes administrateur' : 'Vous n\'êtes pas administrateur'
    }, { status: 200 });

  } catch (error) {
    console.error('Erreur dans test-admin:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', isAdmin: false },
      { status: 500 }
    );
  }
} 
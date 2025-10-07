import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Récupérer la liste des collaborateurs
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Token d\'authentification manquant' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer l'entreprise de l'utilisateur
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 });
    }

    // Pour l'instant, retourner des données mockées
    // TODO: Implémenter la vraie logique avec la base de données
    const mockCollaborators = [
      {
        id: '1',
        email: 'collaborateur1@example.com',
        name: 'Jean Dupont',
        role: 'editor' as const,
        status: 'active' as const,
        invited_at: new Date().toISOString(),
        last_activity: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        permissions: {
          can_view: true,
          can_edit: true,
          can_delete: false,
          can_invite: false,
          can_manage_users: false
        }
      },
      {
        id: '2',
        email: 'collaborateur2@example.com',
        name: 'Marie Martin',
        role: 'read_only' as const,
        status: 'pending' as const,
        invited_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        last_activity: null,
        permissions: {
          can_view: true,
          can_edit: false,
          can_delete: false,
          can_invite: false,
          can_manage_users: false
        }
      },
      {
        id: '3',
        email: 'admin@example.com',
        name: 'Pierre Admin',
        role: 'administrator' as const,
        status: 'active' as const,
        invited_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        permissions: {
          can_view: true,
          can_edit: true,
          can_delete: true,
          can_invite: true,
          can_manage_users: true
        }
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockCollaborators
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des collaborateurs:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 });
  }
}

// POST - Inviter un nouveau collaborateur (BLOQUÉ EN BETA)
export async function POST(request: NextRequest) {
  // Blocage des invitations pendant la phase Beta
  return NextResponse.json({
    success: false,
    error: 'La plateforme MaydAI est en Beta Test, vous ne pouvez pas encore inviter des collaborateurs',
    beta_restriction: true
  }, { status: 403 });
}

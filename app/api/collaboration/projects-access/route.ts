import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Récupérer l'accès aux projets pour les collaborateurs
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
    const mockProjectAccess = [
      {
        project_id: '1',
        project_name: 'Audit RGPD - Q1 2024',
        access_level: 'editor' as const,
        granted_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        last_access: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        project_id: '2',
        project_name: 'Conformité ISO 27001',
        access_level: 'read_only' as const,
        granted_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_access: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        project_id: '3',
        project_name: 'Analyse des Risques Cybersécurité',
        access_level: 'administrator' as const,
        granted_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        last_access: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        project_id: '4',
        project_name: 'Formation Équipe - Protection Données',
        access_level: 'read_only' as const,
        granted_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        last_access: null
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockProjectAccess
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'accès aux projets:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 });
  }
}

// POST - Accorder l'accès à un projet (BLOQUÉ EN BETA)
export async function POST(request: NextRequest) {
  // Blocage de la gestion des accès pendant la phase Beta
  return NextResponse.json({
    success: false,
    error: 'La plateforme MaydAI est en Beta Test, vous ne pouvez pas encore gérer les accès aux projets',
    beta_restriction: true
  }, { status: 403 });
}

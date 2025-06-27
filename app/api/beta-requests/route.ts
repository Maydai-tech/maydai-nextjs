import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, motivations } = body;

    // Validation des données
    if (!fullName || !email || !motivations) {
      return NextResponse.json(
        { error: 'Les champs nom, email et motivations sont requis' },
        { status: 400 }
      );
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Adresse email invalide' },
        { status: 400 }
      );
    }

    // Validation de la longueur des champs
    if (fullName.length > 255) {
      return NextResponse.json(
        { error: 'Le nom ne peut pas dépasser 255 caractères' },
        { status: 400 }
      );
    }

    if (email.length > 255) {
      return NextResponse.json(
        { error: 'L\'email ne peut pas dépasser 255 caractères' },
        { status: 400 }
      );
    }

    if (phone && phone.length > 50) {
      return NextResponse.json(
        { error: 'Le téléphone ne peut pas dépasser 50 caractères' },
        { status: 400 }
      );
    }

    if (motivations.length > 2000) {
      return NextResponse.json(
        { error: 'Les motivations ne peuvent pas dépasser 2000 caractères' },
        { status: 400 }
      );
    }

    // Utiliser le client Supabase

    // Vérifier si l'email existe déjà
    const { data: existingRequest, error: checkError } = await supabase
      .from('beta_requests')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erreur lors de la vérification de l\'email:', checkError);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification de l\'email' },
        { status: 500 }
      );
    }

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Une demande avec cet email existe déjà' },
        { status: 409 }
      );
    }

    // Insérer la nouvelle demande
    const { data, error } = await supabase
      .from('beta_requests')
      .insert({
        full_name: fullName,
        email: email,
        phone: phone || null,
        motivations: motivations,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de l\'insertion:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement de votre demande' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Votre demande a été enregistrée avec succès',
        data: {
          id: data.id,
          created_at: data.created_at
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Erreur dans la route beta-requests:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Token d\'authentification requis' },
        { status: 401 }
      );
    }

    // Obtenir l'utilisateur connecté avec le token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
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

    if (roleError || !userRole?.roles || (userRole.roles as any)?.name !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé - droits administrateur requis' },
        { status: 403 }
      );
    }

    // L'utilisateur est admin, récupérer les demandes
    const { data, error } = await supabase
      .from('beta_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des demandes:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des demandes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });

  } catch (error) {
    console.error('Erreur dans la route beta-requests GET:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 
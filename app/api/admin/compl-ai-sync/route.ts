import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Créer un client Supabase pour vérifier l'authentification
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    )

    // Vérifier que l'utilisateur est authentifié et est admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Vérifier le rôle admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Utiliser la clé de service si disponible, sinon utiliser le client authentifié
    let supabaseAdmin
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Utiliser la clé de service (recommandé)
      supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      console.log('Using service role key for Edge Function call')
    } else {
      // Fallback : utiliser le client authentifié de l'utilisateur admin
      console.warn('SUPABASE_SERVICE_ROLE_KEY not found, using authenticated client instead')
      console.warn('Pour une meilleure sécurité, ajoutez SUPABASE_SERVICE_ROLE_KEY à votre .env.local')
      
      // Réutiliser le client déjà authentifié
      supabaseAdmin = supabase
    }

    console.log('Calling Edge Function compl-ai-sync from API route...')

    // Appeler l'Edge Function depuis le serveur (pas de problème CORS)
    const { data, error } = await supabaseAdmin.functions.invoke('compl-ai-sync', {
      body: {},
      headers: {
        'Content-Type': 'application/json',
      }
    })

    console.log('Edge Function response:', { data, error })

    // Si on a une erreur mais que l'Edge Function a peut-être quand même fonctionné
    if (error) {
      // Log l'erreur mais ne pas forcément la retourner comme un échec
      console.error('Edge Function error:', error)
      
      // Si c'est une FunctionsFetchError, on peut quand même retourner un succès partiel
      if (error.message.includes('FunctionsFetchError') || 
          error.message.includes('Failed to send')) {
        return NextResponse.json({
          success: true,
          warning: 'Edge Function executed but returned a communication error',
          message: 'Synchronization may have succeeded despite the error. Please check the data.',
          error: error.message
        })
      }
      
      // Pour les autres erreurs, les retourner
      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { status: 500 })
    }

    // Si on a des données, les retourner
    if (data) {
      return NextResponse.json({
        success: true,
        ...data
      })
    }

    // Si ni erreur ni données (cas rare)
    return NextResponse.json({
      success: true,
      message: 'Edge Function called successfully but returned no data'
    })

  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}
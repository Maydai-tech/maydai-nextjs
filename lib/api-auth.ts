import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { useRouter } from 'next/navigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

export async function getAuthenticatedSupabaseClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    throw new Error('No authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Create Supabase client with the user's token
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })
  
  // Verify the token and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    throw new Error('Invalid token')
  }

  return { supabase, user }
}

export async function getUserCompanyId(supabase: any, userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error('Error fetching profile')
  }

  return profile.company_id
}

interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
}

interface ApiResponse<T = any> {
  data?: T
  error?: string
  status: number
}

/**
 * Fonction utilitaire pour faire des appels API avec gestion automatique du refresh token
 */
export async function apiCall<T = any>(
  url: string, 
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {} } = options

  try {
    // Obtenir la session actuelle
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      return {
        error: 'No valid session',
        status: 401
      }
    }

    // Préparer les headers avec le token
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...headers
    }

    // Première tentative
    let response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined
    })

    // Si erreur 401, tenter de rafraîchir le token
    if (response.status === 401) {
      console.log('Token invalide, tentative de rafraîchissement...')
      
      // Rafraîchir la session
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession()
      
      if (refreshError || !refreshedSession?.access_token) {
        console.log('Impossible de rafraîchir la session, déconnexion nécessaire')
        return {
          error: 'Session expired',
          status: 401
        }
      }

      console.log('Token rafraîchi avec succès, nouvelle tentative...')
      
      // Nouvelle tentative avec le token rafraîchi
      requestHeaders['Authorization'] = `Bearer ${refreshedSession.access_token}`
      response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined
      })
    }

    // Traiter la réponse
    if (response.ok) {
      const data = await response.json()
      return {
        data,
        status: response.status
      }
    } else {
      return {
        error: `Request failed with status ${response.status}`,
        status: response.status
      }
    }

  } catch (error) {
    console.error('API call error:', error)
    return {
      error: 'Network error',
      status: 500
    }
  }
}

/**
 * Hook personnalisé pour les appels API avec gestion d'authentification et redirection automatique
 */
export function useApiCall() {
  const { signOut } = useAuth()
  const router = useRouter()
  
  const handleApiCall = async <T = any>(
    url: string, 
    options: ApiCallOptions = {}
  ): Promise<ApiResponse<T>> => {
    const result = await apiCall<T>(url, options)
    
    // Si erreur 401 (session expirée), déconnecter automatiquement
    if (result.status === 401) {
      console.log('Session expirée, déconnexion automatique...')
      await signOut()
      router.push('/login')
    }
    
    return result
  }

  return {
    call: handleApiCall,
    get: <T = any>(url: string, headers?: Record<string, string>) => 
      handleApiCall<T>(url, { method: 'GET', headers }),
    
    post: <T = any>(url: string, body?: any, headers?: Record<string, string>) => 
      handleApiCall<T>(url, { method: 'POST', body, headers }),
    
    put: <T = any>(url: string, body?: any, headers?: Record<string, string>) => 
      handleApiCall<T>(url, { method: 'PUT', body, headers }),
    
    delete: <T = any>(url: string, headers?: Record<string, string>) => 
      handleApiCall<T>(url, { method: 'DELETE', headers })
  }
} 
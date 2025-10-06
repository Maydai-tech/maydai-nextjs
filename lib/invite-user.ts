import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies'
  )
}

// Client admin avec service role key pour opérations admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Recherche un utilisateur par email dans auth.users
 */
export async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  const user = data.users.find((user) => user.email === email)
  return { user: user, error }
}

/**
 * Invite un utilisateur par email et crée son compte auth
 * L'utilisateur recevra un email d'invitation pour définir son mot de passe
 */
export async function inviteUserByEmail(
  email: string,
  metadata: {
    firstName: string
    lastName: string
  }
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      first_name: metadata.firstName,
      last_name: metadata.lastName
    },
    redirectTo: `${appUrl}/auth/callback`
  })

  return { data, error }
}

/**
 * Récupère ou crée un profil pour un utilisateur auth existant
 * Si le profil existe déjà (créé par un trigger), on le met à jour avec les infos
 */
export async function createProfileForUser(
  userId: string,
  firstName: string,
  lastName: string
) {
  // D'abord vérifier si le profil existe déjà (potentiellement créé par un trigger)
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (existingProfile) {
    // Le profil existe déjà (créé par trigger), on le met à jour avec les infos
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    return { data, error }
  }

  // Le profil n'existe pas, on le crée
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: userId,
      first_name: firstName,
      last_name: lastName
    })
    .select()
    .single()

  return { data, error }
}

import { supabase as defaultSupabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ResourceType = 'profile' | 'company' | 'usecase';
export type CollaboratorRole = 'owner' | 'user';

/**
 * Vérifie si un utilisateur a accès à une ressource en vérifiant la hiérarchie :
 * 1. Profile (accès total)
 * 2. Company (accès aux use cases de la company)
 * 3. Use Case (accès uniquement à ce use case)
 *
 * @param userId - L'ID de l'utilisateur
 * @param resourceType - Le type de ressource ('profile', 'company', 'usecase')
 * @param resourceId - L'ID de la ressource
 * @param supabaseClient - Client Supabase optionnel (utilise le client par défaut si non fourni)
 * @returns true si l'utilisateur a accès, false sinon
 */
export async function hasAccessToResource(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  supabaseClient?: SupabaseClient
): Promise<boolean> {
  const supabase = supabaseClient || defaultSupabase;

  // 1. Vérifier si l'utilisateur est le propriétaire direct de la ressource
  if (resourceType === 'company') {
    // Pour les companies, l'ownership est géré via user_companies avec role='owner'
    const { data: ownerEntry } = await supabase
      .from('user_companies')
      .select('role')
      .eq('company_id', resourceId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    if (ownerEntry) {
      return true;
    }
  } else if (resourceType === 'usecase') {
    const { data: usecase } = await supabase
      .from('usecases')
      .select('user_id')
      .eq('id', resourceId)
      .single();

    if (usecase?.user_id === userId) return true;
  }

  // 2. Vérifier l'accès au niveau Profile
  if (resourceType === 'company') {
    // Récupérer le owner de la company via user_companies
    const { data: ownerEntry } = await supabase
      .from('user_companies')
      .select('user_id')
      .eq('company_id', resourceId)
      .eq('role', 'owner')
      .single();

    if (ownerEntry) {
      const { data: profileCollaborator } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('inviter_user_id', ownerEntry.user_id)
        .eq('invited_user_id', userId)
        .single();

      if (profileCollaborator) {
        return true;
      }
    }
  } else if (resourceType === 'usecase') {
    // Récupérer le owner du usecase
    const { data: usecase } = await supabase
      .from('usecases')
      .select('user_id')
      .eq('id', resourceId)
      .single();

    if (usecase) {
      const { data: profileCollaborator } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('inviter_user_id', usecase.user_id)
        .eq('invited_user_id', userId)
        .single();

      if (profileCollaborator) return true;
    }
  }

  // 3. Vérifier l'accès au niveau Company
  if (resourceType === 'company') {
    const { data: companyCollaborator } = await supabase
      .from('user_companies')
      .select('id')
      .eq('company_id', resourceId)
      .eq('user_id', userId)
      .single();

    if (companyCollaborator) {
      return true;
    }
  } else if (resourceType === 'usecase') {
    // Récupérer la company du usecase
    const { data: usecase } = await supabase
      .from('usecases')
      .select('company_id')
      .eq('id', resourceId)
      .single();

    if (usecase?.company_id) {
      const { data: companyCollaborator } = await supabase
        .from('user_companies')
        .select('id')
        .eq('company_id', usecase.company_id)
        .eq('user_id', userId)
        .single();

      if (companyCollaborator) return true;
    }
  }

  // 4. Vérifier l'accès au niveau Use Case
  if (resourceType === 'usecase') {
    const { data: usecaseCollaborator } = await supabase
      .from('user_usecases')
      .select('id')
      .eq('usecase_id', resourceId)
      .eq('user_id', userId)
      .single();

    if (usecaseCollaborator) return true;
  }

  return false;
}

/**
 * Vérifie si un utilisateur est le propriétaire (owner) d'une ressource
 *
 * @param userId - L'ID de l'utilisateur
 * @param resourceType - Le type de ressource
 * @param resourceId - L'ID de la ressource
 * @param supabaseClient - Client Supabase optionnel (utilise le client par défaut si non fourni)
 * @returns true si l'utilisateur est owner, false sinon
 */
export async function isOwner(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  supabaseClient?: SupabaseClient
): Promise<boolean> {
  const supabase = supabaseClient || defaultSupabase;

  if (resourceType === 'company') {
    // Check if user has owner role in user_companies
    const { data: ownerEntry } = await supabase
      .from('user_companies')
      .select('role')
      .eq('company_id', resourceId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    return !!ownerEntry;
  } else if (resourceType === 'usecase') {
    const { data: usecase } = await supabase
      .from('usecases')
      .select('user_id')
      .eq('id', resourceId)
      .single();

    return usecase?.user_id === userId;
  }

  return false;
}

/**
 * Récupère le rôle le plus élevé d'un utilisateur pour une ressource donnée
 * en suivant la hiérarchie : Profile > Company > Use Case
 *
 * @param userId - L'ID de l'utilisateur
 * @param resourceType - Le type de ressource
 * @param resourceId - L'ID de la ressource
 * @param supabaseClient - Client Supabase optionnel (utilise le client par défaut si non fourni)
 * @returns Le rôle le plus élevé ou null si aucun accès
 */
export async function getUserHighestRole(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  supabaseClient?: SupabaseClient
): Promise<CollaboratorRole | null> {
  const supabase = supabaseClient || defaultSupabase;

  // 1. Vérifier si l'utilisateur est le propriétaire direct
  if (resourceType === 'company') {
    // Check if user has owner role in user_companies
    const { data: ownerEntry } = await supabase
      .from('user_companies')
      .select('role')
      .eq('company_id', resourceId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    if (ownerEntry) return 'owner';
  } else if (resourceType === 'usecase') {
    const { data: usecase } = await supabase
      .from('usecases')
      .select('user_id')
      .eq('id', resourceId)
      .single();

    if (usecase?.user_id === userId) return 'owner';
  }

  // 2. Vérifier au niveau Profile
  if (resourceType === 'company') {
    // Get owner of the company via user_companies
    const { data: ownerEntry } = await supabase
      .from('user_companies')
      .select('user_id')
      .eq('company_id', resourceId)
      .eq('role', 'owner')
      .single();

    if (ownerEntry) {
      const { data: profileCollaborator } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('inviter_user_id', ownerEntry.user_id)
        .eq('invited_user_id', userId)
        .single();

      if (profileCollaborator) return profileCollaborator.role as CollaboratorRole;
    }
  } else if (resourceType === 'usecase') {
    const { data: usecase } = await supabase
      .from('usecases')
      .select('user_id')
      .eq('id', resourceId)
      .single();

    if (usecase) {
      const { data: profileCollaborator } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('inviter_user_id', usecase.user_id)
        .eq('invited_user_id', userId)
        .single();

      if (profileCollaborator) return profileCollaborator.role as CollaboratorRole;
    }
  }

  // 3. Vérifier au niveau Company
  if (resourceType === 'company') {
    const { data: companyCollaborator } = await supabase
      .from('user_companies')
      .select('role')
      .eq('company_id', resourceId)
      .eq('user_id', userId)
      .single();

    if (companyCollaborator) return companyCollaborator.role as CollaboratorRole;
  } else if (resourceType === 'usecase') {
    const { data: usecase } = await supabase
      .from('usecases')
      .select('company_id')
      .eq('id', resourceId)
      .single();

    if (usecase?.company_id) {
      const { data: companyCollaborator } = await supabase
        .from('user_companies')
        .select('role')
        .eq('company_id', usecase.company_id)
        .eq('user_id', userId)
        .single();

      if (companyCollaborator) return companyCollaborator.role as CollaboratorRole;
    }
  }

  // 4. Vérifier au niveau Use Case
  if (resourceType === 'usecase') {
    const { data: usecaseCollaborator } = await supabase
      .from('user_usecases')
      .select('role')
      .eq('usecase_id', resourceId)
      .eq('user_id', userId)
      .single();

    if (usecaseCollaborator) return usecaseCollaborator.role as CollaboratorRole;
  }

  return null;
}

/**
 * Vérifie si un utilisateur a un accès au niveau profile (collaborateur de compte)
 * Cela donne accès complet à toutes les ressources du propriétaire du compte
 *
 * @param userId - L'ID de l'utilisateur à vérifier
 * @param supabaseClient - Client Supabase optionnel (utilise le client par défaut si non fourni)
 * @returns true si l'utilisateur a accès au niveau profile de quelqu'un
 */
export async function hasProfileLevelAccess(userId: string, supabaseClient?: SupabaseClient): Promise<boolean> {
  const supabase = supabaseClient || defaultSupabase;

  // Vérifier si l'utilisateur est invité au niveau profile par quelqu'un
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('invited_user_id', userId)
    .limit(1)
    .single();

  return !!data;
}

/**
 * Vérifie si un utilisateur peut créer des registres
 * Un utilisateur peut créer des registres s'il :
 * - A au moins un rôle 'owner' dans user_companies, OU
 * - A un accès au niveau profile (est collaborateur de compte de quelqu'un)
 *
 * @param userId - L'ID de l'utilisateur
 * @param supabaseClient - Client Supabase optionnel (utilise le client par défaut si non fourni)
 * @returns true si l'utilisateur peut créer des registres
 */
export async function canCreateCompany(userId: string, supabaseClient?: SupabaseClient): Promise<boolean> {
  const supabase = supabaseClient || defaultSupabase;

  // 1. Vérifier s'il a un accès au niveau profile
  const hasProfileAccess = await hasProfileLevelAccess(userId, supabase);
  if (hasProfileAccess) return true;

  // 2. Vérifier s'il a au moins un rôle owner
  const { data: ownerCompanies } = await supabase
    .from('user_companies')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .limit(1)
    .single();

  return !!ownerCompanies;
}

/**
 * Récupère tous les collaborateurs d'une ressource avec leurs informations
 *
 * @param resourceType - Le type de ressource
 * @param resourceId - L'ID de la ressource
 * @param supabaseClient - Client Supabase optionnel (utilise le client par défaut si non fourni)
 * @returns Liste des collaborateurs avec leurs profils
 */
export async function getResourceCollaborators(
  resourceType: ResourceType,
  resourceId: string,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || defaultSupabase;

  if (resourceType === 'company') {
    const { data, error } = await supabase
      .from('user_companies')
      .select(`
        id,
        user_id,
        role,
        created_at,
        added_by,
        profiles:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('company_id', resourceId);

    return { data, error };
  } else if (resourceType === 'usecase') {
    const { data, error } = await supabase
      .from('user_usecases')
      .select(`
        id,
        user_id,
        role,
        created_at,
        added_by,
        profiles:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('usecase_id', resourceId);

    return { data, error };
  } else if (resourceType === 'profile') {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        invited_user_id,
        role,
        created_at,
        added_by,
        profiles:invited_user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('inviter_user_id', resourceId);

    return { data, error };
  }

  return { data: null, error: new Error('Invalid resource type') };
}

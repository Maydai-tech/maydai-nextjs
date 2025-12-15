import { SupabaseClient } from '@supabase/supabase-js'

export type UseCaseHistoryEventType =
  | 'created'
  | 'reevaluated'
  | 'document_uploaded'
  | 'field_updated'

export interface UseCaseHistoryEntry {
  id: string
  usecase_id: string
  user_id: string | null
  event_type: UseCaseHistoryEventType
  field_name: string | null
  old_value: string | null
  new_value: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  // Joined data
  user?: {
    first_name: string | null
    last_name: string | null
  }
}

export interface RecordHistoryOptions {
  fieldName?: string
  oldValue?: string | null
  newValue?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Enregistre une entrée dans l'historique du use case
 */
export async function recordUseCaseHistory(
  supabase: SupabaseClient,
  usecaseId: string,
  userId: string,
  eventType: UseCaseHistoryEventType,
  options?: RecordHistoryOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('usecase_history')
      .insert({
        usecase_id: usecaseId,
        user_id: userId,
        event_type: eventType,
        field_name: options?.fieldName || null,
        old_value: options?.oldValue || null,
        new_value: options?.newValue || null,
        metadata: options?.metadata || null
      })

    if (error) {
      console.error('Error recording usecase history:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error recording usecase history:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

/**
 * Enregistre plusieurs modifications de champs en une seule transaction
 */
export async function recordFieldChanges(
  supabase: SupabaseClient,
  usecaseId: string,
  userId: string,
  changes: Array<{
    fieldName: string
    oldValue: string | null
    newValue: string | null
  }>
): Promise<{ success: boolean; error?: string }> {
  if (changes.length === 0) return { success: true }

  try {
    const entries = changes.map(change => ({
      usecase_id: usecaseId,
      user_id: userId,
      event_type: 'field_updated' as UseCaseHistoryEventType,
      field_name: change.fieldName,
      old_value: change.oldValue,
      new_value: change.newValue,
      metadata: null
    }))

    const { error } = await supabase
      .from('usecase_history')
      .insert(entries)

    if (error) {
      console.error('Error recording field changes:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error recording field changes:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

/**
 * Récupère l'historique d'un use case avec les informations utilisateur
 */
export async function getUseCaseHistory(
  supabase: SupabaseClient,
  usecaseId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: UseCaseHistoryEntry[] | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('usecase_history')
      .select(`
        *,
        user:profiles!usecase_history_user_id_fkey(first_name, last_name)
      `)
      .eq('usecase_id', usecaseId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching usecase history:', error)
      return { data: null, error: error.message }
    }

    return { data: data as UseCaseHistoryEntry[] }
  } catch (err) {
    console.error('Unexpected error fetching usecase history:', err)
    return { data: null, error: 'Unexpected error' }
  }
}

/**
 * Labels français pour les noms de champs
 */
export const FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  description: 'Description',
  deployment_date: 'Date de déploiement',
  deployment_countries: 'Pays de déploiement',
  responsible_service: 'Service responsable',
  technology_partner: 'Partenaire technologique',
  llm_model_version: 'Version du modèle LLM',
  ai_category: 'Catégorie IA',
  system_type: 'Type de système',
  company_status: 'Statut entreprise',
  primary_model_id: 'Modèle principal',
  status: 'Statut'
}

/**
 * Labels français pour les types de documents du dossier
 */
export const DOC_TYPE_LABELS: Record<string, string> = {
  system_prompt: 'Prompt système',
  technical_documentation: 'Documentation technique',
  human_oversight: 'Surveillance humaine',
  transparency_marking: 'Marquage de transparence',
  risk_management: 'Gestion des risques',
  data_quality: 'Qualité des données',
  continuous_monitoring: 'Surveillance continue',
  training_census: 'Recensement des formations',
  stopping_proof: 'Preuve d\'arrêt',
  registry_proof: 'Preuve de registre',
  training_plan: 'Plan de formation'
}

/**
 * Labels français pour les types d'événements
 */
export const EVENT_TYPE_LABELS: Record<UseCaseHistoryEventType, string> = {
  created: 'Cas d\'usage créé',
  reevaluated: 'Évaluation complétée',
  document_uploaded: 'Document uploadé',
  field_updated: 'Information modifiée'
}

/**
 * Formate une valeur pour l'affichage (tronque si trop longue)
 */
export function formatValueForDisplay(value: string | null, maxLength: number = 100): string {
  if (!value) return '(vide)'
  if (value.length <= maxLength) return value
  return value.substring(0, maxLength) + '...'
}

/**
 * Formate une date relative (il y a X minutes/heures/jours)
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'À l\'instant'
  if (diffMinutes < 60) return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

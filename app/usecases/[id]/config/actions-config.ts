/**
 * Configuration centralisée pour les actions du rapport
 * Mapping des clés d'actions vers les types de documents et leurs métadonnées
 */

import { getFixedActionPoints, getRegistryActionPoints } from '@/app/dashboard/[id]/todo-list/utils/todo-helpers'

// Mapping des actions du rapport vers les types de documents de la todo-list
export const ACTION_TO_DOCTYPE: Record<string, string> = {
  quick_win_1: 'registry_action',
  quick_win_2: 'human_oversight',
  quick_win_3: 'system_prompt',
  priorite_1: 'technical_documentation',
  priorite_2: 'transparency_marking',
  priorite_3: 'data_quality',
  action_1: 'risk_management',
  action_2: 'continuous_monitoring',
  action_3: 'training_census',
}

// Titres personnalisés pour chaque action
export const ACTION_CUSTOM_TITLES: Record<string, string> = {
  quick_win_1: 'Initialiser votre registre centralisé IA',
  quick_win_2: 'Désigner le(s) responsable(s) de surveillance',
  quick_win_3: 'Définir les instructions système & prompts',
  priorite_1: 'Importer la documentation technique',
  priorite_2: 'Renseigner le marquage de transparence',
  priorite_3: 'Justifier la qualité des données',
  action_1: 'Joindre le plan de gestion des risques',
  action_2: 'Établir le plan de surveillance continue',
  action_3: 'Recenser les formations AI Act',
}

/**
 * Récupère les points potentiels pour une action donnée
 * @param actionKey - La clé de l'action (ex: 'quick_win_1', 'priorite_1')
 * @returns Le nombre de points potentiels (0 si pas de points)
 */
export function getActionPoints(actionKey: string): number {
  const docType = ACTION_TO_DOCTYPE[actionKey]
  
  if (!docType) return 0
  
  // Cas spécial pour registry_action
  if (docType === 'registry_action') {
    return getRegistryActionPoints()
  }
  
  return getFixedActionPoints(docType)
}

/**
 * Récupère le titre personnalisé pour une action
 * @param actionKey - La clé de l'action
 * @returns Le titre personnalisé ou une chaîne vide
 */
export function getActionTitle(actionKey: string): string {
  return ACTION_CUSTOM_TITLES[actionKey] || ''
}

/**
 * Récupère toutes les métadonnées d'une action
 * @param actionKey - La clé de l'action
 * @returns Un objet contenant le titre, les points et le type de document
 */
export function getActionMetadata(actionKey: string) {
  return {
    title: getActionTitle(actionKey),
    points: getActionPoints(actionKey),
    docType: ACTION_TO_DOCTYPE[actionKey] || '',
  }
}

/**
 * Vérifie si une action est complétée en fonction du statut du document
 * @param docType - Le type de document
 * @param documentStatuses - Les statuts des documents récupérés via useDocumentStatuses
 * @param companyMaydaiAsRegistry - Indique si MaydAI est déclaré comme registre pour la company
 * @returns true si le document est complété ou validé, false sinon
 */
export function isActionCompleted(
  docType: string, 
  documentStatuses: Record<string, { status: string }>,
  companyMaydaiAsRegistry?: boolean
): boolean {
  if (!documentStatuses || !docType) return false
  
  // Cas spécial : registry_action
  if (docType === 'registry_action') {
    // Si MaydAI est déclaré comme registre, l'action est automatiquement complétée
    if (companyMaydaiAsRegistry) return true
    
    // Sinon, vérifier le document registry_proof
    const docStatus = documentStatuses['registry_proof']
    if (!docStatus) return false
    return docStatus.status === 'complete' || docStatus.status === 'validated'
  }
  
  // Autres types de documents
  const docStatus = documentStatuses[docType]
  if (!docStatus) return false
  
  return docStatus.status === 'complete' || docStatus.status === 'validated'
}


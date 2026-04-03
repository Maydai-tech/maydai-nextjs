/**
 * Liens vers le dossier documents — indépendants du LLM.
 */

export type UnacceptableDossierDocHighlight = 'stopping_proof' | 'system_prompt'

export function getUnacceptableDossierUrl(
  companyId: string,
  useCaseId: string,
  highlight: UnacceptableDossierDocHighlight
): string {
  const c = encodeURIComponent(companyId)
  const u = encodeURIComponent(useCaseId)
  const h = encodeURIComponent(highlight)
  return `/dashboard/${c}/dossiers/${u}?highlight=${h}`
}

export function getUnacceptableStoppingProofDossierUrl(
  companyId: string,
  useCaseId: string
): string {
  return getUnacceptableDossierUrl(companyId, useCaseId, 'stopping_proof')
}

export function getUnacceptableSystemPromptDossierUrl(
  companyId: string,
  useCaseId: string
): string {
  return getUnacceptableDossierUrl(companyId, useCaseId, 'system_prompt')
}

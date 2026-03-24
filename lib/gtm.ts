export type SignUpMethod = 'email' | 'google' | 'linkedin' | 'github'
export type RegistryType = 'entreprise' | 'filiale' | 'service' | string
export type PlanName = 'freemium' | 'starter' | 'pro' | 'enterprise'
export type CollaboratorRole = 'admin' | 'editor' | 'viewer'
export type LimitType = 'usecases' | 'collaborators' | 'registries' | 'storage'
export type RiskCategory = 'unacceptable' | 'high' | 'limited' | 'minimal'

interface SignUpEvent {
  event: 'sign_up'
  method: SignUpMethod
  user_id?: string
}

interface LoginEvent {
  event: 'login'
  method: SignUpMethod
  user_id?: string
}

interface PageViewEvent {
  event: 'page_view'
  page_path: string
  page_title?: string
}

interface RegistryCreationEvent {
  event: 'registry_creation'
  registry_type: RegistryType
  plan: PlanName
  is_first_registry: boolean
}

interface UseCaseCreationEvent {
  event: 'usecase_creation'
  registry_id: string
  ai_category: string
}

interface CollaboratorInviteEvent {
  event: 'collaborator_invite'
  role_invited: CollaboratorRole
}

interface PricingClickEvent {
  event: 'pricing_click'
  plan_name: PlanName
}

interface LimitReachedEvent {
  event: 'limit_reached'
  limit_type: LimitType
}

interface StorageAlertEvent {
  event: 'storage_alert'
  percentage: number
}

interface HubSpotFormSuccessEvent {
  event: 'hubspot_form_success'
  form_id: string
}

interface CustomEvent {
  event: string
  [key: string]: unknown
}

type GTMEvent =
  | SignUpEvent
  | LoginEvent
  | PageViewEvent
  | RegistryCreationEvent
  | UseCaseCreationEvent
  | CollaboratorInviteEvent
  | PricingClickEvent
  | LimitReachedEvent
  | StorageAlertEvent
  | HubSpotFormSuccessEvent
  | CustomEvent

declare global {
  interface Window {
    dataLayer: GTMEvent[]
  }
}

function isDataLayerAvailable(): boolean {
  return typeof window !== 'undefined' && Array.isArray(window.dataLayer)
}

export function sendGTMEvent(event: GTMEvent): void {
  if (!isDataLayerAvailable()) return
  window.dataLayer.push(event)
}

const CONSENT_DELAY_MS = 1000

/**
 * Pousse un événement dans le dataLayer après un court délai,
 * laissant le temps à CookieYes de mettre à jour le Consent Mode
 * via gtag('consent','update') avant que GTM ne traite l'événement.
 */
function sendGTMEventAfterConsentDelay(event: GTMEvent): void {
  if (!isDataLayerAvailable()) return
  setTimeout(() => {
    window.dataLayer.push(event)
  }, CONSENT_DELAY_MS)
}

export function sendSignUpEvent(
  method: SignUpMethod,
  options?: { userId?: string }
): void {
  sendGTMEventAfterConsentDelay({
    event: 'sign_up',
    method,
    ...(options?.userId && { user_id: options.userId }),
  })
}

export function sendLoginEvent(
  method: SignUpMethod,
  options?: { userId?: string }
): void {
  sendGTMEventAfterConsentDelay({
    event: 'login',
    method,
    ...(options?.userId && { user_id: options.userId }),
  })
}

export function sendPageViewEvent(pagePath: string, pageTitle?: string): void {
  sendGTMEvent({
    event: 'page_view',
    page_path: pagePath,
    ...(pageTitle && { page_title: pageTitle }),
  })
}

export function trackRegistryCreation(
  type: RegistryType,
  plan: PlanName,
  isFirstRegistry: boolean,
): void {
  sendGTMEvent({
    event: 'registry_creation',
    registry_type: type,
    plan,
    is_first_registry: isFirstRegistry,
  })
}

export function trackUseCaseCreation(registryId: string, aiCategory: string): void {
  sendGTMEvent({
    event: 'usecase_creation',
    registry_id: registryId,
    ai_category: aiCategory,
  })
}

export function trackCollaboratorInvite(role: CollaboratorRole): void {
  sendGTMEvent({
    event: 'collaborator_invite',
    role_invited: role,
  })
}

export function trackPricingClick(planName: PlanName): void {
  const titleCase = planName.charAt(0).toUpperCase() + planName.slice(1)
  sendGTMEvent({
    event: 'pricing_click',
    plan_name: titleCase,
  })
}

export function trackLimitReached(limitType: LimitType): void {
  sendGTMEvent({
    event: 'limit_reached',
    limit_type: limitType,
  })
}

export function trackStorageAlert(percentage: number): void {
  sendGTMEvent({
    event: 'storage_alert',
    percentage,
  })
}

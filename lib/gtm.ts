export type SignUpMethod =
  | 'email'
  | 'google'
  | 'linkedin'
  | 'github'
  | 'formulaire_landing'
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

/** CTA landing conformité IA (header / hero / footer). */
export type LandingCtaIntent = 'essai_gratuit' | 'demande_demo'
export type LandingCtaLocation = 'header' | 'hero' | 'footer'

interface ClickButtonLandingEvent {
  event: 'click_button'
  button_intent: LandingCtaIntent
  button_location: LandingCtaLocation
}

/** Lead généré depuis le formulaire HubSpot « demande démo » (page contact). */
interface GenerateLeadHubspotDemoEvent {
  event: 'generate_lead'
  lead_type: 'demande_demo'
  method: 'hubspot_form'
}

/**
 * Événement dataLayer pour Enhanced Conversions (Google Ads via GTM).
 * Le conteneur GTM doit mapper `conversion` + `user_data` vers le tag Ads.
 */
interface GoogleAdsEnhancedConversionDataLayerEvent {
  event: 'conversion'
  user_data: {
    email: string
  }
}

interface CustomEvent {
  event: string
  [key: string]: unknown
}

export type GTMEvent =
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
  | ClickButtonLandingEvent
  | GenerateLeadHubspotDemoEvent
  | GoogleAdsEnhancedConversionDataLayerEvent
  | CustomEvent

function getDataLayer(): GTMEvent[] | undefined {
  if (typeof window === 'undefined') return undefined
  const raw = window.dataLayer
  if (!Array.isArray(raw)) return undefined
  return raw as GTMEvent[]
}

function isDataLayerAvailable(): boolean {
  return getDataLayer() !== undefined
}

export function sendGTMEvent(event: GTMEvent): void {
  const dataLayer = getDataLayer()
  if (!dataLayer) return
  dataLayer.push(event)
}

/**
 * Événement dataLayer arbitraire mais typé au minimum par `event`.
 * Préférer des entrées explicites dans {@link GTMEvent} lorsque le contrat est stable.
 */
export function sendCustomGTMEvent(
  payload: Record<string, unknown> & { event: string },
): void {
  sendGTMEvent(payload as GTMEvent)
}

/** Tracking CTA landing conformité IA (essai gratuit / démo). */
export function sendLandingCtaClick(params: {
  button_intent: LandingCtaIntent
  button_location: LandingCtaLocation
}): void {
  sendGTMEvent({
    event: 'click_button',
    button_intent: params.button_intent,
    button_location: params.button_location,
  })
}

/** Soumission réussie du formulaire HubSpot « demande démo » (page contact). */
export function sendGenerateLeadHubspotDemo(): void {
  sendGTMEvent({
    event: 'generate_lead',
    lead_type: 'demande_demo',
    method: 'hubspot_form',
  })
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
    getDataLayer()?.push(event)
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

const EMAIL_FOR_ADS_MAX_LEN = 320

/**
 * Push `conversion` + `user_data.email` sur le dataLayer (après délai consentement),
 * pour Enhanced Conversions côté GTM / Google Ads.
 */
export function sendGoogleAdsSignupConversionWithUserData(email: string): void {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || trimmed.length > EMAIL_FOR_ADS_MAX_LEN) return
  sendGTMEventAfterConsentDelay({
    event: 'conversion',
    user_data: { email: trimmed },
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

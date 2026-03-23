export type SignUpMethod = 'email' | 'google' | 'linkedin' | 'github'

interface SignUpEvent {
  event: 'sign_up'
  method: SignUpMethod
  user_id?: string
  user_email?: string
}

interface LoginEvent {
  event: 'login'
  method: SignUpMethod
  user_id?: string
  user_email?: string
}

interface PageViewEvent {
  event: 'page_view'
  page_path: string
  page_title?: string
}

interface CustomEvent {
  event: string
  [key: string]: unknown
}

type GTMEvent = SignUpEvent | LoginEvent | PageViewEvent | CustomEvent

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

export function sendSignUpEvent(
  method: SignUpMethod,
  options?: { userId?: string; userEmail?: string }
): void {
  sendGTMEvent({
    event: 'sign_up',
    method,
    ...(options?.userId && { user_id: options.userId }),
    ...(options?.userEmail && { user_email: options.userEmail }),
  })
}

export function sendLoginEvent(
  method: SignUpMethod,
  options?: { userId?: string; userEmail?: string }
): void {
  sendGTMEvent({
    event: 'login',
    method,
    ...(options?.userId && { user_id: options.userId }),
    ...(options?.userEmail && { user_email: options.userEmail }),
  })
}

export function sendPageViewEvent(pagePath: string, pageTitle?: string): void {
  sendGTMEvent({
    event: 'page_view',
    page_path: pagePath,
    ...(pageTitle && { page_title: pageTitle }),
  })
}

import type { Page } from '@playwright/test'

export const GTM_JS_REQUEST_PATTERN = /googletagmanager\.com\/gtm\.js/i
export const GA_COLLECT_REQUEST_PATTERN = /google-analytics\.com\/g\/collect/i

/** Script injecté avant navigation pour tracer dataLayer vs navigations SPA. */
export const DATA_LAYER_TRACE_INIT_SCRIPT = () => {
  type TraceEvent = { name: string; t: number }
  type TrackingTrace = { events: TraceEvent[]; navigations: number[] }

  const win = window as Window & {
    __e2eTrackingTrace?: TrackingTrace
    dataLayer?: Array<Record<string, unknown>>
  }

  win.__e2eTrackingTrace = { events: [], navigations: [] }

  const ensureDataLayer = (): Array<Record<string, unknown>> => {
    win.dataLayer = win.dataLayer || []
    return win.dataLayer
  }

  const dataLayer = ensureDataLayer()
  const originalPush = dataLayer.push.bind(dataLayer)

  dataLayer.push = function pushWithTrace(...args: unknown[]) {
    for (const arg of args) {
      const payload = arg as { event?: string }
      if (payload?.event) {
        win.__e2eTrackingTrace!.events.push({
          name: payload.event,
          t: performance.now(),
        })
      }
    }
    return originalPush(...(args as [Record<string, unknown>]))
  }

  const originalPushState = history.pushState.bind(history)
  history.pushState = function pushStateWithTrace(...args: Parameters<History['pushState']>) {
    win.__e2eTrackingTrace!.navigations.push(performance.now())
    return originalPushState(...args)
  }

  const originalReplaceState = history.replaceState.bind(history)
  history.replaceState = function replaceStateWithTrace(...args: Parameters<History['replaceState']>) {
    win.__e2eTrackingTrace!.navigations.push(performance.now())
    return originalReplaceState(...args)
  }
}

export async function installDataLayerTrace(page: Page): Promise<void> {
  await page.addInitScript(DATA_LAYER_TRACE_INIT_SCRIPT)
}

export async function waitForDataLayerEvent(
  page: Page,
  eventName: string,
  timeoutMs = 15_000,
): Promise<void> {
  await page.waitForFunction(
    (name) => {
      const trace = (window as Window & { __e2eTrackingTrace?: { events: { name: string }[] } })
        .__e2eTrackingTrace
      return trace?.events.some((event) => event.name === name) ?? false
    },
    eventName,
    { timeout: timeoutMs },
  )
}

export async function assertEventBeforeSpaNavigation(
  page: Page,
  eventName: string,
): Promise<void> {
  const ordering = await page.evaluate((name) => {
    const trace = (window as Window & {
      __e2eTrackingTrace?: { events: { name: string; t: number }[]; navigations: number[] }
    }).__e2eTrackingTrace

    if (!trace) {
      return { ok: false, reason: 'missing_trace' }
    }

    const match = trace.events.find((event) => event.name === name)
    if (!match) {
      return { ok: false, reason: 'missing_event' }
    }

    const firstNavigation = trace.navigations[0]
    if (firstNavigation === undefined) {
      return { ok: true, eventTime: match.t, navigationTime: null }
    }

    return {
      ok: match.t < firstNavigation,
      eventTime: match.t,
      navigationTime: firstNavigation,
    }
  }, eventName)

  if (!ordering.ok) {
    throw new Error(
      `Expected dataLayer event "${eventName}" before navigation (reason=${ordering.reason}, eventTime=${ordering.eventTime}, navigationTime=${ordering.navigationTime})`,
    )
  }
}

/**
 * Vérifie que le layout serveur a activé loadOfficialGTM (script Consent Mode présent).
 */
export async function assertOfficialGtmEnabledOnHome(page: Page): Promise<void> {
  const consentScriptCount = await page.locator('script#google-consent-mode').count()
  if (consentScriptCount === 0) {
    throw new Error(
      'loadOfficialGTM is not active. Build and start in production mode:\n' +
        '  NEXT_PUBLIC_VERCEL_ENV=production npm run build\n' +
        '  NODE_ENV=production NEXT_PUBLIC_VERCEL_ENV=production npm run start\n' +
        'Then re-run Playwright (reuseExistingServer if the app is already up).',
    )
  }
}

export async function triggerDeferredGtmLoad(page: Page): Promise<void> {
  await page.mouse.move(20, 20)
  await page.keyboard.press('Tab')
}

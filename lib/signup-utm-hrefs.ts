/** UTMs standard — interceptés par lib/tracking/capture-params.ts */
const UTM_SOURCE = 'maydai_website'
const UTM_MEDIUM = 'cta_button'

function buildSignupHref(campaign: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({
    utm_source: UTM_SOURCE,
    utm_medium: UTM_MEDIUM,
    utm_campaign: campaign,
  })

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      params.set(key, value)
    }
  }

  return `/signup?${params.toString()}`
}

export const SIGNUP_HREF = {
  navbar_header: buildSignupHref('navbar_header'),
  homepage_hero: buildSignupHref('homepage'),
  audit_ia_act: buildSignupHref('audit_ia_act'),
  conformite_ia: buildSignupHref('conformite_ia'),
  impact_environnemental: buildSignupHref('impact_environnemental'),
  tarifs: buildSignupHref('tarifs'),
  securite: buildSignupHref('securite'),
  login: buildSignupHref('login'),
} as const

export function signupHrefWithPlan(planId: string, campaign = 'tarifs'): string {
  return buildSignupHref(campaign, { plan: planId })
}

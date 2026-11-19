import nextConfig from '@/next.config'
import { createCSPHeader } from '@/lib/csp-nonce'

const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com'

describe('Security — Content Security Policy (Cloudflare Turnstile)', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalNodeEnv,
      writable: true,
      configurable: true,
    })
  })

  it('inclut https://challenges.cloudflare.com dans script-src, script-src-elem, frame-src et connect-src de next.config.ts en production', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    })

    expect(typeof nextConfig.headers).toBe('function')
    const rules = await nextConfig.headers!()
    const globalRule = rules.find((r) => r.source === '/(.*)')
    expect(globalRule).toBeDefined()

    const cspHeader = globalRule?.headers.find(
      (h) => h.key === 'Content-Security-Policy',
    )
    expect(cspHeader).toBeDefined()

    const directives = cspHeader!.value.split(';').map((d) => d.trim())
    const findDirective = (name: string) =>
      directives.find((d) => d.startsWith(`${name} `))

    expect(findDirective('script-src')).toContain(TURNSTILE_ORIGIN)
    expect(findDirective('script-src-elem')).toContain(TURNSTILE_ORIGIN)
    expect(findDirective('frame-src')).toContain(TURNSTILE_ORIGIN)
    expect(findDirective('connect-src')).toContain(TURNSTILE_ORIGIN)
  })

  it('inclut https://challenges.cloudflare.com dans createCSPHeader en production', () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    })

    const csp = createCSPHeader('testnonce1234567890')
    const directives = csp.split(';').map((directive) => directive.trim())
    const findDirective = (name: string) =>
      directives.find((directive) => directive.startsWith(`${name} `))

    expect(findDirective('script-src')).toContain(TURNSTILE_ORIGIN)
    expect(findDirective('script-src-elem')).toContain(TURNSTILE_ORIGIN)
    expect(findDirective('frame-src')).toContain(TURNSTILE_ORIGIN)
    expect(findDirective('connect-src')).toContain(TURNSTILE_ORIGIN)
  })
})

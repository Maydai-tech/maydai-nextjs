import type { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const TEST_PASSWORD = 'TestPassword123!'
const COOKIE_CHUNK_SIZE = 3180

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} must be set for E2E tests`)
  }
  return value
}

function getSupabaseStorageKey(supabaseUrl: string): string {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  return `sb-${projectRef}-auth-token`
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function createCookieChunks(name: string, value: string): Array<{ name: string; value: string }> {
  const encodedLength = encodeURIComponent(value).length
  if (encodedLength <= COOKIE_CHUNK_SIZE) {
    return [{ name, value }]
  }

  const chunks: Array<{ name: string; value: string }> = []
  let remaining = encodeURIComponent(value)

  while (remaining.length > 0) {
    let chunkHead = remaining.slice(0, COOKIE_CHUNK_SIZE)
    const lastEscapePos = chunkHead.lastIndexOf('%')
    if (lastEscapePos > COOKIE_CHUNK_SIZE - 3) {
      chunkHead = chunkHead.slice(0, lastEscapePos)
    }

    const chunkValue = decodeURIComponent(chunkHead)
    chunks.push({ name: `${name}.${chunks.length}`, value: chunkValue })
    remaining = remaining.slice(chunkHead.length)
  }

  return chunks
}

export async function authenticateUser(page: Page, email: string): Promise<void> {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  })

  if (error || !data.session) {
    throw new Error(`Failed to authenticate E2E user: ${error?.message ?? 'missing session'}`)
  }

  const cookieName = getSupabaseStorageKey(supabaseUrl)
  const cookieValue = `base64-${toBase64Url(JSON.stringify(data.session))}`
  const expires = Math.floor(Date.now() / 1000) + 60 * 60

  await page.context().addCookies(
    createCookieChunks(cookieName, cookieValue).map((cookie) => ({
      ...cookie,
      url: baseUrl,
      expires,
      httpOnly: false,
      secure: baseUrl.startsWith('https://'),
      sameSite: 'Lax' as const,
    }))
  )

  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session))
    },
    { storageKey: cookieName, session: data.session }
  )
}

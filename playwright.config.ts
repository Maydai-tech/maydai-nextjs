import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local for E2E tests
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const shouldStartLocalServer = baseURL.startsWith('http://localhost') || baseURL.startsWith('http://127.0.0.1')
const extraHTTPHeaders = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? {
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    }
  : undefined

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/old/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  failOnFlakyTests: !!process.env.CI,
  // Use 2 workers in CI to parallelize test files while avoiding resource issues
  // Local: undefined = use all available CPUs
  workers: process.env.CI ? 2 : undefined,
  // In CI, use JSON (for parsing) and HTML reporters
  // Locally, just use HTML
  reporter: process.env.CI
    ? [['json', { outputFile: 'test-results.json' }], ['html']]
    : 'html',

  use: {
    baseURL,
    extraHTTPHeaders,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run the dev server only when tests target a local URL.
  webServer: shouldStartLocalServer
    ? {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000, // 2 minutes for CI
      }
    : undefined,
})

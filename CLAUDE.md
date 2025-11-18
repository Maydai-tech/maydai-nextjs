# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MaydAI is a Next.js 15 application for AI Act (EU) compliance management. It helps organizations assess and manage AI use cases, conduct risk evaluations, and generate compliance reports.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Supabase (PostgreSQL), OpenAI API, Stripe

## Development Commands

### Running the Application
```bash
npm run dev              # Development server (clears .next cache first)
npm run dev:clean        # Deep clean (removes .next and node_modules/.cache)
npm run build            # Production build
npm run start            # Production server
npm run clean            # Clean cache using scripts/clean-cache.sh
```

⚠️ **CRITICAL:** Never run `npm run build` or `npm run dev` without explicit user authorization.

### Testing
```bash
npm test                      # Run all tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report
npm test -- "scoring"        # Run specific test suite
npm test -- --verbose        # Verbose output

# E2E tests
npm run cypress:open         # Interactive Cypress
npm run cypress:run          # Headless Cypress
npm run e2e                  # Alias for cypress:run
```

### Linting
```bash
npm run lint                 # ESLint check
```

### Utility Scripts
```bash
node scripts/test-scoring.js           # Verify scoring system
bash scripts/check-thomas-merge.sh     # Check thomas branch safety
bash scripts/clean-cache.sh            # Clean build cache
```

## Code Architecture

### Application Structure

```
app/                          # Next.js 15 App Router
├── api/                      # API routes (protected with auth)
│   ├── usecases/            # UseCase endpoints
│   ├── companies/           # Company management
│   ├── collaboration/       # Team collaboration
│   ├── questionnaire/       # Questionnaire responses
│   └── stripe/              # Subscription & billing
├── dashboard/[id]/          # Company dashboards
├── usecases/[id]/           # UseCase pages (overview, evaluation, rapport)
├── admin/                   # Admin panel (role-protected)
└── (public pages)/          # Marketing & legal pages

lib/                         # Shared utilities & services
├── auth.tsx                 # Client-side auth hook (useAuth)
├── api-auth.ts              # Server-side auth (getAuthenticatedSupabaseClient)
├── supabase.ts              # Supabase client setup
├── questionnaire-api.ts     # Questionnaire data layer
├── openai-client.ts         # OpenAI integration
└── stripe/                  # Stripe subscription logic

components/                  # Reusable UI components
├── Header.jsx               # Main navigation
├── Sidebar.tsx              # Authenticated user sidebar
├── ProtectedRoute.tsx       # Client-side route protection
├── AdminProtectedRoute.tsx  # Admin route protection
└── Collaboration/           # Team collaboration components
```

### Page Architecture Pattern

**ALL new pages MUST follow this pattern:**

1. **Create a descriptive file** (e.g., `CompanyDashboardPage.tsx`)
   - Contains all logic, hooks, and business code
   - Named explicitly to describe the page's purpose

2. **Create a minimal `page.tsx`** (5-10 lines max)
   - Only imports and exports the descriptive component
   - Serves as Next.js entry point

**Example:**
```tsx
// app/dashboard/[id]/page.tsx (GOOD)
import CompanyDashboardPage from './CompanyDashboardPage'

interface DashboardProps {
  params: Promise<{ id: string }>
}

export default function CompanyDashboard({ params }: DashboardProps) {
  return <CompanyDashboardPage params={params} />
}
```

```tsx
// app/dashboard/[id]/CompanyDashboardPage.tsx (GOOD)
'use client'
import { useState, useEffect } from 'react'
// ... all logic here
export default function CompanyDashboardPage({ params }: DashboardProps) {
  // Business logic
}
```

**When editing existing pages in old format** (logic in `page.tsx`), extract to a descriptive file first.

### Authentication Architecture

#### Three Standard Auth Patterns

**1. Auth Pages Pattern** (login/signup)
```tsx
const { user, loading } = useAuth()
const [isCheckingAuth, setIsCheckingAuth] = useState(true)

useEffect(() => {
  if (!loading) {
    if (user) router.push('/dashboard')
    else setIsCheckingAuth(false)
  }
}, [user, loading, router])

if (loading || isCheckingAuth) return <LoadingComponent />
```

**2. Protected Pages Pattern** (dashboard, usecases) - **MOST SECURE**
```tsx
const { user, loading } = useAuth()
const [mounted, setMounted] = useState(false)

useEffect(() => setMounted(true), [])

useEffect(() => {
  if (mounted && !loading && !user) {
    router.push('/login')
  }
}, [user, loading, router, mounted])

if (!mounted || loading) return <LoadingComponent />
if (!user) return null
```

**3. Admin Pages Pattern** (reusable component)
```tsx
export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      {/* Admin content */}
    </ProtectedRoute>
  )
}
```

**Key Rules:**
- Always use `mounted` state for SSR compatibility
- Pattern 2 (`mounted + loading`) is most secure against SSR hydration issues
- Client-side auth is UX only - real security enforced server-side

#### API Route Authentication

**ALL API routes must validate authentication:**
```tsx
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    // Verify user permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    // API logic here
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

**Files:**
- Client auth: [lib/auth.tsx](lib/auth.tsx)
- API auth: [lib/api-auth.ts](lib/api-auth.ts)
- Protected route component: [components/ProtectedRoute.tsx](components/ProtectedRoute.tsx)

### UseCase System

**3-Page Structure:**
- `/usecases/[id]` - Overview (main view)
- `/usecases/[id]/evaluation` - Questionnaire (drafts only)
- `/usecases/[id]/rapport` - Compliance report (completed only)

**Smart Navigation:**
- Draft usecases auto-redirect to `/evaluation`
- Completed usecases show full navigation
- Shared layout: [app/usecases/[id]/components/shared/UseCaseLayout.tsx](app/usecases/[id]/components/shared/UseCaseLayout.tsx)

**Key Hooks:**
- [app/usecases/[id]/hooks/useUseCaseData.ts](app/usecases/[id]/hooks/useUseCaseData.ts) - UseCase data
- [app/usecases/[id]/hooks/useEvaluation.ts](app/usecases/[id]/hooks/useEvaluation.ts) - Evaluation logic
- [app/usecases/[id]/hooks/useQuestionnaire.ts](app/usecases/[id]/hooks/useQuestionnaire.ts) - Questionnaire state

### Questionnaire System

**Dual-State Architecture:**

1. **Local state** (`questionnaireData.answers`) - Temporary UI updates
2. **Saved state** (`savedAnswers`) - Persisted in Supabase
3. **Saving strategy** - Only saves when clicking "Suivant" via `saveIndividualResponse`

**Files:**
- [app/usecases/[id]/components/questionnaire/QuestionRenderer.tsx](app/usecases/[id]/components/questionnaire/QuestionRenderer.tsx) - Question rendering
- [lib/questionnaire-api.ts](lib/questionnaire-api.ts) - API integration
- [app/usecases/[id]/utils/questionnaire.ts](app/usecases/[id]/utils/questionnaire.ts) - Utilities

### Scoring System

**Architecture:**
- Evaluates 7 risk categories based on questionnaire responses
- Calculates weighted global score for EU AI Act compliance

**Components:**
- [app/usecases/[id]/components/UseCaseScore.tsx](app/usecases/[id]/components/UseCaseScore.tsx) - Main score display
- [app/usecases/[id]/components/CategoryScores.tsx](app/usecases/[id]/components/CategoryScores.tsx) - Category breakdown

**Configuration:**
- [app/usecases/[id]/utils/risk-categories.ts](app/usecases/[id]/utils/risk-categories.ts) - Risk category definitions
- [app/usecases/[id]/utils/scoring-config.ts](app/usecases/[id]/utils/scoring-config.ts) - Scoring rules
- [app/usecases/[id]/utils/score-calculator.ts](app/usecases/[id]/utils/score-calculator.ts) - Calculation logic

**Tests:**
- [app/usecases/[id]/utils/__tests__/scoring-config.test.ts](app/usecases/[id]/utils/__tests__/scoring-config.test.ts)
- [app/usecases/[id]/utils/__tests__/risk-categories.test.ts](app/usecases/[id]/utils/__tests__/risk-categories.test.ts)
- [app/usecases/[id]/utils/__tests__/score-calculator.test.ts](app/usecases/[id]/utils/__tests__/score-calculator.test.ts)

## Testing Guidelines

### Critical Testing Rules

**🚨 MANDATORY FOR ALL NEW FEATURES:**
- ✅ New functions → Tests required
- ✅ New components → Tests required
- ✅ New API routes → Tests required
- ✅ Logic changes → Regression tests required

**🚨 TEST PROTECTION - ABSOLUTE RULES:**
- ❌ NEVER modify existing `*.test.ts` or `*.test.tsx` files without explicit user request
- ❌ NEVER delete existing tests
- ❌ NEVER change assertions without explicit permission
- ✅ ONLY add new tests
- ✅ ALL tests must pass before commit

**Workflow:**
1. Develop feature
2. Create corresponding tests
3. Verify ALL tests pass (old + new)
4. Only commit if 100% tests pass

**Test Structure:**
```typescript
describe('Module Name', () => {
  describe('Function Name', () => {
    test('should handle specific case', () => {
      // Arrange
      const input = mockData

      // Act
      const result = functionUnderTest(input)

      // Assert
      expect(result).toBe(expectedValue)
    })
  })
})
```

**Coverage Goals:**
- 100% for score calculation functions
- 95%+ for edge cases and error handling
- 100% for configurations and mappings

**Current Status:** 37 tests, 3 suites, 100% passing

## UI & Design Conventions

### Design System

**Colors:**
- Primary: `#0080A3`
- Primary Dark: `#006280` (hover states)
- Background: `bg-gray-50`
- Cards: `bg-white` with `shadow-sm` or `shadow-lg`

**Loading Pattern:**
```tsx
<div className="min-h-screen flex items-center justify-center">
  <div className="text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
    <p className="text-gray-600">Chargement...</p>
  </div>
</div>
```

### Responsive Design

**CRITICAL:** The entire app MUST be perfectly responsive for tablet and mobile.

- Mobile-first approach
- Use `sm:`, `md:`, `lg:` Tailwind breakpoints
- Sidebar collapses on mobile
- Cards stack vertically on small screens

## Production Safety

### Branch Management

**Thomas Branch Merge Checklist:**

The `thomas` branch is updated by a non-technical contributor. **ALL merges require:**

1. **Asset Verification:**
   ```bash
   bash scripts/check-thomas-merge.sh
   find . -name "* *" -o -name "*é*" -o -name "*è*" -o -name "*à*"
   ```
   - ✅ No files with spaces in names
   - ✅ No special characters/accents
   - ✅ Images optimized (< 500KB)
   - ✅ Correct placement in `/public/`

2. **Build Tests:**
   ```bash
   npm run build        # Must succeed
   npm run lint         # No critical errors
   npm test            # All tests pass
   ```

3. **Manual Verification:**
   - ✅ Homepage loads without errors
   - ✅ Navigation works
   - ✅ All images display
   - ✅ Console has no 500/CSP errors
   - ✅ Responsive design preserved

**Merge Procedure:**
```bash
# 1. Backup
git checkout dev
git branch backup-dev-$(date +%Y%m%d-%H%M%S)

# 2. Merge
git checkout thomas
git merge dev
git push origin thomas

git checkout dev
git merge thomas

# 3. Re-test
npm run build
npm run test
npm run dev
```

## Configuration Files

### Environment Variables
Required variables in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_COOKIEYES_ID=
OPENAI_API_KEY=
OPENAI_ASSISTANT_ID=
MAILJET_API_KEY=
MAILJET_SECRET_KEY=
```

Optional:
```bash
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
```

### TypeScript
- Path alias: `@/*` maps to project root
- Target: ES2020
- Strict mode enabled
- JSX: preserve (Next.js handles transformation)

### Next.js Configuration
- ESLint disabled during production builds
- Standalone output in production
- CSP headers configured for GTM, CookieYes, Stripe, HubSpot
- Automatic redirects for favicon and duplicate content

## Key Principles

1. **Security:** Always verify authentication server-side; client-side is UX only
2. **Responsive:** Every component must work on mobile/tablet
3. **Testing:** All new features require tests; never modify existing tests without permission
4. **Page Structure:** Use descriptive files, minimal `page.tsx`
5. **SSR Safety:** Always use `mounted` state for protected routes
6. **Asset Naming:** kebab-case only, no spaces or special characters
7. **Production Safety:** Run full build/test cycle before merging `thomas` branch

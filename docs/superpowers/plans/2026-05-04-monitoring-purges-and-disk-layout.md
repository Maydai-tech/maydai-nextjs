# Monitoring : historique purges Docker + refonte layout disque — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une section "Historique des purges Docker" sur `/admin/monitoring` et refondre le bloc d'occupation disque en stacked bar horizontale unique.

**Architecture:** Côté serveur prod (57.130.47.254), un wrapper bash en cron root parse l'output de `docker system prune` + `docker builder prune`, écrit un array JSON dans `/var/www/monitoring/docker-purges.json`. Côté Next.js, `app/api/admin/monitoring/route.ts` ajoute `purges`/`purgesError` au payload de `?action=disk`. Le composant `AdminMonitoringPage.tsx` utilise des helpers extraits dans `app/admin/monitoring/utils/format.ts` (testés Jest TDD) pour formater Go, calculer la couleur de la barre selon le seuil, et calculer la prochaine purge en heure de Paris.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS, Jest (next/jest), Bash 5 + GNU coreutils sur Ubuntu 24.04, nginx-host (déjà en place), Docker.

**Spec source:** `docs/superpowers/specs/2026-05-04-monitoring-purges-and-disk-layout-design.md`

---

## File Structure

| Action | Path | Responsabilité |
|--------|------|---------------|
| Create | `app/admin/monitoring/utils/format.ts` | Helpers purs : `formatGo`, `usageBarClass`, `nextPurgeFr`, `parseUsePercent` |
| Create | `app/admin/monitoring/utils/__tests__/format.test.ts` | Tests Jest des helpers |
| Modify | `app/api/admin/monitoring/route.ts` | Fetch + expose `docker-purges.json` dans la réponse `?action=disk` |
| Modify | `app/admin/monitoring/AdminMonitoringPage.tsx` | Stacked bar + nouvelle section purges |
| Modify | `.env.example` | Ajouter `MONITORING_PROD_DOCKER_PURGES_JSON_URL` |
| Create | `scripts/deploy/docker-cleanup.sh` | Wrapper de purge Docker, versionné dans le repo, déployé via SCP en `/usr/local/bin/` |

Aucun fichier de la stack questionnaire/scoring n'est touché. Aucune dépendance npm ajoutée.

**Pattern existant suivi** : helpers de formatage dans `utils/`, tests dans `utils/__tests__/`, comme `app/usecases/[id]/utils/score-calculator.ts` + `__tests__/score-calculator.test.ts`.

---

## Task 1 : Implémenter les helpers `formatGo`, `usageBarClass`, `nextPurgeFr`, `parseUsePercent` (TDD)

**Files:**
- Create: `app/admin/monitoring/utils/format.ts`
- Create: `app/admin/monitoring/utils/__tests__/format.test.ts`

- [ ] **Step 1.1 — Créer le squelette du fichier de tests**

```ts
// app/admin/monitoring/utils/__tests__/format.test.ts
import { formatGo, usageBarClass, nextPurgeFr, parseUsePercent } from '../format'

describe('formatGo', () => {
  test('returns "0 Go" for 0 bytes', () => {
    expect(formatGo(0)).toBe('0 Go')
  })

  test('returns "0 Go" for less than 50 MB (rounding noise floor)', () => {
    expect(formatGo(40_000_000)).toBe('0 Go')
  })

  test('returns one decimal with comma for sub-GB just above the floor', () => {
    expect(formatGo(950_000_000)).toBe('0,9 Go')
  })

  test('returns one decimal with comma for typical sizes', () => {
    expect(formatGo(1_500_000_000)).toBe('1,5 Go')
    expect(formatGo(50_900_000_000)).toBe('50,9 Go')
  })

  test('keeps Go suffix even past 1 TB', () => {
    expect(formatGo(1_500_000_000_000)).toBe('1500,0 Go')
  })

  test('handles negative or NaN gracefully', () => {
    expect(formatGo(NaN)).toBe('0 Go')
    expect(formatGo(-100)).toBe('0 Go')
  })
})

describe('usageBarClass', () => {
  test('green below 70%', () => {
    expect(usageBarClass(0)).toBe('bg-emerald-500')
    expect(usageBarClass(69)).toBe('bg-emerald-500')
  })

  test('orange between 70% and 84%', () => {
    expect(usageBarClass(70)).toBe('bg-orange-500')
    expect(usageBarClass(84)).toBe('bg-orange-500')
  })

  test('red at or above 85%', () => {
    expect(usageBarClass(85)).toBe('bg-red-600')
    expect(usageBarClass(100)).toBe('bg-red-600')
  })
})

describe('parseUsePercent', () => {
  test('extracts integer from "82%" string', () => {
    expect(parseUsePercent('82%')).toBe(82)
  })

  test('extracts integer from "82" without percent', () => {
    expect(parseUsePercent('82')).toBe(82)
  })

  test('returns 0 on invalid input', () => {
    expect(parseUsePercent('')).toBe(0)
    expect(parseUsePercent('not a number')).toBe(0)
    expect(parseUsePercent(undefined)).toBe(0)
  })
})

describe('nextPurgeFr', () => {
  test('mid-week Monday returns next Sunday 05h00 (CEST in May)', () => {
    const now = new Date('2026-05-04T13:00:00Z') // Lundi
    expect(nextPurgeFr(now)).toBe('dim 10 mai à 05h00')
  })

  test('Sunday before 03:00 UTC still returns same Sunday', () => {
    const now = new Date('2026-05-10T02:00:00Z')
    expect(nextPurgeFr(now)).toBe('dim 10 mai à 05h00')
  })

  test('Sunday at 03:00 UTC exactly returns NEXT Sunday', () => {
    const now = new Date('2026-05-10T03:00:00Z')
    expect(nextPurgeFr(now)).toBe('dim 17 mai à 05h00')
  })

  test('Sunday after 03:00 UTC returns NEXT Sunday', () => {
    const now = new Date('2026-05-10T03:01:00Z')
    expect(nextPurgeFr(now)).toBe('dim 17 mai à 05h00')
  })

  test('winter date returns 04h00 (CET, no DST)', () => {
    const now = new Date('2026-01-05T13:00:00Z') // Lundi 5 janvier
    expect(nextPurgeFr(now)).toBe('dim 11 janv. à 04h00')
  })
})
```

- [ ] **Step 1.2 — Lancer les tests pour confirmer qu'ils échouent**

Run:
```bash
npm test -- format
```

Expected: échec avec `Cannot find module '../format'`. C'est attendu — le fichier n'existe pas encore.

- [ ] **Step 1.3 — Implémenter `format.ts`**

Créer `app/admin/monitoring/utils/format.ts` :

```ts
const GO = 1_000_000_000
const NOISE_FLOOR_BYTES = 50_000_000

export function formatGo(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < NOISE_FLOOR_BYTES) {
    return '0 Go'
  }
  const valueInGo = bytes / GO
  const oneDecimal = (Math.round(valueInGo * 10) / 10).toFixed(1)
  return `${oneDecimal.replace('.', ',')} Go`
}

export function usageBarClass(usePercent: number): string {
  if (usePercent >= 85) return 'bg-red-600'
  if (usePercent >= 70) return 'bg-orange-500'
  return 'bg-emerald-500'
}

export function parseUsePercent(input: string | number | undefined | null): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.round(input)
  }
  if (typeof input === 'string') {
    const n = parseInt(input.replace('%', '').trim(), 10)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

const PURGE_HOUR_UTC = 3
const SUNDAY = 0

export function nextPurgeFr(now: Date = new Date()): string {
  const next = new Date(now.getTime())
  const dayOfWeek = next.getUTCDay()
  const isSundayBeforePurge =
    dayOfWeek === SUNDAY &&
    (next.getUTCHours() < PURGE_HOUR_UTC ||
      (next.getUTCHours() === PURGE_HOUR_UTC && next.getUTCMinutes() === 0 && next.getUTCSeconds() === 0 && now.getUTCHours() < PURGE_HOUR_UTC))

  // Days to add to land on the upcoming Sunday at 03:00 UTC.
  // If today is Sunday and we're strictly before 03:00 UTC -> 0 days.
  // Otherwise, advance to the next Sunday.
  let daysToAdd: number
  if (dayOfWeek === SUNDAY) {
    const beforePurge =
      next.getUTCHours() < PURGE_HOUR_UTC ||
      (next.getUTCHours() === PURGE_HOUR_UTC &&
        next.getUTCMinutes() === 0 &&
        next.getUTCSeconds() === 0 &&
        next.getUTCMilliseconds() === 0 &&
        now.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), PURGE_HOUR_UTC))
    daysToAdd = beforePurge ? 0 : 7
  } else {
    daysToAdd = (7 - dayOfWeek) % 7
    if (daysToAdd === 0) daysToAdd = 7
  }

  next.setUTCDate(next.getUTCDate() + daysToAdd)
  next.setUTCHours(PURGE_HOUR_UTC, 0, 0, 0)

  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  // Output ex: "dim. 10 mai 05:00" — we want "dim 10 mai à 05h00"
  const parts = formatter.formatToParts(next)
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const weekday = pick('weekday').replace('.', '').toLowerCase() // "dim"
  const day = pick('day')
  const month = pick('month').replace('.', '') // "mai" / "janv"
  // "janv" should appear with the dot in French abbreviations: "janv."
  const monthOut = month.length <= 4 && pick('month').endsWith('.') ? `${month}.` : month
  const hour = pick('hour')
  const minute = pick('minute')
  return `${weekday} ${day} ${monthOut} à ${hour}h${minute}`
}
```

> **Note** : la logique de `nextPurgeFr` est plus longue que strictement nécessaire pour gérer le cas `dimanche 03:00 UTC pile` (qui doit retourner le dimanche suivant). Elle est volontairement explicite plutôt que clever.

- [ ] **Step 1.4 — Relancer les tests, vérifier qu'ils passent**

Run:
```bash
npm test -- format
```

Expected: 5 + 3 + 3 + 5 = 16 tests passent. Si `nextPurgeFr` casse sur le format de mois (janvier `janv` vs `janv.`), ajuster la regex de normalisation jusqu'à ce que `dim 11 janv. à 04h00` sorte bien.

- [ ] **Step 1.5 — Vérifier qu'aucun autre test n'est cassé**

Run:
```bash
npm test
```

Expected: tous les tests existants passent (37 + 16 = 53). Si un test existant casse, c'est qu'on a touché par mégarde à autre chose — annuler la modif.

- [ ] **Step 1.6 — Commit (Hugo lance la commande)**

```bash
git add app/admin/monitoring/utils/format.ts app/admin/monitoring/utils/__tests__/format.test.ts
git commit -m "feat: add formatting helpers for monitoring page (Go/usage bar/next purge)"
```

---

## Task 2 : Étendre l'API monitoring pour exposer les purges Docker

**Files:**
- Modify: `app/api/admin/monitoring/route.ts:1-25` (constants + getters d'URL)
- Modify: `app/api/admin/monitoring/route.ts:265-326` (ajouter `getProductionDockerPurges` + intégrer dans case `disk` et case `stats`)
- Modify: `.env.example`

- [ ] **Step 2.1 — Ajouter la constante d'URL et son getter**

Dans `app/api/admin/monitoring/route.ts`, après la ligne 11 (`const MONITORING_FETCH_TIMEOUT_MS = 15_000`), ajouter :

```ts
const DEFAULT_PROD_DOCKER_PURGES_JSON_URL = 'http://57.130.47.254/monitoring/docker-purges.json'
```

Après la fonction `getProdEmailStatusJsonUrl` (lignes 20-25), ajouter :

```ts
function getProdDockerPurgesJsonUrl(): string {
  return (
    process.env.MONITORING_PROD_DOCKER_PURGES_JSON_URL?.trim() ||
    DEFAULT_PROD_DOCKER_PURGES_JSON_URL
  )
}
```

- [ ] **Step 2.2 — Ajouter le type et la fonction de fetch**

Après la fonction `getProductionEmailStatus` (qui finit ligne 286 du fichier actuel), ajouter :

```ts
type DockerPurge = {
  ranAt: string
  systemPruneReclaimedBytes: number
  builderPruneReclaimedBytes: number
  totalReclaimedBytes: number
  diskFreeBeforeBytes: number
  diskFreeAfterBytes: number
  exitCode: number
  errorMessage: string | null
}

function isDockerPurge(value: unknown): value is DockerPurge {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.ranAt === 'string' &&
    typeof v.systemPruneReclaimedBytes === 'number' &&
    typeof v.builderPruneReclaimedBytes === 'number' &&
    typeof v.totalReclaimedBytes === 'number' &&
    typeof v.diskFreeBeforeBytes === 'number' &&
    typeof v.diskFreeAfterBytes === 'number' &&
    typeof v.exitCode === 'number' &&
    (v.errorMessage === null || typeof v.errorMessage === 'string')
  )
}

async function getProductionDockerPurges(): Promise<DockerPurge[]> {
  const url = getProdDockerPurgesJsonUrl()
  const response = await monitoringFetch(url)
  if (!response.ok) {
    throw new Error(`Source purges Docker indisponible (${response.status})`)
  }
  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new Error('Réponse purges Docker : JSON illisible')
  }
  if (!Array.isArray(json)) {
    throw new Error('Réponse purges Docker : tableau attendu')
  }
  return json.filter(isDockerPurge)
}

type DockerPurgesResult = {
  purges: DockerPurge[]
  purgesError: string | null
}

async function getDockerPurgesResult(): Promise<DockerPurgesResult> {
  try {
    const purges = await getProductionDockerPurges()
    return { purges, purgesError: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Erreur lecture purges Docker:', error)
    return { purges: [], purgesError: message }
  }
}
```

- [ ] **Step 2.3 — Intégrer dans `case 'disk'` et `case 'stats'`**

Dans `case 'stats'` (qui finit ligne 312 du fichier actuel), modifier le `return` pour ajouter `purges` et `purgesError`. Code actuel :

```ts
case 'stats': {
  const { disk: diskUsage, diskError } = await getDiskUsageResult()
  let emailStatus = null
  try {
    emailStatus = await getProductionEmailStatus()
  } catch {
    emailStatus = null
  }
  return NextResponse.json({
    errors: errorMonitor.getErrorStats(),
    performance: errorMonitor.getPerformanceStats(),
    issues: errorMonitor.checkForIssues(),
    disk: diskUsage,
    diskError,
    email: emailStatus,
  })
}
```

Remplacer par :

```ts
case 'stats': {
  const [{ disk: diskUsage, diskError }, { purges, purgesError }] = await Promise.all([
    getDiskUsageResult(),
    getDockerPurgesResult(),
  ])
  let emailStatus = null
  try {
    emailStatus = await getProductionEmailStatus()
  } catch {
    emailStatus = null
  }
  return NextResponse.json({
    errors: errorMonitor.getErrorStats(),
    performance: errorMonitor.getPerformanceStats(),
    issues: errorMonitor.checkForIssues(),
    disk: diskUsage,
    diskError,
    email: emailStatus,
    purges,
    purgesError,
  })
}
```

Dans `case 'disk'` (qui finit ligne 327 du fichier actuel), code actuel :

```ts
case 'disk': {
  let emailForDisk = null
  try {
    emailForDisk = await getProductionEmailStatus()
  } catch {
    emailForDisk = null
  }
  const { disk, diskError } = await getDiskUsageResult()
  return NextResponse.json({
    disk,
    diskError,
    email: emailForDisk,
  })
}
```

Remplacer par :

```ts
case 'disk': {
  const [{ disk, diskError }, { purges, purgesError }] = await Promise.all([
    getDiskUsageResult(),
    getDockerPurgesResult(),
  ])
  let emailForDisk = null
  try {
    emailForDisk = await getProductionEmailStatus()
  } catch {
    emailForDisk = null
  }
  return NextResponse.json({
    disk,
    diskError,
    email: emailForDisk,
    purges,
    purgesError,
  })
}
```

- [ ] **Step 2.4 — Documenter la nouvelle env var dans `.env.example`**

Dans `.env.example`, à la suite du bloc Monitoring (après les deux lignes commentées `MONITORING_PROD_*`), ajouter :

```bash
# MONITORING_PROD_DOCKER_PURGES_JSON_URL=https://votre-serveur/monitoring/docker-purges.json
```

- [ ] **Step 2.5 — Vérifier qu'aucun test ne casse**

Run:
```bash
npm test
```

Expected: tous les tests passent (53 toujours, on n'a pas ajouté de test pour cette task — la fonction est I/O et serait un test d'intégration, hors scope).

- [ ] **Step 2.6 — Smoke test du endpoint en local (optionnel — Hugo lance)**

Hugo démarre le dev server (`npm run dev`) puis :
```bash
curl -s http://localhost:3000/api/admin/monitoring?action=disk | jq '{ disk: .disk.usePercent, purges_count: (.purges | length), purgesError }'
```

Expected (en local, sans .env spécifique, hits la prod par défaut) : `disk` rempli, `purges` array (potentiellement vide tant que le serveur n'a pas le fichier), `purgesError` `null` ou message.

- [ ] **Step 2.7 — Commit (Hugo lance)**

```bash
git add app/api/admin/monitoring/route.ts .env.example
git commit -m "feat: expose docker purge history in admin monitoring API"
```

---

## Task 3 : Refondre le bloc "Occupation disque" en stacked bar horizontale

**Files:**
- Modify: `app/admin/monitoring/AdminMonitoringPage.tsx:1-238`

- [ ] **Step 3.1 — Importer les helpers**

En haut du fichier, après l'import de lucide-react (ligne 4), ajouter :

```ts
import { formatGo, parseUsePercent, usageBarClass } from './utils/format'
```

- [ ] **Step 3.2 — Remplacer la logique inline de pourcentage et couleur**

Lignes 100-105 actuelles :

```ts
const usePercentNumber = diskUsage ? parseInt(diskUsage.usePercent.replace('%', ''), 10) : 0
const usageColorClass =
  usePercentNumber >= 85 ? 'text-red-700' : usePercentNumber >= 70 ? 'text-orange-700' : 'text-emerald-700'

const usageRingClass =
  usePercentNumber >= 85 ? 'stroke-red-600' : usePercentNumber >= 70 ? 'stroke-orange-600' : 'stroke-emerald-600'
```

Remplacer par :

```ts
const usePercentNumber = parseUsePercent(diskUsage?.usePercent)
const usageColorClass =
  usePercentNumber >= 85 ? 'text-red-700' : usePercentNumber >= 70 ? 'text-orange-700' : 'text-emerald-700'

const usageRingClass =
  usePercentNumber >= 85 ? 'stroke-red-600' : usePercentNumber >= 70 ? 'stroke-orange-600' : 'stroke-emerald-600'

const usageSegmentClass = usageBarClass(usePercentNumber)
const freePercent = Math.max(0, 100 - usePercentNumber)
```

- [ ] **Step 3.3 — Calculer les bytes pour `formatGo` à partir des valeurs reçues**

Le payload `disk` peut contenir `total/used/free` soit en string ("50G", "82%"...) soit en number (Go décimaux : `50.9`). On a déjà `sanitizeToNumber` qui retourne un nombre arbitraire (Go). Pour passer à `formatGo`, on a besoin de bytes.

Lignes 107-116 actuelles :

```ts
const sanitizeToNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  if (value === null || value === undefined) return 0
  return Number.parseFloat(value.toString().replace(/[^\d.]/g, ''))
}

const totalValue = sanitizeToNumber(diskUsage?.total)
const usedValue = sanitizeToNumber(diskUsage?.used)
const freeValue = sanitizeToNumber(diskUsage?.free ?? diskUsage?.available)
const maxBarValue = Math.max(totalValue, usedValue, freeValue, 1)
```

Remplacer par :

```ts
const sanitizeToNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  if (value === null || value === undefined) return 0
  return Number.parseFloat(value.toString().replace(/[^\d.]/g, ''))
}

// Les valeurs reçues sont en Go (numériques) ou en string suffixée ("50G").
// On convertit toujours en bytes via 10^9 pour l'usage de formatGo.
const totalGo = sanitizeToNumber(diskUsage?.total)
const usedGo = sanitizeToNumber(diskUsage?.used)
const freeGo = sanitizeToNumber(diskUsage?.free ?? diskUsage?.available)
const totalBytes = totalGo * 1_000_000_000
const usedBytes = usedGo * 1_000_000_000
const freeBytes = freeGo * 1_000_000_000
```

(`maxBarValue` ne sert plus — supprimé.)

- [ ] **Step 3.4 — Remplacer le JSX des 3 mini-barres par une stacked bar unique**

JSX lignes 188-214 actuelles (le `<div className="lg:col-span-2 space-y-4">` qui contient les 3 items mappés) :

```tsx
<div className="lg:col-span-2 space-y-4">
  {[
    { label: 'Total', value: diskUsage.total, numeric: totalValue, color: 'bg-[#0080A3]' },
    { label: 'Utilise', value: diskUsage.used, numeric: usedValue, color: 'bg-orange-500' },
    {
      label: 'Libre',
      value: diskUsage.free ?? diskUsage.available ?? '—',
      numeric: freeValue,
      color: 'bg-emerald-500',
    },
  ].map((item) => (
    <div key={item.label}>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700 font-medium">{item.label}</span>
        <span className="text-gray-900">{item.value}</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-3 rounded-full ${item.color} transition-all duration-500`}
          style={{ width: `${Math.max(6, (item.numeric / maxBarValue) * 100)}%` }}
        />
      </div>
    </div>
  ))}
</div>
```

Remplacer par :

```tsx
<div className="lg:col-span-2 flex flex-col justify-center gap-4">
  <div className="flex items-baseline justify-between">
    <span className="text-base font-semibold text-gray-900">Total : {formatGo(totalBytes)}</span>
  </div>

  <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden flex">
    <div
      className={`${usageSegmentClass} h-3 transition-all duration-500`}
      style={{ width: `${usePercentNumber}%` }}
      aria-label={`Utilisé ${usePercentNumber}%`}
    />
    <div
      className="bg-gray-200 h-3 transition-all duration-500"
      style={{ width: `${freePercent}%` }}
      aria-label={`Libre ${freePercent}%`}
    />
  </div>

  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2">
      <span className={`inline-block w-2 h-2 rounded-full ${usageSegmentClass}`} aria-hidden="true" />
      <span className="text-gray-700">
        Utilisé <span className="font-medium text-gray-900">{formatGo(usedBytes)}</span>{' '}
        <span className="text-gray-500">({usePercentNumber}%)</span>
      </span>
    </div>
    <div className="flex items-center gap-2">
      <span className="inline-block w-2 h-2 rounded-full bg-gray-300" aria-hidden="true" />
      <span className="text-gray-700">
        Libre <span className="font-medium text-gray-900">{formatGo(freeBytes)}</span>{' '}
        <span className="text-gray-500">({freePercent}%)</span>
      </span>
    </div>
  </div>
</div>
```

- [ ] **Step 3.5 — Vérifier qu'aucun test ne casse**

Run:
```bash
npm test
```

Expected: tous les tests passent (53). Pas de test sur le composant lui-même, mais on s'assure de ne rien avoir cassé.

- [ ] **Step 3.6 — Smoke test visuel (Hugo lance)**

Hugo démarre le dev server (`npm run dev`) et ouvre http://localhost:3000/admin/monitoring (en étant logué admin). Vérifier visuellement :
- Le donut affiche toujours le %
- La stacked bar à droite a deux segments (utilisé coloré selon seuil + libre gris)
- Total au-dessus, légende en dessous avec les deux pastilles + chiffres en Go avec virgule fr
- Layout reste responsive (md/lg)

Hugo me dit OK ou ajustement nécessaire.

- [ ] **Step 3.7 — Commit (Hugo lance)**

```bash
git add app/admin/monitoring/AdminMonitoringPage.tsx
git commit -m "feat: redesign disk usage as single stacked bar on admin monitoring"
```

---

## Task 4 : Ajouter la section "Historique des purges Docker"

**Files:**
- Modify: `app/admin/monitoring/AdminMonitoringPage.tsx`

- [ ] **Step 4.1 — Étendre `nextPurgeFr` import + ajouter le type local**

L'import de format est déjà fait à la Task 3. Ajouter `nextPurgeFr` :

```ts
import { formatGo, nextPurgeFr, parseUsePercent, usageBarClass } from './utils/format'
```

Après le bloc d'interfaces existant (lignes 6-23), ajouter :

```ts
interface DockerPurge {
  ranAt: string
  systemPruneReclaimedBytes: number
  builderPruneReclaimedBytes: number
  totalReclaimedBytes: number
  diskFreeBeforeBytes: number
  diskFreeAfterBytes: number
  exitCode: number
  errorMessage: string | null
}
```

- [ ] **Step 4.2 — Étendre les states du composant**

Après les states existants (lignes 26-29), ajouter :

```ts
const [purges, setPurges] = useState<DockerPurge[]>([])
const [purgesError, setPurgesError] = useState<string | null>(null)
```

- [ ] **Step 4.3 — Lire `purges` et `purgesError` depuis la réponse API**

Dans le `useEffect` de chargement (lignes 31-65), modifier le bloc de traitement de la réponse pour ajouter :

```ts
if (!cancelled && Array.isArray(data?.purges)) {
  setPurges(data.purges as DockerPurge[])
}
if (!cancelled) {
  setPurgesError(typeof data?.purgesError === 'string' ? data.purgesError : null)
}
```

À insérer juste après le bloc qui set `emailStatus`, dans le `try` du `loadDiskUsage`.

- [ ] **Step 4.4 — Calculer les KPIs dérivés**

Avant le `return` du composant (juste avant la ligne 127), ajouter :

```ts
const sortedPurges = [...purges].sort((a, b) => b.ranAt.localeCompare(a.ranAt))
const totalReclaimedBytes = sortedPurges.reduce((sum, p) => sum + p.totalReclaimedBytes, 0)
const nextPurgeLabel = nextPurgeFr()
```

- [ ] **Step 4.5 — Ajouter la section JSX en bas de la page**

Après la grille des 4 cartes (qui ferme ligne 234 par `</div>`), avant le `</div>` final ligne 236, ajouter :

```tsx
<section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
  <div className="flex items-start justify-between gap-4">
    <h2 className="text-lg font-semibold text-gray-900">Historique des purges Docker</h2>
    <p className="text-xs text-gray-400 whitespace-nowrap">
      Prochaine purge : {nextPurgeLabel}
    </p>
  </div>

  {sortedPurges.length === 0 ? (
    <p className="mt-4 text-sm text-gray-500">
      Pas encore d&apos;historique. La première purge a lieu dimanche prochain à 03h00 UTC.
    </p>
  ) : (
    <>
      <p className="mt-2 text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{formatGo(totalReclaimedBytes)}</span>{' '}
        libérés au total · {sortedPurges.length} purge{sortedPurges.length > 1 ? 's' : ''} enregistrée{sortedPurges.length > 1 ? 's' : ''}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 px-4 text-right">Récupéré</th>
              <th className="py-2 px-4 text-right hidden md:table-cell">Détail</th>
              <th className="py-2 pl-4 text-right hidden lg:table-cell">Avant → après (libre)</th>
            </tr>
          </thead>
          <tbody>
            {sortedPurges.map((p) => (
              <tr key={p.ranAt} className="border-t border-gray-100">
                <td className="py-2 pr-4 text-gray-700">{formatUpdatedAtFr(p.ranAt)}</td>
                <td className="py-2 px-4 text-right font-medium text-gray-900">
                  {formatGo(p.totalReclaimedBytes)}
                  {p.exitCode !== 0 && <span className="ml-2 text-xs text-amber-700">(échec)</span>}
                </td>
                <td className="py-2 px-4 text-right text-gray-500 hidden md:table-cell">
                  system : {formatGo(p.systemPruneReclaimedBytes)} · builder :{' '}
                  {formatGo(p.builderPruneReclaimedBytes)}
                </td>
                <td className="py-2 pl-4 text-right text-gray-500 hidden lg:table-cell">
                  {formatGo(p.diskFreeBeforeBytes)} → {formatGo(p.diskFreeAfterBytes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )}

  {purgesError && (
    <p className="mt-3 text-xs text-amber-700">{purgesError}</p>
  )}
</section>
```

- [ ] **Step 4.6 — Vérifier qu'aucun test ne casse**

Run:
```bash
npm test
```

Expected: 53 tests OK.

- [ ] **Step 4.7 — Smoke test visuel (Hugo lance)**

Hugo recharge http://localhost:3000/admin/monitoring. Vérifier :
- La section "Historique des purges Docker" apparaît en bas
- Tant que le serveur n'a pas le fichier, soit l'empty state ("Pas encore d'historique...") soit `purgesError` (selon que le 404 est rendu ou pas — le wrapper n'est pas encore déployé)
- Le label "Prochaine purge : dim XX [mois] à 0Xh00" est correct vis-à-vis du jour courant

Hugo me dit OK.

- [ ] **Step 4.8 — Commit (Hugo lance)**

```bash
git add app/admin/monitoring/AdminMonitoringPage.tsx
git commit -m "feat: add Docker purge history section on admin monitoring"
```

---

## Task 5 : Créer le wrapper bash `docker-cleanup.sh`

**Files:**
- Create: `scripts/deploy/docker-cleanup.sh` (chmod 755)

- [ ] **Step 5.1 — Créer le script**

Créer `scripts/deploy/docker-cleanup.sh` :

```bash
#!/usr/bin/env bash
# Wrapper de purge Docker hebdomadaire pour MaydAI prod (57.130.47.254).
# Lance docker system prune + docker builder prune, parse l'espace récupéré,
# et append une entrée dans /var/www/monitoring/docker-purges.json (max 30 entrées).
#
# Déployé en /usr/local/bin/docker-cleanup.sh (chmod 755, owner root).
# Cron: `0 3 * * 0 /usr/local/bin/docker-cleanup.sh` (crontab -e en root).

set -uo pipefail

OUT_FILE="/var/www/monitoring/docker-purges.json"
TMP_FILE="${OUT_FILE}.tmp"
MAX_ENTRIES=30

now_iso() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
df_free_bytes() { df -B1 / | awk 'NR==2 {print $4}'; }

# Convertit "1.234GB" / "0B" / "500MB" / "2.5TB" en bytes (entier).
to_bytes() {
  local input="$1"
  local num unit factor
  if [[ "$input" =~ ^([0-9]+(\.[0-9]+)?)([KMGT]?B)$ ]]; then
    num="${BASH_REMATCH[1]}"
    unit="${BASH_REMATCH[3]}"
    case "$unit" in
      B)  factor=1 ;;
      KB) factor=1000 ;;
      MB) factor=1000000 ;;
      GB) factor=1000000000 ;;
      TB) factor=1000000000000 ;;
      *)  factor=1 ;;
    esac
    awk -v n="$num" -v f="$factor" 'BEGIN { printf "%d", n*f }'
  else
    echo 0
  fi
}

# Parse "Total reclaimed space: X.XGB" depuis l'output et retourne les bytes.
parse_reclaimed() {
  grep -oE 'Total reclaimed space: [0-9.]+[KMGT]?B' "$1" \
    | tail -n 1 \
    | sed 's/Total reclaimed space: //' \
    | xargs -I{} bash -c 'declare -f to_bytes >/dev/null; to_bytes "{}"' \
    || echo 0
}

# Plus simple et plus robuste : on parse en awk dans un seul fichier temporaire.
parse_reclaimed_awk() {
  awk '
    /Total reclaimed space:/ {
      raw = $NF
      n = raw
      sub(/[KMGT]?B$/, "", n)
      unit = substr(raw, length(n)+1)
      factor = 1
      if (unit == "KB") factor = 1000
      else if (unit == "MB") factor = 1000000
      else if (unit == "GB") factor = 1000000000
      else if (unit == "TB") factor = 1000000000000
      printf "%d", n * factor
      found=1
      exit
    }
    END { if (!found) print "0" }
  ' "$1"
}

ran_at="$(now_iso)"
free_before="$(df_free_bytes)"

system_log="$(mktemp)"
builder_log="$(mktemp)"
trap 'rm -f "$system_log" "$builder_log"' EXIT

system_exit=0
builder_exit=0
error_message=""

if ! docker system prune -f --filter "until=168h" > "$system_log" 2>&1; then
  system_exit=$?
  error_message+="docker system prune exit=$system_exit. "
fi

if ! docker builder prune -f --filter "until=168h" > "$builder_log" 2>&1; then
  builder_exit=$?
  error_message+="docker builder prune exit=$builder_exit. "
fi

system_bytes="$(parse_reclaimed_awk "$system_log")"
builder_bytes="$(parse_reclaimed_awk "$builder_log")"
total_bytes=$((system_bytes + builder_bytes))

free_after="$(df_free_bytes)"
exit_code=0
if [[ $system_exit -ne 0 || $builder_exit -ne 0 ]]; then
  exit_code=1
fi

if [[ -z "$error_message" ]]; then
  error_message_json="null"
else
  # Échappe les guillemets et les backslashes pour produire un JSON valide.
  escaped="${error_message//\\/\\\\}"
  escaped="${escaped//\"/\\\"}"
  error_message_json="\"${escaped%% }\""
fi

new_entry="$(cat <<EOF
{
  "ranAt": "$ran_at",
  "systemPruneReclaimedBytes": $system_bytes,
  "builderPruneReclaimedBytes": $builder_bytes,
  "totalReclaimedBytes": $total_bytes,
  "diskFreeBeforeBytes": $free_before,
  "diskFreeAfterBytes": $free_after,
  "exitCode": $exit_code,
  "errorMessage": $error_message_json
}
EOF
)"

# Charge l'array existant (ou []), append, tronque à MAX_ENTRIES (les plus récentes).
existing="[]"
if [[ -s "$OUT_FILE" ]]; then
  if jq empty "$OUT_FILE" >/dev/null 2>&1; then
    existing="$(cat "$OUT_FILE")"
  else
    # JSON corrompu — on repart d'un tableau vide.
    logger -t docker-cleanup "JSON corrompu dans $OUT_FILE, reset à []"
  fi
fi

# Ajoute l'entrée puis ne garde que les MAX_ENTRIES plus récentes (par ranAt desc).
echo "$existing" \
  | jq --argjson entry "$new_entry" --argjson max "$MAX_ENTRIES" \
       '. + [$entry] | sort_by(.ranAt) | reverse | .[:$max] | reverse' \
  > "$TMP_FILE"

mv -f "$TMP_FILE" "$OUT_FILE"
chmod 644 "$OUT_FILE"

logger -t docker-cleanup "purge done: system=${system_bytes}B builder=${builder_bytes}B total=${total_bytes}B exit=${exit_code}"
exit 0
```

> **Note** : le script dépend de `jq` (déjà présent par défaut sur Ubuntu Server). On le vérifiera dans Task 6.

- [ ] **Step 5.2 — Le rendre exécutable**

```bash
chmod 755 scripts/deploy/docker-cleanup.sh
```

- [ ] **Step 5.3 — Lint shell (optionnel mais recommandé) — Hugo lance si shellcheck installé**

```bash
shellcheck scripts/deploy/docker-cleanup.sh
```

Expected: aucun warning critique. Si shellcheck pas installé, skip.

- [ ] **Step 5.4 — Commit (Hugo lance)**

```bash
git add scripts/deploy/docker-cleanup.sh
git commit -m "feat: add docker-cleanup.sh wrapper for weekly purge with JSON history"
```

---

## Task 6 : Déployer le wrapper sur le serveur prod (SSH + cron + premier run)

**Files:** aucun fichier du repo modifié dans cette task. Toutes les actions sont en SSH sur `ubuntu@57.130.47.254`.

> ⚠️ Cette task modifie l'infra prod (cron root + premier `docker prune` réel). Hugo doit donner le go avant l'exécution.

- [ ] **Step 6.1 — Vérifier que `jq` est installé sur le serveur**

```bash
ssh ubuntu@57.130.47.254 'jq --version'
```

Expected: une version (ex. `jq-1.7.1`). Si `command not found`, lancer `sudo apt-get install -y jq` avant de continuer.

- [ ] **Step 6.2 — Copier le script sur le serveur**

```bash
scp scripts/deploy/docker-cleanup.sh ubuntu@57.130.47.254:/tmp/docker-cleanup.sh
ssh ubuntu@57.130.47.254 'sudo install -m 755 -o root -g root /tmp/docker-cleanup.sh /usr/local/bin/docker-cleanup.sh && rm /tmp/docker-cleanup.sh && ls -la /usr/local/bin/docker-cleanup.sh'
```

Expected: `-rwxr-xr-x 1 root root … /usr/local/bin/docker-cleanup.sh`

- [ ] **Step 6.3 — Migrer le cron de ubuntu vers root**

```bash
ssh ubuntu@57.130.47.254 '
  # Backup ubuntu crontab
  crontab -l > /home/ubuntu/crontab.bak.$(date -u +%Y%m%d-%H%M%S)
  # Retirer la ligne docker prune existante (avec son commentaire de la ligne au-dessus)
  crontab -l | grep -vE "Weekly Docker cleanup|docker system prune" | crontab -
  echo "=== ubuntu crontab après ==="
  crontab -l
'
```

Puis ajouter au crontab root :

```bash
ssh ubuntu@57.130.47.254 '
  sudo bash -c "(crontab -l 2>/dev/null; echo \"0 3 * * 0 /usr/local/bin/docker-cleanup.sh\") | sort -u | crontab -"
  echo "=== root crontab ==="
  sudo crontab -l
'
```

Expected dans le output : `0 3 * * 0 /usr/local/bin/docker-cleanup.sh` présent dans crontab root, plus aucune ligne `docker system prune` dans crontab ubuntu.

- [ ] **Step 6.4 — Premier run manuel de la purge (Hugo confirme avant)**

> ⚠️ Cette commande lance une vraie purge Docker. Durée estimée : 30 s à 2 min selon ce qu'il y a à virer. Sur ce VPS qui n'a jamais été purgé via ce wrapper, l'output peut être >1GB de récupéré.

```bash
ssh ubuntu@57.130.47.254 'sudo /usr/local/bin/docker-cleanup.sh; echo "exit=$?"'
```

Expected: `exit=0`. Pas d'erreur dans l'output. Pas de sortie autre (le script log via `logger`, pas en stdout).

- [ ] **Step 6.5 — Vérifier le fichier produit**

```bash
ssh ubuntu@57.130.47.254 'sudo cat /var/www/monitoring/docker-purges.json | jq .'
```

Expected: un array JSON avec 1 entrée valide :

```json
[
  {
    "ranAt": "2026-05-04T...",
    "systemPruneReclaimedBytes": ...,
    "builderPruneReclaimedBytes": ...,
    "totalReclaimedBytes": ...,
    "diskFreeBeforeBytes": ...,
    "diskFreeAfterBytes": ...,
    "exitCode": 0,
    "errorMessage": null
  }
]
```

- [ ] **Step 6.6 — Tester l'endpoint public**

```bash
curl -i --max-time 10 http://57.130.47.254/monitoring/docker-purges.json
```

Expected: `HTTP/1.1 200 OK`, `Content-Type: application/json`, body identique au fichier serveur.

---

## Task 7 : Vérification end-to-end

**Files:** aucun.

- [ ] **Step 7.1 — Pousser sur dev + déployer (Hugo gère la PR)**

Hugo crée la PR `dev` → `main` (ou push direct sur `main` si tel est le flow), attend le déploiement Vercel.

- [ ] **Step 7.2 — Tester l'API Vercel**

```bash
curl -s 'https://www.maydai.io/api/admin/monitoring?action=disk' | jq '{ disk_pct: .disk.usePercent, purges_count: (.purges | length), purgesError, first_purge_reclaimed: .purges[0].totalReclaimedBytes }'
```

Expected: `disk_pct` valide, `purges_count >= 1`, `purgesError` null, `first_purge_reclaimed` un nombre > 0.

- [ ] **Step 7.3 — Tester l'UI**

Hugo se logue admin et ouvre https://www.maydai.io/admin/monitoring. Vérifier visuellement :
- ✅ Plus d'alerte ambre "Source monitoring indisponible"
- ✅ Donut affiche le pourcentage avec couleur sémantique (orange à 82%)
- ✅ Stacked bar horizontale unique avec deux segments (utilisé orange + libre gris) ; total au-dessus, légende en dessous
- ✅ Section "Historique des purges Docker" en bas avec :
  - Header "Prochaine purge : dim XX [mois] à 0Xh00"
  - KPI "X,X Go libérés au total · 1 purge enregistrée"
  - Tableau avec une ligne (le run manuel)
- ✅ Layout responsive (test mobile via DevTools)

Si tout est OK : implémentation terminée.

- [ ] **Step 7.4 — Smoke test : prochaine purge automatique réelle**

Pas d'action immédiate — sera vérifié dimanche prochain à 03h00 UTC. Hugo peut surveiller `sudo journalctl -t docker-cleanup --since "yesterday"` pour confirmer qu'il y a bien un nouveau log "purge done".

---

## Self-Review

**Couverture du spec** :

| Section spec | Task / Step |
|--------------|-------------|
| Composant 1 — wrapper bash | Task 5 + 6 |
| Composant 2 — API route | Task 2 |
| Composant 3 — UI refonte disque | Task 3 |
| Composant 3 — UI section purges | Task 4 |
| Composant 4 — tests Jest | Task 1 |
| Premier run manuel | Step 6.4 |
| Format date fr-FR | Helper `formatUpdatedAtFr` (existant) + `nextPurgeFr` (Task 1) |
| Empty state purges | Step 4.5 (`sortedPurges.length === 0`) |
| Hors scope (auth, alertes, historisation) | Pas dans le plan, comme prévu |

**Type / méthode consistency** :
- `DockerPurge` type : défini en Task 2 (côté API) et redéfini en Task 4 (côté composant). Volontaire (pas de type partagé pour rester dans le pattern existant du fichier). Champs identiques.
- `formatGo`, `usageBarClass`, `parseUsePercent`, `nextPurgeFr` : signature stable Task 1 → utilisée Task 3 et 4.
- `MONITORING_PROD_DOCKER_PURGES_JSON_URL` : Task 2 (route.ts) + `.env.example` Task 2 + path serveur Task 6 (cohérent).

**Placeholders / TODO** : aucun. Code complet à chaque step.

**Granularité** : chaque step est une action de 2-5 min (test → fail → impl → pass → commit). Tâches indépendantes en intra-task, dépendances inter-task explicites (Task 4 dépend de Task 3 pour l'import, Task 6 dépend de Task 5 pour le script).

---

## Execution

Plan complet et sauvegardé dans `docs/superpowers/plans/2026-05-04-monitoring-purges-and-disk-layout.md`.

Deux options pour exécuter :

1. **Subagent-Driven (recommandé)** — je dispatch un agent fresh par task, je review entre chaque task, itération rapide.
2. **Inline Execution** — j'exécute les tasks dans cette session, batch avec checkpoints entre Task 4 et Task 5 (transition repo → serveur).

Quelle approche tu préfères ?

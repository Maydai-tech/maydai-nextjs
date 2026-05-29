# Refonte du workflow d'exécution des tests E2E

**Date :** 2026-05-29
**Auteur :** Hugo (tech@deskeo.fr) + Claude
**Statut :** En attente de validation

## 1. Contexte & état actuel

L'unique workflow CI de tests est `.github/workflows/e2e-tests.yml` (~600 lignes). Il :

- se déclenche sur `push` vers `dev` et sur `pull_request` vers `main` ;
- attend un déploiement **preview Vercel** réussi pour le SHA cible (poll API GitHub deployments, environnement `Preview`, timeout 15 min) ;
- lance **toute** la suite Playwright (`pnpm exec playwright test`) contre l'URL preview ;
- parse `test-results.json`, construit des payloads Slack riches (succès / échec tests / échec build Vercel) ;
- déploie le rapport HTML sur le serveur OVH (`57.130.47.254`) via rsync SSH ;
- est **bloquant** (step final `Fail workflow on E2E failure` → `exit 1`).

**Données importantes :**

- **Une seule base Supabase** partagée par tous les environnements (preview, preprod, prod). Il n'y a pas de base prod isolée à protéger.
- Les specs E2E ont été réorganisées en sous-dossiers par domaine (réorg en cours côté working tree) : `e2e/account/`, `e2e/auth/`, `e2e/questionnaire/`, `e2e/registry/`, `e2e/scoring/`, `e2e/usecase/`. 13 specs actifs (hors `e2e/old/`, ignoré). `playwright.config.ts` cible `./e2e` récursivement, donc la nouvelle arbo fonctionne sans changement de config.
- Les specs sont **toutes destructives** : elles créent des comptes/companies/usecases via `SUPABASE_SERVICE_ROLE_KEY` puis nettoient par ID (`e2e/_helpers/db-cleanup.ts`).
- Isolation des données de test : emails `e2e-*-<timestamp>@maydai-test.com`, entités préfixées `E2E`. Risque résiduel = orphelins en cas d'échec + pollution des métriques.
- Playwright : un seul projet `chromium`, `testDir: ./e2e`, reporters JSON+HTML en CI, `retries: 2`, `failOnFlakyTests` en CI. **Aucun tag actuellement.**

## 2. Objectif

Trois régimes d'exécution distincts :

| # | Déclencheur | Tests | Bloquant | Slack | Cible |
|---|-------------|-------|----------|-------|-------|
| 1 | PR vers `preprod` | sous-ensemble `@preprod` | **Non** | Oui | preview Vercel de la PR |
| 2 | PR `preprod` → `main` | sous-ensemble `@prod` | **Oui** | Oui | preview Vercel de la PR |
| 3 | Cron nocturne | **toute la suite** | n/a (informationnel) | Oui | prod `https://maydai.io` |

Flux de branches cible : push direct sur `dev` (aucun gate) → PR `dev → preprod` (régime 1) → PR `preprod → main` (régime 2) → nightly sur prod (régime 3).

## 3. Architecture : reusable workflow + 3 callers

### 3.1 Reusable workflow `e2e-reusable.yml`

Toute la logique partagée de `e2e-tests.yml` est extraite dans un workflow réutilisable (`on: workflow_call`), paramétré :

| Input | Type | Rôle |
|-------|------|------|
| `grep_tag` | string | Tag Playwright à inclure (`@prod`). Vide = pas de filtre d'inclusion. |
| `grep_invert` | string | Tag Playwright à **exclure** (`@nightly-only`). Vide = aucune exclusion. |
| `target` | string | `preview` (attend + résout le déploiement preview Vercel de la PR) ou `prod` (utilise directement `prod_url`). |
| `prod_url` | string | URL cible quand `target=prod` (ex. `https://maydai.io`). |
| `blocking` | boolean | `true` → le job échoue si des tests échouent (`exit 1` final). `false` → le job réussit toujours, seule la notif Slack signale l'échec. |
| `regime_label` | string | Libellé affiché dans Slack/logs : `preprod`, `main-gate`, `nightly`. |

Secrets passés via `secrets: inherit` : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `SLACK_WEBHOOK_URL`, `OVH_SSH_KEY`.

**Comportement selon `target` :**

- `preview` : conserve la logique actuelle d'attente du déploiement preview Vercel (poll deployments, timeout 15 min, notif Slack dédiée en cas d'échec build). Injecte le header `x-vercel-protection-bypass` via `VERCEL_AUTOMATION_BYPASS_SECRET`.
- `prod` : **saute** entièrement l'étape d'attente preview ; `PLAYWRIGHT_BASE_URL = prod_url`. **N'injecte pas** le bypass secret (la prod n'a pas de protection Vercel preview).

**Comportement selon `blocking` :**

- Le step de tests garde `continue-on-error: true` (pour toujours parser + notifier).
- Step final conditionnel : `if blocking == true && tests == failure → exit 1`. Si `blocking == false`, le job se termine en succès même tests rouges (la notif Slack ❌ reste envoyée).

La commande de test devient :
```bash
ARGS=()
[ -n "$GREP_TAG" ]    && ARGS+=(--grep "$GREP_TAG")
[ -n "$GREP_INVERT" ] && ARGS+=(--grep-invert "$GREP_INVERT")
pnpm exec playwright test "${ARGS[@]}"
```
`--grep` et `--grep-invert` se combinent : on peut inclure un tag tout en en excluant un autre.

Le libellé `regime_label` est injecté dans les titres Slack (ex. `✅ E2E [preprod] Passed`, `❌ E2E [main-gate] Failed`, `🌙 E2E [nightly] …`).

### 3.2 Les 3 callers (fichiers courts ~15 lignes)

**`e2e-preprod.yml`**
```yaml
on:
  pull_request:
    branches: [preprod]
    types: [opened, synchronize, reopened, ready_for_review]
jobs:
  e2e:
    if: github.event.pull_request.draft == false
    uses: ./.github/workflows/e2e-reusable.yml
    with:
      grep_tag: ''                 # toute la suite (cf. §4 : seul @prod est taggé)
      grep_invert: '@nightly-only' # exclut les tests à API payante
      target: preview
      blocking: false
      regime_label: preprod
    secrets: inherit
```

**`e2e-main-gate.yml`**
```yaml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review]
jobs:
  e2e:
    if: github.event.pull_request.draft == false && github.event.pull_request.head.ref == 'preprod'
    uses: ./.github/workflows/e2e-reusable.yml
    with:
      grep_tag: '@prod'
      grep_invert: '@nightly-only' # par sécurité : un @prod ne doit jamais être payant
      target: preview
      blocking: true
      regime_label: main-gate
    secrets: inherit
```

**`e2e-nightly.yml`**
```yaml
on:
  schedule:
    - cron: '0 3 * * *'   # 05:00 Europe/Paris (été) / 04:00 (hiver) — 03:00 UTC
  workflow_dispatch:
jobs:
  e2e:
    uses: ./.github/workflows/e2e-reusable.yml
    with:
      grep_tag: ''        # toute la suite
      grep_invert: ''     # AUCUNE exclusion : les tests payants tournent ici
      target: prod
      prod_url: 'https://maydai.io'
      blocking: false     # informationnel : on veut la notif, pas un check rouge
      regime_label: nightly
    secrets: inherit
```

> Note cron : GitHub Actions est en UTC. `0 3 * * *` = 03:00 UTC = **05:00 Europe/Paris en heure d'été (CEST)**, 04:00 en heure d'hiver (CET). Conforme au choix « 05:00 Europe ».

## 4. Mapping des tags (proposé — à valider)

Tags à poser via le 3e argument de `test()` / `test.describe()` : `{ tag: ['@prod'] }` (syntaxe Playwright moderne).

**Deux tags seulement :**

### `@prod` — gate bloquant vers la prod
Posé sur un sous-ensemble **critique et stable** (plutôt API que UI, qui sont moins flaky), lancé en bloquant sur la PR `preprod → main`. Proposition (chemins de la nouvelle arbo) :
- `e2e/auth/signup.spec.ts`
- `e2e/scoring/standard.spec.ts`  *(ex score-calculation-api)*
- `e2e/usecase/lifecycle.spec.ts`
- `e2e/account/deletion.spec.ts`

Rationale : le gate bloquant doit minimiser les faux négatifs tout en couvrant les parcours critiques (inscription, scoring, cycle de vie use-case, suppression compte/RGPD). La couverture exhaustive est assurée non-bloquante (preprod) et la nuit (nightly).

### `@nightly-only` — tests à API payante
Posé sur tout test qui consomme une **API payante** (OpenAI report generation via `POST /api/generate-report`, Stripe checkout, envoi d'email Mailjet via invitations collaborateur). Exclu de preprod et du gate main (`--grep-invert @nightly-only`), exécuté uniquement la nuit.

> **Résultat de l'analyse du code (2026-05-29) : AUCUN spec actif ne consomme d'API payante aujourd'hui.**
> - `/api/generate-report` (OpenAI) n'est appelé que par un test sous `e2e/old/` (ignoré par `testIgnore`). Aucun spec actif ne l'appelle.
> - La page `/rapport` est en **lecture seule** : elle lit `usecase_nextsteps` en base, elle ne déclenche pas OpenAI. Les specs de scoring qui la visitent ne coûtent rien.
> - Aucun spec actif ne touche Stripe ni n'envoie d'email Mailjet (pas d'invitation collaborateur dans les flux testés).
>
> **Donc on ne tague rien `@nightly-only` pour l'instant.** Le mécanisme est en place : dès qu'un futur test appellera réellement une API payante (ex. un vrai test de génération de rapport OpenAI), il suffira de lui ajouter `{ tag: ['@nightly-only'] }` et il sera automatiquement confiné au nightly.

Les régimes preprod et nightly ne posent aucun tag d'inclusion : preprod lance « tout sauf `@nightly-only` », nightly lance absolument tout.

> Seule décision ouverte pour la review : la liste exacte des specs `@prod`. La liste ci-dessus est une proposition à ajuster.

## 5. Migration de l'existant

- `e2e-tests.yml` (push dev + PR main) est **remplacé** par les 3 nouveaux fichiers. Sa logique migre dans `e2e-reusable.yml`. → **suppression** de `e2e-tests.yml`.
- Conséquence : un push sur `dev` ne déclenche plus de tests (conforme au flux : push direct sur dev sans gate). Le feedback E2E arrive à la PR `dev → preprod`.
- Branch protection à mettre à jour côté GitHub (hors code) : le check requis sur `main` devient le job de `e2e-main-gate.yml` ; retirer l'ancien check `e2e-tests` des règles de `main`.

## 6. Secrets & variables requis

Aucun nouveau secret obligatoire (réutilise l'existant). `prod_url` est passé en clair (`https://maydai.io`) dans le caller nightly — non sensible. Le serveur de rapport OVH et le webhook Slack restent inchangés.

## 7. Validation des workflows

- `workflow_dispatch` est conservé sur le nightly pour pouvoir le lancer à la demande et vérifier le run contre la prod.
- Lint YAML / cohérence des expressions `if` vérifiée localement.
- Test réel : déclencher manuellement le nightly, puis ouvrir une PR de test vers `preprod` et une vers `main` depuis `preprod` (côté Hugo — l'utilisateur lance et observe lui-même, cf. règle projet « je lance les tests moi-même »).

## 8. Hors périmètre

- Pas d'écriture de nouveaux tests smoke non-destructifs (le nightly réutilise la suite complète existante).
- Pas de changement de la logique interne des specs ni des helpers de cleanup.
- Pas de mise en place d'un environnement/base prod isolé.
- Mise à jour de la doc Notion sur les tests : à faire séparément si des fichiers de tests Playwright sont créés/modifiés (ici on ne touche que les workflows + tags ; à confirmer).

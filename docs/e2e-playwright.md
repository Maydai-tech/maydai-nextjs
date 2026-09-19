# Tests E2E Playwright

Comment lancer, ce que CI fait vraiment, et les pièges (base partagée, mots de passe, rapports). Vérifié contre `playwright.config.ts`, `e2e/auth-helper.ts` et `.github/workflows/e2e-reusable.yml`.

Le plan historique `docs/superpowers/plans/2026-05-29-e2e-test-workflow-redesign.md` décrit encore un déploiement HTML sur OVH : **ne plus le suivre**.

## 1. Intention

Couvrir les parcours UI (auth, registre, questionnaire, scoring, tracking) contre une app déployée ou locale. Les specs sous `e2e/old/` sont **ignorées** (`testIgnore: '**/old/**'`).

## 2. Lancer en local

```bash
npm run e2e          # Chromium, serveur local si PLAYWRIGHT_BASE_URL est localhost
npm run e2e:ui       # UI Playwright
npm run e2e:headed
npm run e2e:debug
```

Config : `playwright.config.ts` charge `.env.local`. `PLAYWRIGHT_BASE_URL` défaut `http://localhost:3000`. Si l’URL est locale, Playwright démarre `npm run dev` (sauf si un serveur tourne déjà, hors CI).

Minimum : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. En préprod protégée : `VERCEL_AUTOMATION_BYPASS_SECRET` (header `x-vercel-protection-bypass`).

## 3. CI (workflow réutilisable)

`.github/workflows/e2e-reusable.yml` — `pnpm exec playwright test`, 2 workers, 2 retries, `failOnFlakyTests`.

Secrets : URL / anon / service role Supabase, plus `OPENAI_API_KEY` et `STRIPE_SECRET_KEY` si les specs les touchent.

Rapports :

- Artifact GitHub `playwright-report-<regime>` (HTML + `test-results/` + `test-results.json`, 7 jours).
- Slack : bouton vers le run Actions uniquement.
- **Plus de rsync** vers un nginx public. Ne pas recréer ce step.

## 4. Données de test

Le workflow le rappelle : la base Supabase préprod **est** la prod. Les specs injectent et nettoient via `SERVICE_ROLE_KEY`.

| Règle | Détail |
|-------|--------|
| Email | `*@maydai-test.com` (ex. `e2e-delete-<id>-<ts>@maydai-test.com` dans `seedV2Usecase`) |
| Mot de passe | `generateSecureTestPassword()` (`e2e/auth-helper.ts`) : 12 octets hex + `A1!`, **un par utilisateur** |
| Cleanup | par ID créé, pas par préfixe flou |

`authenticateUser(page, email, password)` pose le cookie session Supabase (chunké si trop long). Ne pas réutiliser un mot de passe en dur : collision entre specs parallèles et fuite dans les traces.

## 5. Pièges

- **Base unique.** Un test qui oublie le teardown laisse des entreprises / cas d’usage en prod. Toujours identifier `@maydai-test.com`.
- **Mot de passe unique.** Ne pas extraire une constante partagée entre fichiers.
- **`e2e/old/`** n’est pas exécuté. Le modifier ne change pas CI.
- **Rapport HTML public = régression.** Le lire via l’artifact GitHub (ou `playwright-report/` en local).
- Notion : toute **création / modification / suppression** de spec Playwright doit mettre à jour la doc tests Notion (règle projet) — ce runbook repo ne remplace pas cette page.

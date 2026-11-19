# Inscription et landings partenaires

Comment un compte est créé (`/signup`) et comment une landing co-brandée (`/p/…`) réutilise le même wizard. Vérifié contre `SignupPage.tsx`, `app/(saas)/p/learning-gate/page.tsx`, `POST /api/auth/complete-signup` et `lib/tracking/capture-params.ts`.

## 1. Intention

Une seule UI d’inscription (`SignupPage`) : OTP e-mail, puis hydratation du profil. Les landings partenaires ne changent **pas** le plan Stripe : elles changent le branding, le `noindex`, et les UTM par défaut.

Le Freemium n’est pas un SKU écrit à l’inscription. Sans abonnement Stripe, `lib/subscription/user-plan.ts` retombe sur le plan `freemium`.

## 2. Entrées

| URL | Fichier | Branding |
|-----|---------|----------|
| `/signup` | `app/(saas)/signup/page.tsx` | MaydAI seul |
| `/p/learning-gate` | `app/(saas)/p/learning-gate/page.tsx` | MaydAI × Learning Gate (`PartnerSignupConfig`) |

Les deux pages :

- exportent `robots: { index: false, follow: false }` ;
- **ne sont pas** dans `app/sitemap.ts` (`PUBLIC_PAGES`) ;
- wrappent `SignupPage` dans `<Suspense>` (le client lit `useSearchParams`).

`app/robots.ts` autorise le crawl de `/` (sauf `/api/`). Le `noindex` metadata est la barrière d’indexation, pas `disallow`.

Connecté → redirection `/dashboard/registries` (même comportement partenaire ou pas).

## 3. Wizard (client)

`SignupPage` (`app/(saas)/signup/SignupPage.tsx`) :

1. Étape 1 — prénom, nom, e-mail (`POST /api/auth/check-email` au blur).
2. Étape 2 — entreprise, secteur (`CompanySectorSelector`), CGU.
3. OTP — `signInWithOtp(email, true)` puis `verifyOtp` (`lib/auth.tsx`, type `email`).
4. `POST /api/auth/complete-signup` avec le JWT frais (`supabase.auth.getSession()`, pas le contexte React).
5. Optionnel : `POST /api/leads/link-to-user` si `?lead_id=` ; sinon `POST /api/leads/website-direct` si une attribution utile existe.
6. GTM (`sendSignUpEvent` + conversion Google Ads), pause 500 ms, `router.push('/dashboard/registries')`.

Query :

- `?plan=` — validé par `planIdSchema` (`freemium` \| `starter` \| `pro` \| `enterprise`). Invalide → ignoré.
- `?lead_id=` — figé au montage (`leadIdFromInviteRef`).

## 4. Attribution

`AttributionCapture` (layouts SaaS + marketing) fusionne à chaque navigation `gclid` / click ids / UTM vers localStorage + cookie `maydai_acquisition_v1` (90 jours). Premier click id gagnant, ordre dans `CLICK_PARAM_KEYS`. Sans UTM explicite, un click id déduit `utm_source` / `utm_medium` (ex. `gclid` → `google` / `cpc`).

À `completeSignup`, si `partnerConfig.defaultAttribution` est fourni :

| Situation | Résultat |
|-----------|----------|
| Attribution stockée **vide** | UTM partenaire (`utm_source`, `utm_medium`, `utm_campaign`) |
| Attribution stockée **partielle** | champs vides seulement, remplis par le partenaire (`fillEmptyUtm`) ; `gclid` / `click_id` inchangés |
| UTM déjà présents (URL ou visite ads) | **pas** d’écrasement par le partenaire |

Learning Gate (`defaultAttribution`) :

```ts
{ utm_source: 'learning_gate', utm_medium: 'partenariat', utm_campaign: 'freemium_learning_gate' }
```

Les UTM partenaires sont appliqués **en mémoire** au complete-signup. Ils ne sont persistés dans le cookie que si l’URL (ou une visite précédente) les a déjà capturés. Après `website-direct` OK, le client appelle `clearStoredAttribution()`.

Les CTA vitrine (`lib/signup-utm-hrefs.ts`) pointent vers `/signup?utm_source=maydai_website&utm_medium=cta_button&utm_campaign=…`, pas vers `/p/…`.

## 5. APIs

| Route | Auth | Rôle |
|-------|------|------|
| `POST /api/auth/check-email` | **aucune** | `{ exists: boolean }` via `getUserByEmail` (service role, pagination `auth.admin.listUsers`) |
| `POST /api/auth/complete-signup` | Bearer (`getAuthenticatedSupabaseClient`) | upsert `profiles` (JWT `user.id`) |
| `POST /api/leads/website-direct` | Bearer | lead `source = website_direct` (service role). Unique violation (`23505`) → 200 `{ duplicate: true }` |
| `POST /api/leads/link-to-user` | Bearer | lie un `leadId` si l’e-mail du lead = e-mail JWT, sinon 403 |

`CompleteSignupSchema` : **tous** les champs optionnels. Le commentaire JSDoc de la route (phone required, etc.) est **périmé**. L’UI exige prénom / nom / e-mail / entreprise / secteur / CGU ; l’API accepte un payload minimal (E2E `e2e/auth/signup.spec.ts`).

`complete-signup` écrit aussi `gclid` / `utm_*` sur `profiles` (tronqués à 512 caractères). Un champ acquisition **absent** du JSON devient `null` dans l’upsert — un second appel partiel peut effacer une attribution déjà stockée.

`?plan=` valide → `auth.updateUser({ data: { signup_plan_intent } })` (non bloquant). **Aucun lecteur** in-repo de `signup_plan_intent` au moment de cette page.

Liaison lead / GTM en échec : log, l’inscription continue.

## 6. Ajouter une landing partenaire

1. Logo kebab-case dans `/public/logos/` (pas d’espaces, pas d’accents) — règle assets.
2. Copier `app/(saas)/p/learning-gate/page.tsx` vers `app/(saas)/p/{slug}/page.tsx`.
3. Remplir `PartnerSignupConfig` (textes + `defaultAttribution` stables).
4. Garder `robots: { index: false, follow: false }` et **ne pas** ajouter l’URL à `PUBLIC_PAGES`.
5. Réutiliser `SignupPage` — ne pas forker le formulaire.

Pas de layout dédié sous `(saas)/p/` : le layout SaaS monte déjà `AttributionCapture`.

## 7. Pièges

- **Pas un autre tunnel de facturation.** Copy « Freemium » ≠ écriture d’un plan. Stripe checkout reste le seul chemin payant (`docs/api-auth-security.md`).
- **UTM URL > UTM partenaire.** Un visiteur déjà tagué ads / vitrine garde sa source ; Learning Gate ne fait que combler les trous.
- **`check-email` énumère les comptes.** Endpoint public ; `getUserByEmail` parcourt `listUsers` page par page (coût qui croît avec `auth.users`).
- **Pas de spec UI partenaire.** Playwright couvre `POST /api/auth/complete-signup`, pas `/p/learning-gate`.

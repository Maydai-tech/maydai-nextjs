# Auth API et durcissements récents

Comment protéger une route. Les pages client (`useAuth`, `ProtectedRoute`) sont de l’UX ; la sécurité est serveur.

## 1. Trois garde-fous

| Helper | Fichier | Quand |
|--------|---------|--------|
| `getAuthenticatedSupabaseClient(request)` | `lib/api-auth.ts` | Utilisateur connecté (RLS avec son JWT) |
| `verifyAdminAuth(request, role?)` | `lib/admin-auth.ts` | Admin / super_admin (client **service role** après check rôle) |
| Secret partagé | env | Cron Vercel, webhook Hermes, jobs internes |

`getAuthenticatedSupabaseClient` exige un header `Authorization` et appelle `auth.getUser(token)`. Exception → 401. Le client renvoyé porte le JWT (RLS).

`verifyAdminAuth` :

- 401 si pas de `Bearer`
- 404 si pas de profil
- 403 si rôle insuffisant (`admin` par défaut, ou `super_admin`)
- Log optionnel dans `admin_logs` (échec du log ≠ échec de la requête)

```ts
const { supabase, user } = await getAuthenticatedSupabaseClient(request)

const auth = await verifyAdminAuth(request) // ou 'super_admin'
if (auth.error) return auth.error
```

## 2. Crons et webhooks

| Route | Secret | Header |
|-------|--------|--------|
| `GET /api/cron/sync-llm-stats` | `CRON_SECRET` | `Authorization: Bearer …` (égalité stricte) |
| `GET /api/cron/sync-ecologits` | idem | idem |
| `GET /api/admin/comparia/sync` | `CRON_SECRET` | Bearer **ou** `x-cron-secret` (`timingSafeEqual`) |
| `POST /api/admin/comparia/sync` | cron **ou** admin | si `x-cron-secret` est envoyé et faux → 401 même pour un admin |
| `POST /api/webhooks/kb-update` | `INTERNAL_API_KEY` | `x-api-key` |
| `POST /api/webhooks/sync-siren` | `INTERNAL_API_KEY` | même schéma |
| `POST /api/admin/llm-control-tower-sync` | admin | `verifyAdminAuth` (pas de cron). Exige `GOOGLE_SHEETS_CONTROL_TOWER_ID` |
| `POST /api/admin/llm-system-cards-import` | admin | idem |
| `GET /api/storage/signed-url` | user JWT | Bearer + `user_companies` sur le `companyId` du path (`#448`) |
| `GET /api/storage/file-metadata` | user JWT | idem |

Routes user System Cards (`GET /api/system-cards/…`, `POST /api/dossiers/pillar-completion`) : Bearer via `getAuthenticatedSupabaseClient`. Le POST vérifie `user_companies` sur le `company_id` du cas d’usage. Détail : [llm-system-cards.md](./llm-system-cards.md).

`GET` / `POST /api/admin/monitoring` : `verifyAdminAuth` **et** sources JSON hôte restreintes (`lib/monitoring-source.ts`). Runbook : [admin-monitoring.md](./admin-monitoring.md).

Sans `CRON_SECRET` / `INTERNAL_API_KEY`, les routes concernées répondent 401 ou 500 (config incomplète). Vercel Cron envoie `Authorization: Bearer $CRON_SECRET`.

## 3. Durcissements août 2026 (à ne pas régresser)

### Invitations (Zero Overwrite)

Si l’email existe déjà dans `auth.users`, **aucune** de ces routes n’appelle `createProfileForUser` (service role : un appel réécrirait `first_name` / `last_name` avec le payload de l’inviteur). Self-invite interdit.

| Route | `#` | Notes |
|-------|-----|--------|
| `POST /api/collaboration/profile` | août 2026 | Ignore `role` du body ; fige `user_companies.role = 'user'` |
| `POST /api/companies/[id]/collaborators` | août 2026 | Idem |
| `POST /api/profiles/[profileId]/collaborators` | `#448` | Même Zero Overwrite ; `user_companies.role` figé à `'user'` |
| `POST /api/usecases/[id]/collaborators` | `#448` | Même Zero Overwrite. Le `role` du body sert au **lien** (`user_usecases`, ex. `human_oversight`), pas à `profiles.role` |

`createProfileForUser` (`lib/invite-user.ts`) **update encore** un profil existant s’il est appelé. Ne le brancher que après `inviteUserByEmail` pour un **nouvel** utilisateur Auth.

### Preuves de dossier (octobre 2026, `#448`)

Les uploads ne persistent plus une URL publique Storage (`getPublicUrl`). `dossier_documents.file_url` = chemin relatif `{companyId}/{usecaseId}/{docType}/{fichier}`. Les GET dossier / batch normalisent les URL historiques via `extractDossierStoragePath` (token de signed URL retiré).

| Route | Auth | Contrôle |
|-------|------|----------|
| `GET /api/storage/signed-url?path=` | Bearer | `extractDossierStoragePath` + `userCanAccessDossierPath` (`user_companies` sur le 1er segment = `companyId`) |
| `GET /api/storage/file-metadata?path=` | Bearer | Même gate (avant : JWT seul, pas de check entreprise) |

Signature : service role (`SUPABASE_SERVICE_ROLE_KEY`), bucket `dossiers`, TTL **300 s**. 401 sans Bearer ; 400 chemin invalide (`..`, mauvais bucket, moins de 2 segments) ; 403 hors `user_companies` ; 500 si la signature échoue.

UI : `UploadedFileDisplay` ouvre via signed-url (`window.open`), jamais `<a href={fileUrl}>`. Ne pas réintroduire un lien public.

Le 1er segment du path = `company_id`. Un collaborateur seulement dans `user_usecases` (sans `user_companies`) reçoit **403** à l’ouverture — aligné sur GET / upload dossier, pas sur `hasAccess` de `lib/collaborators.ts`.

Les anciennes URL publiques en base restent normalisées en lecture. Si le bucket est encore public, une URL déjà divulguée peut rester joignable hors app.

### Admin / debug

- `GET` / `POST /api/admin/monitoring` : `verifyAdminAuth` (admin). Les JSON disque / email / purges ne sont fetchés que si l’URL est loopback HTTP **ou** HTTPS + `MONITORING_BEARER_TOKEN` / basic auth. HTTP public (IP ou hostname) → source ignorée (`Source monitoring non configurée`).
- `GET /api/debug` : `verifyAdminAuth(request, 'super_admin')` uniquement.

### Rôles `profiles` (septembre 2026)

`role` ∈ `user` | `admin` | `super_admin`. Ne jamais faire confiance à un `role` envoyé par le client.

Trigger `ensure_role_security` → `prevent_role_escalation()` (`supabase/migrations/20260911154400_secure_profiles_role.sql`) :

- JWT `service_role` ou rôle DB `postgres` : pas de réécriture.
- `authenticated` / `anon` : `INSERT` force `role = NULL` ; `UPDATE` restaure `OLD.role`.

`PATCH /api/admin/users/[id]` (`verifyAdminAuth` + client service) :

| Règle | Réponse |
|-------|---------|
| L’appelant change **son** rôle | 403 `You cannot modify your own role` |
| `admin` promeut en `super_admin` | 403 `Only a super_admin can promote a user to super_admin` |
| `admin` modifie un `super_admin` | 403 `An admin cannot modify a super_admin profile` |
| Lecture rôle cible en échec | 500 `Failed to verify target user role` (pas d’update) |

Les invitations (`POST /api/collaboration/profile`) figent déjà `role: 'user'` côté API. Le trigger est la 2ᵉ ligne de défense si un client tape `profiles` en direct.

### Mistral / Stripe

- `POST /api/mistral/generate-description` : Bearer obligatoire.
- `POST /api/stripe/create-checkout-session` : Bearer obligatoire. Le `userId` du body est **ignoré**. `client_reference_id`, `metadata.user_id` / `metadata.userId` et le customer Stripe sont calés sur `user.id` du JWT. Sans Bearer → 401, Stripe n’est pas appelé. (`#439`)
- `GET /api/stripe/retrieve-session` : Bearer + le `session_id` doit appartenir à l’utilisateur (`client_reference_id` ou `metadata.user_id`). Sinon 403.

Les messages d’erreur Stripe côté client sont génériques (`lib/stripe/utils/error-handling.ts`) : ne pas renvoyer la stack Stripe au navigateur.

## 4. Checklist nouvelle route

1. Choisir **un** garde-fou (user / admin / secret). Pas de route « interne » sans secret.
2. Ne pas faire confiance à `company_id` / `role` / `session_id` / `userId` du client : recouper avec le JWT et la base. Preuves dossier : chemin relatif + signed URL, pas `getPublicUrl`.
3. Pour un job Vercel Cron : lire `CRON_SECRET` comme les crons existants (pas un nouveau header maison sans doc).
4. Ne pas logger de tokens. `verifyAdminAuth` logue déjà beaucoup : éviter d’ajouter le JWT dans les logs.
5. Sources monitoring hôte : passer par `resolveMonitoringFetchTarget` (pas d’HTTP public, pas de credentials dans l’URL).

Détail pages : `.cursor/rules/authentication-patterns.mdc`.

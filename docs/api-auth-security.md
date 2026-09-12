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
| `POST /api/admin/llm-control-tower-sync` | admin | `verifyAdminAuth` (pas de cron) |
| `POST /api/admin/llm-system-cards-import` | admin | idem |

Routes user System Cards (`GET /api/system-cards/…`, `POST /api/dossiers/pillar-completion`) : Bearer via `getAuthenticatedSupabaseClient`. Le POST vérifie `user_companies` sur le `company_id` du cas d’usage. Détail : [llm-system-cards.md](./llm-system-cards.md).

Sans `CRON_SECRET` / `INTERNAL_API_KEY`, les routes concernées répondent 401 ou 500 (config incomplète). Vercel Cron envoie `Authorization: Bearer $CRON_SECRET`.

## 3. Durcissements août 2026 (à ne pas régresser)

### Invitations

`POST /api/collaboration/profile` et `POST /api/companies/[id]/collaborators` :

- ignorent `role` du body client ;
- si l’email existe déjà dans `auth.users` : **pas** d’appel `createProfileForUser` (pas d’écrasement de profil) ;
- self-invite interdit.

### Admin / debug

- `GET /api/admin/monitoring` : `verifyAdminAuth` (admin).
- `GET /api/debug` : `verifyAdminAuth(request, 'super_admin')` uniquement.

### Mistral / Stripe

- `POST /api/mistral/generate-description` : Bearer obligatoire.
- `GET /api/stripe/retrieve-session` : Bearer + le `session_id` doit appartenir à l’utilisateur (`client_reference_id` ou `metadata.user_id`). Sinon 403.

Les messages d’erreur Stripe côté client sont génériques (`lib/stripe/utils/error-handling.ts`) : ne pas renvoyer la stack Stripe au navigateur.

## 4. Checklist nouvelle route

1. Choisir **un** garde-fou (user / admin / secret). Pas de route « interne » sans secret.
2. Ne pas faire confiance à `company_id` / `role` / `session_id` du client : recouper avec le JWT et la base.
3. Pour un job Vercel Cron : lire `CRON_SECRET` comme les crons existants (pas un nouveau header maison sans doc).
4. Ne pas logger de tokens. `verifyAdminAuth` logue déjà beaucoup : éviter d’ajouter le JWT dans les logs.

Détail pages : `.cursor/rules/authentication-patterns.mdc`.

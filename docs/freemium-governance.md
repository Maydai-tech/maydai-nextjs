# Gouvernance Freemium — cycle de vie, scores et purge 24 h

Comment un compte gratuit supprime un registre ou un cas d’usage, comment l’admin suit les collisions SIREN, et ce que le cron de purge fait vraiment. Vérifié contre `lib/services/governancePurgeService.ts`, `lib/services/governanceScoreService.ts`, `lib/services/governanceAdminService.ts`, `app/api/cron/process-purges/route.ts` et la migration `20261107180000_add_freemium_governance_and_scores.sql`.

Ne pas confondre avec [admin-monitoring.md](./admin-monitoring.md) : les « purges » hôte (Docker / disque OVH) n’ont **rien** à voir avec `lifecycle_status`.

## 1. Intention

Limiter les resets Freemium (1 fois / 30 jours), empêcher un DELETE immédiat de vider le quota, et laisser 24 h après confirmation e-mail avant le soft-delete. Un forfait payant (`planInfo.isFree !== true`) continue de cascade-supprimer tout de suite.

## 2. États (`companies` / `usecases`)

| `lifecycle_status` | Label UI | Occuppe un slot Freemium ? |
|--------------------|----------|----------------------------|
| `active` (défaut) | Actif | oui |
| `awaiting_email_confirm` | Attente confirmation email | oui |
| `purging_24h` | Sas purge 24 h | oui, **sauf** si `purge_available_at` est déjà échu (`isEntityOccupyingFreemiumSlot`) |
| `soft_deleted` | Purgé (soft 35 j) | non |

Colonnes associées : `deletion_token_hash`, `purge_requested_at`, `purge_available_at`, `soft_deleted_at`.  
Ce n’est **pas** `usecases.status` (`draft` / `completed`) ni `compl_ai_models.lifecycle_status`.

`profiles` : `profile_type` (`company` \| `advisor` \| `academic`), `entity_trust_score`, `engagement_score`, `siren_collision_flag`, `monthly_reset_count`, `last_reset_at`, plus champs Pappers (`naf_code`, `siren_verified_pappers`, académique). Trigger `protect_profile_governance_columns` : un `authenticated` non admin **ne peut pas** réécrire les scores / quota.

## 3. Flux de suppression Freemium

```
DELETE /api/companies/[id]   (owner + isFree)
DELETE /api/usecases/[id]    (accès user_companies + owner du registre isFree)
        │
        ▼
initiateFreemiumDeletionRequest
  quota canUseMonthlyFreemiumReset (1 / 30 j, calé sur last_reset_at)
  token = 32 octets hex, stocké SHA-256
  lifecycle_status = awaiting_email_confirm
  (registre → propage aux usecases sauf déjà soft_deleted)
        │
        ▼
Mailjet confirmation → e-mail de l’ACTEUR
  lien GET /api/governance/confirm-deletion?type=&id=&token=
        │
        ▼
confirmDeletionAndStart24hTimer
  jeton + statut awaiting_email_confirm requis
  nettoie Storage dossiers (échec logué, pas bloquant)
  lifecycle_status = purging_24h, purge_available_at = now + 24 h
  jeton effacé
        │
        ▼
GET /api/cron/process-purges  (toutes les 15 min, Bearer CRON_SECRET)
  purging_24h + purge_available_at ≤ now
    → soft_deleted + soft_deleted_at
    → bump monthly_reset_count / last_reset_at du OWNER
    → Mailjet « purge terminée » au OWNER
  soft_deleted depuis ≥ 35 j
    → deleteCompanyCascade / deleteUseCaseCascade
```

HTTP Freemium :

| Route | Auth | Réponse |
|-------|------|---------|
| `DELETE /api/companies/[id]` | Bearer, **owner** | **202** `{ status: 'awaiting_email_confirm' }` ; 403 `MONTHLY_RESET_QUOTA_REACHED` |
| `DELETE /api/usecases/[id]` | Bearer + `user_companies` | idem (quota lu sur le **owner** du registre, pas l’acteur) |
| `GET /api/governance/confirm-deletion` | **aucune** (jeton) | redirect `/dashboard/registries?purge_started=1` ou `?purge_error=invalid_token` |
| `POST /api/governance/confirm-deletion` | **aucune** | 200 `{ ok, status: 'purging_24h', purgeAvailableAt }` ou 400 |
| `GET /api/cron/process-purges` | `Authorization: Bearer $CRON_SECRET` | compteurs `{ softDeletedCompaniesCount, … }` ; 401 si secret absent / faux |

Payant : cascade immédiate (`deleteCompanyCascade` / `deleteUseCaseCascade`), pas de 202.

UI : `FreemiumDeletionModal` (`components/governance/FreemiumDeletionModal.tsx`).

## 4. E-mails Mailjet

| Étape | Fonction | Destinataire | Template |
|-------|----------|--------------|----------|
| Confirmation | `sendDeletionConfirmationEmail` | **acteur** (`auth.admin.getUserById(actorUserId)`) | `MAILJET_DELETION_CONFIRM_TEMPLATE_ID` ou **8508863** |
| Purge faite | `sendPurgeCompletedEmail` | **owner** (`user_companies.role = 'owner'`) | `MAILJET_PURGE_COMPLETED_TEMPLATE_ID` ou **8508931** |

From : `tech@maydai.io`. URLs calées sur `NEXT_PUBLIC_APP_URL` (défaut `https://www.maydai.io`). Un échec Mailjet est **logué** : le cron et le timer 24 h continuent.

Variables templates (les deux casses) : `first_name` / `firstName`, `entity_name` / `entityName`, `entity_type_label` (`registre` \| `cas d'usage`), `confirmation_link`, `upgrade_link` (`/abonnement`).

## 5. Scores, collisions SIREN, admin

`POST /api/auth/complete-signup` appelle (non bloquant) `detectAndRecordSirenCollision`, `calculateAndPersistEntityTrustScore`, `calculateAndPersistEngagementScore`.

- Collision : plusieurs `profiles.siren` identiques. Le plus ancien est primaire. Secondaire → `siren_collision_flag = true` + ligne `admin_alerts` (`alert_type = SIREN_COLLISION`, `status = open`).
- Matrice admin (`classifyGovernanceMatrix`) : confiance ≥ 65 × intégrité d’audit ≥ 60 → quadrants `hot_pql` / `rushed_curious` / `ghost_consultant` / `bot_or_abuse`.

| Route | Auth | Rôle |
|-------|------|------|
| `GET /api/admin/governance` | `verifyAdminAuth` | payload quadrants + users + alertes + `purging_entities` |
| `PATCH /api/admin/governance` | idem | `update_alert_status` (`open` \| `acknowledged` \| `resolved`, option `clearSecondaryCollisionFlag`) ou `recalculate_user_scores` |
| UI | `/admin/governance` | `GovernanceAdminPage` |

Recherche entreprise (profil / settings, **pas** le wizard `/signup`) : `GET /api/pappers/search?q=` (session utilisateur, `q` ≥ 2) via `ProfileGovernanceFields`. Live = `PAPPERS_API_KEY` → `https://api.pappers.fr/v2/recherche`. `PAPPERS_MOCK_MODE=true` **ou** requête contenant `zubrow` → sandbox (SIREN `123456782`).

Heartbeat multi-appareils (bannière partage de compte, **pas** le score d’engagement) : `POST /api/auth/device-heartbeat` (Bearer **ou** cookies). Upsert `user_device_sessions`. IP hashée SHA-256. `multipleDevicesDetected` si ≥ 2 devices / 2 h **ou** ≥ 3 / 7 j.

## 6. Variables

| Variable | Usage |
|----------|--------|
| `CRON_SECRET` | `GET /api/cron/process-purges` (égalité stricte `Bearer …`) |
| `MAILJET_API_KEY` / `MAILJET_API_SECRET` | confirmation + purge |
| `MAILJET_DELETION_CONFIRM_TEMPLATE_ID` | override optionnel (sinon 8508863) |
| `MAILJET_PURGE_COMPLETED_TEMPLATE_ID` | override optionnel (sinon 8508931) |
| `NEXT_PUBLIC_APP_URL` | lien de confirmation + redirects |
| `SUPABASE_SERVICE_ROLE_KEY` | purge, e-mails, scores |
| `PAPPERS_API_KEY` | recherche live |
| `PAPPERS_MOCK_MODE` | `true` → pas d’appel Pappers |

Horloge Vercel : `*/15 * * * *`, `maxDuration` 60 s (`vercel.json`).

## 7. Pièges

- **Acteur ≠ owner.** Un collaborateur qui DELETE un cas reçoit l’e-mail de confirmation ; le mail « purge faite » et le quota vont au **owner**.
- **Quota lu trop tôt.** `canUseMonthlyFreemiumReset` bloque **à la demande**, pas à la confirmation. Un 403 Freemium n’a pas encore envoyé de mail.
- **Jeton one-shot.** Après confirmation, `deletion_token_hash = null`. Relancer le lien GET → `purge_error=invalid_token`.
- **GET confirm est public.** Le secret est le token 64 hex. Ne pas logger l’URL complète.
- **Storage à T+0 de la confirmation**, pas au soft-delete. Les fichiers dossiers partent pendant le sas 24 h.
- **Slot encore occupé pendant le sas.** `isEntityOccupyingFreemiumSlot` reste vrai jusqu’à `purge_available_at` échu — un Freemium ne peut pas recréer un registre « pendant » les 24 h.
- **Cron ≠ monitoring hôte.** Sans `CRON_SECRET`, 401 ; les entités restent en `purging_24h`.
- **Payant = cascade.** Tester le 202 uniquement avec `planInfo.isFree === true`.
- **Colonnes gouvernance protégées.** Un PATCH profil client ne peut pas s’auto-créditer `monthly_reset_count`.
- **Draft `#464`** (ACL télémétrie / confirm POST) n’est **pas** sur `main` : documenter uniquement GET+POST confirm déjà livrés dans `#463`.

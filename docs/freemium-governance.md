# Gouvernance Freemium — quotas, purge 24 h, admin

Cycle de vie d’un registre / cas d’usage Freemium : confirmation e-mail, sas 24 h, soft-delete 35 j, puis cascade. Vérifié contre `lib/services/governancePurgeService.ts`, `GET /api/cron/process-purges`, `app/api/governance/confirm-deletion/route.ts` et `/api/admin/governance`.

Le Freemium n’est **pas** un SKU Stripe écrit à l’inscription. Sans abonnement, `lib/subscription/user-plan.ts` retombe sur `freemium`. Landings : [signup-partner-landings.md](./signup-partner-landings.md).

## 1. Intention

Limiter le volume de données d’un compte non payant (un slot « vivant »), tout en laissant un délai de rétractation avant la purge réelle. Les e-mails de **confirmation** partent à l’**acteur** ; les e-mails de **purge terminée** partent au **owner** du registre.

## 2. États (`lifecycle_status`)

Enum partagé `companies` / `usecases` (`LifecycleStatusSchema`) :

| Valeur | Signification |
|--------|----------------|
| `active` | Compte dans le quota |
| `awaiting_email_confirm` | Jeton SHA-256 posé, e-mail envoyé, rien n’est encore purgé |
| `purging_24h` | Confirmation OK ; Storage dossiers déjà nettoyé ; hard-delete programmé |
| `soft_deleted` | Ligne conservée 35 jours, puis cascade |

Un registre `active` / `awaiting_email_confirm` / `purging_24h` (timer non échu) occupe le slot (`isEntityOccupyingFreemiumSlot`). `soft_deleted` ne l’occupe plus. Le cron bump le quota owner au passage `soft_deleted`.

## 3. Demande de suppression

`initiateFreemiumDeletionRequest` (`lib/services/governancePurgeService.ts`), appelé depuis `DELETE /api/usecases/[id]` et `DELETE /api/companies/[id]` :

1. Quota owner : `canUseMonthlyFreemiumReset` — **1** reset glissant sur 30 jours (`profiles.monthly_reset_count` / `last_reset_at`). Refus → `{ ok: false, code: 'MONTHLY_RESET_QUOTA_REACHED', nextAvailableAt }`.
2. Jeton 32 octets hex, hash SHA-256 dans `deletion_token_hash`.
3. `lifecycle_status = awaiting_email_confirm` sur l’entité ; si registre, tous les cas d’usage **sauf** déjà `soft_deleted`.
4. Mail Mailjet à l’**acteur** (`auth.admin.getUserById(actorUserId)`), template `MAILJET_DELETION_CONFIRM_TEMPLATE_ID` (défaut `8508863`).
5. Lien : `{NEXT_PUBLIC_APP_URL}/api/governance/confirm-deletion?type=company|usecase&id=…&token=…` (`NEXT_PUBLIC_APP_URL` défaut `https://www.maydai.io`).

`skipEmailSend` est réservé aux scripts / tests.

## 4. Confirmation et sas 24 h

`GET` / `POST /api/governance/confirm-deletion` — **aucune auth**. Query ou JSON `{ type, id, token }` (`ConfirmDeletionPayloadSchema`).

`confirmDeletionAndStart24hTimer` :

- jeton + statut `awaiting_email_confirm` obligatoires, sinon `Jeton de confirmation invalide ou déjà utilisé` ;
- **immédiat** : `removeDossierStorageFiles` sur tous les dossiers de l’entité (échec Storage logué, le timer part quand même) ;
- `lifecycle_status = purging_24h`, `purge_available_at = now + 24 h`, `deletion_token_hash = null` ;
- registre → mêmes champs sur les cas d’usage non `soft_deleted`.

`GET` redirige vers `/dashboard/registries?purge_started=1` (ou `purge_error=invalid_token`). `POST` renvoie le JSON.

## 5. Cron `*/15`

`GET /api/cron/process-purges` — `Authorization: Bearer $CRON_SECRET` (égalité stricte). `vercel.json` : `*/15 * * * *`, `maxDuration` 60 s.

`processScheduledPurgesAndHardDeletes` :

1. Entités `purging_24h` dont `purge_available_at ≤ now` → `soft_deleted` + `soft_deleted_at`. Un registre entraîne ses cas. Incrémente le quota owner (`bumpOwnerReset`) et envoie `sendPurgeCompletedEmail` au **owner** (`user_companies.role = owner`), template `MAILJET_PURGE_COMPLETED_TEMPLATE_ID` (défaut `8508931`).
2. Entités `soft_deleted` depuis **≥ 35 jours** → `deleteUseCaseCascade` puis `deleteCompanyCascade` (dossiers, réponses, storage restant).

200 : `{ softDeletedCompaniesCount, softDeletedUsecasesCount, hardDeletedCompaniesCount, hardDeletedUsecasesCount }`. 401 sans secret. 500 si une requête DB lève.

Sans `CRON_SECRET`, la route répond 401 et **n’écrit rien**.

## 6. Admin `/admin/governance`

`GET` / `PATCH /api/admin/governance` — `verifyAdminAuth`.

| Méthode | Effet |
|---------|--------|
| `GET` | `buildAdminGovernancePayload` : utilisateurs, scores, alertes SIREN, quadrants (`hot_pql` / `rushed_curious` / `ghost_consultant` / `bot_or_abuse`) |
| `PATCH` `{ action: "update_alert_status", alertId, status }` | `open` \| `acknowledged` \| `resolved` ; option `clearSecondaryCollisionFlag` |
| `PATCH` `{ action: "recalculate_user_scores", userId }` | Recalcule engagement + entity trust |

Collision SIREN : `detectAndRecordSirenCollision` pose `profiles.siren_collision_flag` et une ligne `admin_alerts` (`alert_type = SIREN_COLLISION`). Ce n’est pas un blocage d’inscription.

Pappers (`GET /api/pappers/search`, `PAPPERS_API_KEY`, `PAPPERS_MOCK_MODE`) n’est **pas** listé dans `.env.example` (fichiers `.env*` hors périmètre de ce runbook).

## 7. Variables

| Variable | Usage |
|----------|--------|
| `CRON_SECRET` | Cron purge |
| `NEXT_PUBLIC_APP_URL` | Base du lien de confirmation |
| `MAILJET_API_KEY` / `MAILJET_API_SECRET` | Envoi |
| `MAILJET_DELETION_CONFIRM_TEMPLATE_ID` | Override (défaut `8508863`) |
| `MAILJET_PURGE_COMPLETED_TEMPLATE_ID` | Override (défaut `8508931`) |

## 8. Pièges

- **Acteur ≠ owner.** La confirmation part à celui qui a cliqué supprimer ; la notif de purge part au `owner` du registre. Un collaborateur peut confirmer un mail que le owner ne reçoit pas.
- **Quota au soft-delete, pas à la demande.** Un second reset pendant le sas 24 h n’est pas encore compté.
- **Storage part à la confirmation**, 24 h avant le soft-delete SQL. Un « j’ai changé d’avis » après le clic lien a déjà perdu les fichiers.
- **Pas de Playwright** pour le bandeau 24 h ni pour `/admin/governance`.
- **Jeton en clair dans l’URL GET.** Quiconque a le mail peut confirmer ; le hash en base est à usage unique.

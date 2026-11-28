# Formulaire contact — anti-bot et anti-phishing

Comment `/contact` (et les surfaces support) filtrent le spam avant d’écrire `contact_site` et d’envoyer Mailjet. Vérifié contre `app/actions/contact.ts`, `lib/validations/contact.ts`, `lib/security/turnstile.ts` et `lib/email/mailjet.ts`.

## 1. Intention

Accepter un vrai message (page contact, support, dashboard, paramètres) tout en :

1. dropant silencieusement les bots (honeypot + chrono) ;
2. refusant les TLD / téléphones jetables ;
3. exigeant Cloudflare Turnstile pour les visiteurs **non** authentifiés ;
4. neutralisant les URL dans le mail admin (`hxxp` / `[.]`).

Ce n’est **pas** une route API Bearer. C’est une Server Action (`submitContactForm`).

## 2. Surfaces et sources

| `source` | Où |
|----------|-----|
| `contact_page` | `/contact` |
| `support_page` / `dashboard_support` / `settings` | Support in-app |

Sujets : union `COMMERCIAL_SUBJECTS` + `SUPPORT_SUBJECTS` (`CONTACT_SUBJECT_OPTIONS`). Un motif hors liste → erreur Zod champ `subject`.

## 3. Pipeline (`submitContactForm`)

Ordre **fixe** — un bot ne doit pas atteindre Turnstile ni Mailjet.

### 3.1 Silent drop (`evaluateBotTrap`)

Champs cachés : `company_fax` (honeypot), `form_loaded_at` (epoch ms).

| Condition | `reason` | Réponse |
|-----------|----------|---------|
| fax non vide | `honeypot_filled` | `{ success: true }` (aucune insert) |
| timestamp absent | `missing_timestamp` | idem |
| timestamp non numérique | `invalid_timestamp` | idem |
| délai &lt; 3000 ms (`MIN_SUBMISSION_DELAY_MS`) | `submitted_too_fast` | idem |

Le client voit un succès. Log `[Action: Contact][AntiBot] Silent drop`.

### 3.2 Zod (`contactSiteSchema`)

- prénom / nom ≥ 2 caractères ;
- e-mail RFC + **TLD blacklist** (`.online`, `.xyz`, `.top`, `.click`, `.ru`, `.cn`, `.tk`, `.buzz`, `.loan`, `.work`) sur l’hôte **et** dans le message (`hasBlacklistedTldInText`) ;
- téléphone optionnel, mais s’il est fourni : FR/BE/CH/LU/CA + préfixes 07 ARCEP interdits (`070`–`073`, `079`).

Échec → `{ success: false, errors: fieldErrors }` (pas d’insert).

### 3.3 Auth optionnelle

`user_id` dans le FormData n’est honoré que s’il **égale** `supabase.auth.getUser().id`. Sinon erreur générique (pas de 401 brut).

### 3.4 Turnstile (public seulement)

Si l’utilisateur n’est **pas** authentifié avec un `user_id` concordant :

- token `cf-turnstile-response` ;
- `verifyTurnstileToken` → `https://challenges.cloudflare.com/turnstile/v0/siteverify` avec `TURNSTILE_SECRET_KEY` et l’IP `x-forwarded-for` (1er hop) ;
- échec / secret absent → « La vérification de sécurité anti-robot a échoué ou a expiré. »

Un user connecté **avec** `user_id` matching **saute** Turnstile.

Widget : `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (`components/contact/TurnstileWidget.tsx`). CSP : origine `https://challenges.cloudflare.com` dans `script-src`, `script-src-elem`, `frame-src`, `connect-src` (`createCSPHeader` / `next.config.ts`). Ne pas retirer ces origines : le widget casse.

### 3.5 Persist + mails

Insert `contact_site` (RLS via client serveur). Puis :

| Destinataire | Template |
|--------------|----------|
| visiteur, `source = contact_page` | Mailjet `8074397` |
| visiteur, autre source | Mailjet `8087654` |
| admin | `sendAdminContactNotification` — URLs **defangées** (`defangUrlsForEmail`) |

Échec Mailjet logué, l’insert reste. `revalidatePath('/admin/contacts')`.

## 4. Variables

| Variable | Usage |
|----------|--------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Widget navigateur |
| `TURNSTILE_SECRET_KEY` | Vérif serveur (obligatoire pour le public) |
| `MAILJET_API_KEY` / `MAILJET_API_SECRET` | Confirmation + notif admin |

`TURNSTILE_*` n’est pas dans `.env.example` (fichiers `.env*` hors périmètre). Sans secret, **toute** soumission publique échoue à l’étape 3.4.

## 5. Pièges

- **Silent drop = 200 métier.** Ne pas « corriger » en renvoyant une 403 : ça aide les bots à calibrer le honeypot.
- **Turnstile expiré.** Un onglet ouvert trop longtemps sans refresh du token échoue ; le message UI demande de réessayer, pas de désactiver le widget.
- **User connecté sans `user_id`.** Traité comme public → Turnstile exigé.
- **Defang admin seulement.** Le mail visiteur n’embarque pas le message libre ; le phishing reste dans `contact_site` en clair pour l’UI admin.
- **Pas de spec Playwright** `/contact` + Turnstile.

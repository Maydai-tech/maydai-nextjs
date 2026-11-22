# Formulaire contact — anti-bot et anti-phishing

Comment une demande contact/support est acceptée, persistée, puis notifiée. Vérifié contre `app/actions/contact.ts`, `lib/validations/contact.ts`, `lib/security/turnstile.ts`, `components/contact/ContactForm.tsx` et `next.config.ts`.

## 1. Intention

Filtrer le spam et le phishing **avant** `contact_site` et Mailjet, sans bloquer un prospect B2B francophone légitime (`.fr` / `.com` / `.io`, téléphone ARCEP / BE / CH / LU / CA).

Ce n’est **pas** une route `/api/*`. C’est une Server Action (`submitContactForm`) appelée par `useActionState`.

## 2. Surfaces

| Page | `source` | Turnstile UI |
|------|----------|----------------|
| `/contact` | `contact_page` (défaut) | oui |
| `/support` | `support_page` | oui |
| `/dashboard/[id]/support` | `dashboard_support` + `userId` | **non** (session déjà authentifiée) |

Le schéma Zod accepte aussi `settings` ; **aucune** page in-repo ne l’envoie.

Motifs : `COMMERCIAL_SUBJECTS` sur la vitrine, `SUPPORT_SUBJECTS` ailleurs (`lib/validations/contact.ts`).

## 3. Pipeline (ordre réel)

```
ContactForm
  honeypot company_fax + form_loaded_at
        │
        ▼
submitContactForm
  1. evaluateBotTrap          → silent drop { success: true }
  2. contactSiteSchema (Zod)  → { success: false, errors }
  3. session Supabase
  4. Turnstile si visiteur public
  5. INSERT contact_site
  6. Mailjet (confirmation + notif admin)
```

### Anti-bot (silent drop)

`evaluateBotTrap` (`MIN_SUBMISSION_DELAY_MS = 3000`) :

| Signal | `reason` | Réponse client |
|--------|----------|----------------|
| Honeypot `company_fax` rempli | `honeypot_filled` | `{ success: true }` (aucun insert, aucun mail) |
| `form_loaded_at` absent | `missing_timestamp` | idem |
| Timestamp non numérique | `invalid_timestamp` | idem |
| Soumission < 3 s | `submitted_too_fast` | idem |

Le honeypot est un champ `hidden` + `aria-hidden` (`name="company_fax"`). Ne pas le retirer ni le rendre visible.

### Validation Zod

Champs requis : `subject` (enum), prénom / nom (≥ 2), e-mail.

| Filtre | Où | Exemple rejeté |
|--------|----|----------------|
| TLD e-mail | `hasBlacklistedTldInEmail` | `bhenry@prodmail.online` |
| Lien / domaine nu dans le message | `hasBlacklistedTldInText` | `partagepro.online/doc`, `www.x.xyz` |
| Téléphone FR | préfixes 07 `070` `071` `072` `073` `079` (ARCEP M2M / non ouverts) | `0733826732` |

TLD noirs : `.online` `.xyz` `.top` `.click` `.ru` `.cn` `.tk` `.buzz` `.loan` `.work`. Un `.fr` / `.com` / `.io` avec un `06…` / `+32` / `+41` / `+352` / `+1` passe.

`user_id` dans le FormData n’est accepté que s’il égale `supabase.auth.getUser().id`. Sinon erreur générique (pas d’insert).

### Turnstile (visiteur public)

Obligatoire **sauf** `user && user_id && user.id === user_id`.

1. Widget : `TurnstileWidget` charge `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, pose `cf-turnstile-response`.
2. Vérif serveur : `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` avec `TURNSTILE_SECRET_KEY` + IP `x-forwarded-for` (premier hop).
3. Échec / expiration → message « vérification de sécurité anti-robot… ». Le widget est recréé (`resetKey`) après toute erreur de validation (jeton à usage unique).

Sans `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, le widget **ne s’affiche pas**. Sans `TURNSTILE_SECRET_KEY`, `verifyTurnstileToken` échoue → les soumissions publiques sont bloquées.

### Persist et mails

Insert `contact_site` (status défaut `new`). Échec Mailjet **logué**, la Server Action reste `{ success: true }` si l’insert a réussi.

| Destinataire | Template / canal |
|--------------|------------------|
| Visiteur `contact_page` | Mailjet `8074397`, From `contact@maydai.io` / MaydAI |
| Visiteur autre source | Mailjet `8087654`, From Support MaydAI |
| Admin `tech@maydai.io` | HTML inline, Reply-To = e-mail du visiteur |

La notif admin **neutralise** les URL (`defangUrlsForEmail`) : `https://` → `hxxps://`, `domaine.tld` → `domaine[.]tld`, plus `escapeHtml`. Ne pas renvoyer le message brut dans un template HTML.

## 4. CSP

L’en-tête servi est celui de `next.config.ts` (`headers()`), pas `createCSPHeader` (helper + tests, non branché sur `middleware.ts`).

`https://challenges.cloudflare.com` doit rester dans **les quatre** directives : `script-src`, `script-src-elem`, `frame-src`, `connect-src`. Test : `lib/security/__tests__/csp-turnstile.test.ts`.

`createCSPHeader` (prod) a la même origine Turnstile ; le mode **dev** du helper ne l’inclut pas. Si on branche ce helper en middleware, recopier l’origine dans les deux branches.

## 5. Variables

| Variable | Rôle |
|----------|------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Widget client |
| `TURNSTILE_SECRET_KEY` | `siteverify` serveur |
| `MAILJET_API_KEY` / `MAILJET_API_SECRET` | Confirmation + notif admin |

## 6. Pièges

- **Silent drop ≠ succès métier.** Un bot voit `{ success: true }` ; `contact_site` est vide. Chercher `[Action: Contact][AntiBot]` dans les logs.
- **Turnstile public only.** Ne pas l’exiger sur `dashboard_support` (session JWT). Ne pas le skipper sur `/contact` / `/support`.
- **Jeton one-shot.** Après une 400 Zod, reset du widget ; sinon Cloudflare refuse le même token.
- **CSP incomplète = widget mort.** Oublier `frame-src` ou `connect-src` casse le challenge sans erreur React évidente.
- **Ne pas réutiliser `is_active` / reCAPTCHA.** La stack est Turnstile + honeypot + Zod, pas Google reCAPTCHA.
- **Pas de spec Playwright** sur `/contact`. Couverture = Jest (`lib/validations/__tests__/contact.test.ts`, `lib/security/__tests__/turnstile.test.ts`, `csp-turnstile.test.ts`).

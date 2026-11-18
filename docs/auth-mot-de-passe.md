# Connexion par email et mot de passe (MAY-6)

La connexion et l'inscription n'utilisent plus de code OTP à 6 chiffres : email + mot de passe, et des **liens** envoyés par email (confirmation d'inscription, création / réinitialisation du mot de passe).

Règle unique : 8 caractères minimum, confirmation identique (`lib/password-policy.ts`).

## Pages

| URL | Rôle | Fichier |
|-----|------|---------|
| `/login` | Email + mot de passe. Erreurs : identifiants incorrects, email non confirmé (renvoi du lien), trop de tentatives | `app/(saas)/login/LoginPage.tsx` |
| `/login/mot-de-passe-oublie` | Première connexion ou oubli : envoie le lien (`resetPasswordForEmail`). Ne révèle jamais si le compte existe | `.../mot-de-passe-oublie/ForgotPasswordPage.tsx` |
| `/login/nouveau-mot-de-passe` | Cible du lien « Reset password » : choix du mot de passe (`updateUser`), puis `/dashboard/registries` | `.../nouveau-mot-de-passe/ResetPasswordPage.tsx` |
| `/signup` | Formulaire existant + mot de passe. `signUp` avec le profil dans `user_metadata.pending_signup`, puis écran « Confirmez votre adresse email » | `app/(saas)/signup/SignupPage.tsx` |
| `/signup/confirmation` | Cible du lien « Confirm signup » : session, `POST /api/auth/complete-signup`, liaison lead, GTM, `/dashboard/registries` | `app/(saas)/signup/confirmation/SignupConfirmationPage.tsx` |
| `/settings` (Général) | Carte « Mot de passe » : changer le mot de passe connecté | `components/Settings/PasswordChangeCard.tsx` |

## Flux

- **Session depuis un lien** (`lib/auth-email-links.ts › establishSessionFromUrl`) : `?token_hash=&type=` → `verifyOtp` ; `?code=` (PKCE, défaut de `@supabase/ssr`) → échangé automatiquement par supabase-js, sinon `exchangeCodeForSession` ; `#access_token` (implicite) → détecté par supabase-js.
- **Profil d'inscription** (`lib/signup-finalize.ts`) : les données du formulaire (noms, entreprise, secteur, UTM / partenaire Learning Gate, `?plan=`, `?lead_id=`) sont stockées dans `user_metadata.pending_signup` au `signUp`, rejouées vers `complete-signup` après confirmation, puis effacées.
- **Lien ouvert sur un autre appareil** : en PKCE, le code ne peut pas être échangé (pas de `code_verifier`), mais l'email est bien confirmé par GoTrue. La page invite à se connecter ; à la première connexion, `/login` finalise l'inscription si `pending_signup` est encore présent. Un lien de réinitialisation ouvert sur un autre navigateur affiche « Lien invalide » → redemander un lien.

## Utilisateurs existants

Les comptes créés avec l'OTP **n'ont pas de mot de passe**. Ils passent par « Première connexion ? Créez le vôtre » (bandeau de `/login`) → `/login/mot-de-passe-oublie` → lien email → `/login/nouveau-mot-de-passe`. Prévoir une communication aux clients avant la mise en prod.

## Configuration GoTrue à appliquer sur le Supabase OVH (avant déploiement)

À faire par Hugo sur l'instance self-hosted (variables du service `auth` / `.env` docker-compose), puis redémarrer le conteneur `auth`. La base est partagée par preprod et prod : la configuration vaut pour les deux.

| Réglage | Variable GoTrue (docker `.env`) | Valeur |
|---------|--------------------------------|--------|
| Confirmation email obligatoire | `GOTRUE_MAILER_AUTOCONFIRM` (`ENABLE_EMAIL_AUTOCONFIRM`) | `false` |
| Longueur minimale | `GOTRUE_PASSWORD_MIN_LENGTH` | `8` |
| URL du site | `GOTRUE_SITE_URL` (`SITE_URL`) | `https://maydai.io` |
| URLs de redirection autorisées | `GOTRUE_URI_ALLOW_LIST` (`ADDITIONAL_REDIRECT_URLS`) | `https://maydai.io/**,https://www.maydai.io/**,https://preprod.maydai.io/**` (au minimum `/login/nouveau-mot-de-passe` et `/signup/confirmation` sur chaque domaine) |
| Changement de mot de passe depuis les paramètres sans ré-authentification | `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION` | `false` |
| Durée de validité des liens (texte « valable 1 heure ») | `GOTRUE_MAILER_OTP_EXP` | `3600` |

**Templates email** (`GOTRUE_MAILER_TEMPLATES_CONFIRMATION` et `GOTRUE_MAILER_TEMPLATES_RECOVERY`, + sujets `GOTRUE_MAILER_SUBJECTS_*`) : remplacer le code `{{ .Token }}` par un lien `<a href="{{ .ConfirmationURL }}">…</a>`.

- « Confirm signup » : « Confirmer mon adresse email » → `{{ .ConfirmationURL }}`
- « Reset password » : « Choisir mon mot de passe » → `{{ .ConfirmationURL }}`

`{{ .ConfirmationURL }}` respecte le `redirectTo` envoyé par l'app (preprod ou prod). Ne pas construire le lien avec `{{ .SiteURL }}` : les utilisateurs preprod seraient envoyés en prod. Alternative compatible multi-appareils, si besoin : `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup` (resp. `type=recovery`), géré par les deux pages.

Les déploiements Preview Vercel ne sont pas dans la liste : leurs liens retombent sur `SITE_URL`.

## Local

`supabase/config.toml` : `enable_confirmations = true`, `minimum_password_length = 8`, redirections `http://127.0.0.1:3000/**` et `http://localhost:3000/**`. Les emails arrivent dans Inbucket / Mailpit (templates par défaut, déjà en lien).

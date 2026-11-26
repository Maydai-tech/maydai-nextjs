# Connexion par mot de passe, ou par code pour les anciens comptes (MAY-6)

Les nouveaux comptes se connectent par email + mot de passe, avec des **liens** envoyés par email (confirmation d'inscription, réinitialisation). Les comptes créés avant MAY-6 gardent la connexion par **code à 6 chiffres**, sans qu'on leur demande de mot de passe.

## Quel écran après l'email

`/login` demande d'abord l'email, puis `POST /api/auth/login-method` renvoie l'écran à afficher :

| Cas | Écran |
|-----|-------|
| Compte avec `user_metadata.has_password = true` | Mot de passe |
| Email inconnu | Mot de passe (on ne dit pas si le compte existe) |
| Compte existant sans le marqueur | Code à 6 chiffres (`signInWithOtp` sans création, `components/auth/OTPVerification.tsx`) |

Le marqueur `has_password` (`HAS_PASSWORD_KEY`, `lib/password-policy.ts`) est posé dans le même appel que le mot de passe : inscription, réinitialisation, paramètres. La base ne suffit pas : GoTrue stocke un mot de passe aléatoire pour chaque compte créé par code.

Règle unique (`lib/password-policy.ts`), alignée sur la recommandation CNIL : 12 caractères minimum avec majuscule, minuscule, chiffre et caractère spécial, confirmation identique. Le serveur applique la même règle et refuse les mots de passe présents dans une fuite connue (Have I Been Pwned). Les mots de passe créés avant ce changement restent valables.

## Pages

| URL | Rôle | Fichier |
|-----|------|---------|
| `/login` | Email, puis mot de passe ou code selon le compte. Erreurs : identifiants incorrects, email non confirmé (renvoi du lien), trop de tentatives | `app/(saas)/login/LoginPage.tsx` |
| `/login/mot-de-passe-oublie` | Oubli : envoie le lien (`resetPasswordForEmail`). Ne révèle jamais si le compte existe | `.../mot-de-passe-oublie/ForgotPasswordPage.tsx` |
| `/login/nouveau-mot-de-passe` | Cible du lien « Reset password » : choix du mot de passe (`updateUser`), puis `/dashboard/registries` | `.../nouveau-mot-de-passe/ResetPasswordPage.tsx` |
| `/signup` | Formulaire existant + mot de passe. `signUp` avec le profil dans `user_metadata.pending_signup`, puis écran « Confirmez votre adresse email » | `app/(saas)/signup/SignupPage.tsx` |
| `/signup/confirmation` | Cible du lien « Confirm signup » : session, `POST /api/auth/complete-signup`, liaison lead, GTM, `/dashboard/registries` | `app/(saas)/signup/confirmation/SignupConfirmationPage.tsx` |
| `/settings` (Général) | Carte « Mot de passe » : changer son mot de passe en saisissant l'actuel ; facultatif pour un ancien compte à code (« Définir un mot de passe »), qui passe alors à l'écran mot de passe | `components/Settings/PasswordChangeCard.tsx` |

## Flux

- **Session depuis un lien** (`lib/auth-email-links.ts › establishSessionFromUrl`) : `?token_hash=&type=` → `verifyOtp` ; `?code=` (PKCE, défaut de `@supabase/ssr`) → échangé automatiquement par supabase-js, sinon `exchangeCodeForSession` ; `#access_token` (implicite) → détecté par supabase-js.
- **Profil d'inscription** (`lib/signup-finalize.ts`) : les données du formulaire (noms, entreprise, secteur, UTM / partenaire Learning Gate, `?plan=`, `?lead_id=`) sont stockées dans `user_metadata.pending_signup` au `signUp`, rejouées vers `complete-signup` après confirmation, puis effacées.
- **Lien ouvert sur un autre appareil** : avec les templates en `token_hash` (voir plus bas), le lien fonctionne partout. Si un template utilisait `{{ .ConfirmationURL }}` (PKCE), le code ne pourrait pas être échangé ailleurs que dans le navigateur d'origine : la page invite alors à se connecter, et `/login` finalise l'inscription si `pending_signup` est encore présent.

## Sécurité

- `POST /api/auth/login-method` est limitée à 10 demandes par minute et par adresse IP (`lib/rate-limit.ts`, compteur en mémoire par instance). La réponse `code` révèle qu'un ancien compte existe : compromis accepté pour afficher le bon écran.
- Le marqueur `has_password` ne choisit que l'écran. La connexion par code reste acceptée par GoTrue pour tous les comptes : comme pour « Mot de passe oublié », l'accès à la boîte mail donne accès au compte.
- Après un changement ou une réinitialisation de mot de passe, les autres sessions sont fermées (`signOut({ scope: 'others' })`).
- Dans Paramètres, changer un mot de passe existant exige l'actuel. Un ancien compte à code en définit un sans cette étape.

## Utilisateurs existants

Rien ne change pour eux : email, puis code reçu par email. Aucune relance pour créer un mot de passe. Ils peuvent en définir un dans Paramètres ou via « Mot de passe oublié » ; ils passent alors à l'écran mot de passe.

## Configuration GoTrue sur le Supabase OVH

À faire par Hugo sur l'instance self-hosted (variables du service `auth`), puis redémarrer le conteneur `auth`. Le serveur est partagé par preprod et prod. Ces réglages sont compatibles avec l'ancienne version de l'app : ils peuvent être appliqués **avant** le déploiement.

| Réglage | Variable GoTrue | Valeur |
|---------|-----------------|--------|
| Confirmation email obligatoire | `GOTRUE_MAILER_AUTOCONFIRM` | `false` (déjà le cas) |
| URLs de redirection autorisées | `GOTRUE_URI_ALLOW_LIST` | `https://maydai.io/**,https://www.maydai.io/**,https://preprod.maydai.io/**` |
| Changement de mot de passe sans ré-authentification | `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION` | `false` |
| Durée de validité des liens et des codes | `GOTRUE_MAILER_OTP_EXP` | `3600` |

Règle de mot de passe côté serveur :

| Réglage | Variable GoTrue | Valeur |
|---------|-----------------|--------|
| Longueur minimale | `GOTRUE_PASSWORD_MIN_LENGTH` | `12` |
| Types exigés | `GOTRUE_PASSWORD_REQUIRED_CHARACTERS` | minuscules, majuscules, chiffres, symboles (mêmes symboles que `PASSWORD_SPECIAL_CHARACTERS`) |
| Refus des mots de passe ayant fuité | `GOTRUE_PASSWORD_HIBP_ENABLED` | `true` (si le service est injoignable, le mot de passe est accepté) |

Dans `docker-compose.yml`, doubler le `$` de la liste de symboles (`$$`).

**Templates email** (fichiers servis par le conteneur `email-templates`, dossier `/opt/supabase/volumes/auth/templates`)

| Template | Envoyé pour | Contenu |
|----------|-------------|---------|
| `magic_link.html` | Connexion par code d'un ancien compte | **Inchangé** : code `{{ .Token }}` |
| `confirmation.html` | Inscription ; et connexion par code d'un ancien compte jamais confirmé | **Lien et code** : bouton « Confirmer mon adresse email » + `{{ .Token }}` |
| `recovery.html` (nouveau, `GOTRUE_MAILER_TEMPLATES_RECOVERY`) | Mot de passe oublié | Bouton « Choisir mon mot de passe » |

Les boutons pointent vers l'app, pas vers GoTrue :

- confirmation : `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`
- réinitialisation : `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`

La page appelle ensuite `verifyOtp({ token_hash, type })` : le lien marche sur n'importe quel appareil, et un antivirus de messagerie qui pré-ouvre les liens ne consomme pas le jeton. `{{ .RedirectTo }}` reprend l'adresse envoyée par l'app (prod ou preprod) si elle figure dans `GOTRUE_URI_ALLOW_LIST`, sinon `GOTRUE_SITE_URL`.

Le code doit rester dans `confirmation.html` : GoTrue envoie ce template, et non `magic_link.html`, quand un compte non confirmé demande un code.

Les déploiements Preview Vercel ne sont pas dans la liste : leurs liens retombent sur `SITE_URL`.

## Local

`supabase/config.toml` : `enable_confirmations = true`, `minimum_password_length = 12`, `password_requirements = "lower_upper_letters_digits_symbols"`, redirections `http://127.0.0.1:3000/**` et `http://localhost:3000/**`. Les emails arrivent dans Inbucket / Mailpit (templates par défaut, déjà en lien).

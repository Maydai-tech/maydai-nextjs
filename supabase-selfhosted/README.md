# Supabase Self-Hosted - Configuration

Ce dossier contient les fichiers de configuration pour l'instance Supabase self-hosted sur OVH.

## Serveur OVH

| Info | Valeur |
|------|--------|
| **IP** | `57.130.47.254` |
| **User** | `ubuntu` |
| **Chemin Supabase** | `/opt/supabase` |
| **Studio URL** | `https://studio.maydai.io` |
| **API URL** | `https://api.maydai.io` |

```bash
# Connexion SSH
ssh ubuntu@57.130.47.254

# Accès direct au dossier Supabase
ssh ubuntu@57.130.47.254 -t "cd /opt/supabase && bash"
```

## Structure

```
supabase-selfhosted/
├── templates/
│   └── magic_link.html    # Template email OTP/Magic Link
└── README.md
```

## Architecture des templates email

GoTrue (le service d'authentification) nécessite que les templates soient accessibles via **HTTP**, pas depuis le filesystem local.

L'architecture mise en place :

```
┌─────────────────┐     HTTP      ┌──────────────────┐
│  supabase-auth  │ ───────────► │  email-templates │
│    (GoTrue)     │               │     (nginx)      │
└─────────────────┘               └──────────────────┘
                                           │
                                           ▼
                              /opt/supabase/volumes/auth/templates/
                                     └── magic_link.html
```

### Services Docker

| Service | Image | Rôle |
|---------|-------|------|
| `auth` | `supabase/gotrue:v2.164.0` | Service d'authentification |
| `email-templates` | `nginx:alpine` | Sert les templates HTML via HTTP |

### Configuration docker-compose.yml

```yaml
services:
  # GoTrue Auth
  auth:
    image: supabase/gotrue:v2.164.0
    volumes:
      - ./volumes/auth/templates:/templates:ro
    environment:
      # Templates email (URL vers le serveur nginx)
      GOTRUE_MAILER_TEMPLATES_MAGIC_LINK: http://email-templates/magic_link.html
      GOTRUE_MAILER_SUBJECTS_MAGIC_LINK: "Code de connexion MayDai"
    # ...

  # Serveur de templates
  email-templates:
    image: nginx:alpine
    container_name: email-templates
    restart: unless-stopped
    volumes:
      - ./volumes/auth/templates:/usr/share/nginx/html:ro
    networks:
      - supabase
```

## Variables de template

Les templates utilisent le moteur de templates Go :

| Variable | Description |
|----------|-------------|
| `{{ .Token }}` | Code OTP à 6 chiffres |
| `{{ .TokenHash }}` | Hash du token (pour construire des URLs) |
| `{{ .ConfirmationURL }}` | URL de confirmation complète |
| `{{ .SiteURL }}` | URL du site (configuré dans GoTrue) |
| `{{ .Email }}` | Email de l'utilisateur |
| `{{ .RedirectTo }}` | URL de redirection après confirmation |

## Modifier un template

### 1. Modifier le fichier localement

```bash
# Éditer le template
nano supabase-selfhosted/templates/magic_link.html
```

### 2. Déployer sur le serveur

```bash
# Copier le template
scp supabase-selfhosted/templates/magic_link.html ubuntu@57.130.47.254:/opt/supabase/volumes/auth/templates/

# S'assurer des permissions (important!)
ssh ubuntu@57.130.47.254 "chmod 644 /opt/supabase/volumes/auth/templates/*.html"
```

**Pas besoin de redémarrer** - GoTrue recharge le template à chaque envoi d'email.

### 3. Modifier directement sur le serveur

```bash
ssh ubuntu@57.130.47.254
nano /opt/supabase/volumes/auth/templates/magic_link.html
```

## Templates disponibles

| Template | Variable d'environnement | Description |
|----------|-------------------------|-------------|
| Magic Link | `GOTRUE_MAILER_TEMPLATES_MAGIC_LINK` | Connexion OTP/Magic Link |
| Confirmation | `GOTRUE_MAILER_TEMPLATES_CONFIRMATION` | Confirmation d'inscription |
| Recovery | `GOTRUE_MAILER_TEMPLATES_RECOVERY` | Réinitialisation mot de passe |
| Invite | `GOTRUE_MAILER_TEMPLATES_INVITE` | Invitation utilisateur |
| Email Change | `GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE` | Changement d'email |

### Ajouter un nouveau template

1. Créer le fichier HTML dans `supabase-selfhosted/templates/`
2. Copier sur le serveur avec les bonnes permissions
3. Ajouter la variable dans `docker-compose.yml` :
   ```yaml
   GOTRUE_MAILER_TEMPLATES_RECOVERY: http://email-templates/recovery.html
   GOTRUE_MAILER_SUBJECTS_RECOVERY: "Réinitialisez votre mot de passe"
   ```
4. Recréer le service auth : `docker compose up -d auth --force-recreate`

## Dépannage

### L'email n'utilise pas le nouveau template

1. Vérifier que nginx peut servir le fichier :
```bash
docker exec supabase-auth wget -qO- http://email-templates/magic_link.html | head -5
```

2. Vérifier les permissions (doit être 644) :
```bash
ls -la /opt/supabase/volumes/auth/templates/
chmod 644 /opt/supabase/volumes/auth/templates/*.html
```

3. Vérifier les logs pour des erreurs :
```bash
docker compose logs auth | grep -i template
```

### Erreur 403 Forbidden

Les permissions du fichier sont trop restrictives :
```bash
chmod 644 /opt/supabase/volumes/auth/templates/*.html
```

### Erreur "connection refused"

Le service `email-templates` n'est pas démarré :
```bash
docker compose up -d email-templates
docker compose ps email-templates
```

### Tester l'envoi d'email

1. Déclencher une connexion OTP depuis https://app.maydai.io
2. Vérifier les logs : `docker compose logs -f auth`
3. Vérifier Mailjet dashboard pour le statut d'envoi
4. Vérifier la boîte de réception (et spam)

## Ressources

- [Documentation Supabase Auth](https://supabase.com/docs/guides/auth/auth-email-templates)
- [GoTrue Issue #870 - Templates via HTTP](https://github.com/supabase/gotrue/issues/870)
- [GoTrue Configuration](https://github.com/supabase/gotrue#configuration)

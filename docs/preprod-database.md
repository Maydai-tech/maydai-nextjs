# Base preprod séparée de la prod (MAY-30)

Le site preprod.maydai.io, les déploiements Preview et le dev local utilisent une base Supabase **preprod** qui leur est propre (`https://api-preprod.maydai.io`). Seul le site de prod utilise encore la base de prod.

La base preprod est une 2e stack Supabase sur le même serveur OVH (`/opt/supabase-preprod`). On la remplit **à la demande** avec une copie anonymisée de la prod. La copie ne fait que lire la prod, et les données ne quittent pas le serveur.

Fichiers : [`scripts/preprod-db/`](../scripts/preprod-db/).

| Fichier | Rôle |
|---------|------|
| `docker-compose.yml` + `kong.yml` | Stack preprod : base, auth, API, stockage, Mailpit (capture des emails) |
| `preprod-db.sh` | `init` : génère les secrets preprod ; `refresh` : copie la prod puis l'anonymise |
| `anonymize.sql` | Règles d'anonymisation et contrôle final |
| `test-local.sh` | Test complet sur des bases jetables locales (Docker) |

## Ce que contient la preprod après un rafraîchissement

| Données | Traitement |
|---------|-----------|
| Référentiels (modèles LLM, Compar:IA, EcoLogits, System Cards, plans, RAG AI Act) | Copiés tels quels |
| Cas d'usage, réponses, dossiers, registres | Copiés (contenu métier gardé) |
| Comptes clients | Email remplacé par `user-xxxx@preprod.invalid`, mot de passe invalidé, nom et téléphone effacés |
| Comptes de l'équipe (`@maydai.io`) | Gardés (email, profil, entreprises), mot de passe de prod invalidé |
| Entreprises, profils, prospects, contacts, fournisseurs | Noms, téléphones, adresses, SIREN, messages et tracking (gclid, utm) remplacés |
| N'importe quel email client ailleurs (historique, json, réponses…) | Remplacé par le même faux email |
| Abonnements | Plan gardé, identifiants Stripe effacés |
| Fichiers déposés par les clients | Non copiés (les dossiers existants apparaissent sans pièce jointe) |
| Sessions, journaux d'auth, alertes admin, appareils, imports Google Ads | Vidés |
| Comptes de recette | `recette-admin@preprod.invalid` (admin) et `recette-user@preprod.invalid`, recréés à chaque fois |

Garde-fous :
- le script n'écrit que dans la base marquée preprod ;
- si un email client subsiste en fin de traitement, ou si une étape échoue, la copie est entièrement effacée et l'API preprod reste coupée.

Aucun email ne part de la preprod : l'auth envoie tout vers Mailpit, et l'app n'a pas de clés Mailjet en preprod.

## Mise en place (une fois)

### 1. DNS
Ajouter un enregistrement A `api-preprod.maydai.io` → `57.130.47.254`.

### 2. Installer la stack sur le serveur
Depuis le repo, sur ton Mac :

```bash
ssh -t ubuntu@57.130.47.254 'sudo install -d -o ubuntu -g ubuntu /opt/supabase-preprod'
```

```bash
scp scripts/preprod-db/{docker-compose.yml,kong.yml,preprod-db.sh,anonymize.sql} ubuntu@57.130.47.254:/opt/supabase-preprod/
```

Puis sur le serveur (`ssh ubuntu@57.130.47.254`) :

```bash
cd /opt/supabase-preprod && chmod +x preprod-db.sh && ./preprod-db.sh init
```

`init` crée `.env` (droits 600) avec des secrets **propres à la preprod** (mot de passe base, JWT, clés anon/service, mot de passe des comptes de recette). Avant de continuer, vérifier dans `.env` :
- `GOTRUE_URI_ALLOW_LIST` : limité aux URLs Preview de l'équipe Vercel (`maydai-*-thomas-chippeauxs-projects.vercel.app`) ;
- `PREPROD_KEEP_EMAILS` : les adresses gardées telles quelles (par défaut `@maydai.io`).

```bash
docker compose up -d && ./preprod-db.sh refresh
```

Avant le premier `refresh`, l'auth et le stockage redémarrent en boucle : c'est normal, la base est encore vide. Ensuite tout doit être `Up` :

```bash
docker compose ps && curl -s localhost:8100/auth/v1/health
```

### 3. Brancher Caddy (stack prod)
Sauvegarder puis ajouter à la fin de `/opt/supabase/Caddyfile` :

```
api-preprod.maydai.io {
    reverse_proxy preprod-kong:8000
}
```

```bash
cd /opt/supabase && cp Caddyfile Caddyfile.bak.$(date +%Y%m%d-%H%M%S) && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Caddy joint la preprod par le réseau docker de la prod, où seul `preprod-kong` est branché. Le certificat HTTPS est automatique. Vérifier depuis ton Mac :

```bash
curl -s https://api-preprod.maydai.io/auth/v1/health
```

### 4. Vercel (projet `maydai`)
Dans Settings → Environment Variables, séparer les valeurs aujourd'hui communes à tous les environnements. Pour **preprod, Preview et Development** :

| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL` | `https://api-preprod.maydai.io` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` de `/opt/supabase-preprod/.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` de `/opt/supabase-preprod/.env` |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Clés Stripe **de test** |
| `NEXT_PUBLIC_STRIPE_TEST_MODE` | `true` |
| `MAILJET_API_KEY`, `MAILJET_API_SECRET` | Supprimées (aucun email applicatif) |

**Production : ne rien changer.** Puis redéployer la branche `preprod`.

Pour lire les clés sur le serveur :

```bash
grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=' /opt/supabase-preprod/.env
```

## Rafraîchir la preprod

```bash
ssh ubuntu@57.130.47.254 'cd /opt/supabase-preprod && ./preprod-db.sh refresh'
```

Environ une minute, pendant laquelle l'API preprod est coupée. Tout ce qui avait été saisi en preprod est remplacé.

## Se connecter, lire les emails

- **Comptes de recette** : `recette-admin@preprod.invalid` / `recette-user@preprod.invalid`. Mot de passe :
  ```bash
  ssh ubuntu@57.130.47.254 "grep PREPROD_TEST_PASSWORD /opt/supabase-preprod/.env"
  ```
- **Comptes équipe** (`@maydai.io`) : lien / code de connexion, à lire dans Mailpit. Le mot de passe de prod ne fonctionne pas en preprod.
- **Mailpit** (tous les emails envoyés par la preprod) : ouvrir le tunnel puis http://localhost:8025.
  ```bash
  ssh -N -L 8025:127.0.0.1:8025 ubuntu@57.130.47.254
  ```

## Tester les scripts en local

Prérequis : Docker, et la structure de la prod (lecture seule, aucune donnée) via le tunnel de [supabase-ovh-cli.md](./supabase-ovh-cli.md) :

Tunnel ouvert, et `POSTGRES_PASSWORD` chargé depuis `deploy/.env` (`set -a; . deploy/.env; set +a`) :

```bash
docker run --rm -e PGPASSWORD="$POSTGRES_PASSWORD" --entrypoint pg_dump supabase/postgres:15.8.1.085 -h host.docker.internal -p 15432 -U supabase_admin -d postgres --schema-only -n public -n auth -n storage -n supabase_migrations -e vector > /tmp/prod-schema.sql
```

```bash
scripts/preprod-db/test-local.sh /tmp/prod-schema.sql
```

Le test vérifie :
- le refus d'écrire dans une base non preprod ;
- l'absence de toute donnée client fictive après la copie ;
- la conservation de l'équipe, des contenus et des plans ;
- la connexion des comptes de recette, et l'échec des mots de passe de prod (clients et équipe) ;
- la capture des emails dans Mailpit.

`KEEP=1` garde les conteneurs pour diagnostiquer.

## À savoir

- **Versions** : la stack preprod reprend les versions d'images de la prod. Si la prod est mise à jour (GoTrue, storage, postgres), mettre à jour `docker-compose.yml` ici aussi avant le prochain `refresh`.
- **Migrations SQL** : une migration testée en preprod disparaît au rafraîchissement suivant si elle n'a pas encore été passée en prod.
- **Ressources** : la stack preprod ajoute environ 1 Go de RAM sur le serveur (7,6 Go au total, 5,6 Go libres au moment de l'installation).

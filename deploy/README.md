# Deploiement MaydAI sur OVH

Guide de deploiement de MaydAI sur serveur OVH avec Supabase self-hosted.

## Etat Actuel

- ✅ Supabase self-hosted configure et fonctionnel
- ✅ Next.js build et running sur le serveur
- ⏳ DNS a configurer
- ⏳ Caddy a demarrer apres DNS
- ⏳ Migration de la base de donnees depuis Supabase Cloud

## Prerequis

- Serveur OVH avec Docker installe (IP: 57.130.47.254)
- Acces SSH configure
- Domaine maydai.io

## Structure

```
deploy/
├── docker-compose.yml         # Orchestration des services
├── Dockerfile                 # Build Next.js
├── Caddyfile                  # Reverse proxy + SSL
├── .env                       # Variables d'environnement (sur serveur)
├── scripts/
│   ├── generate-secrets.sh    # Generation des secrets
│   ├── export-supabase-cloud.sh  # Export base Supabase Cloud
│   ├── import-database.sh     # Import base sur OVH
│   ├── setup-caddy.sh         # Configuration Caddy + SSL
│   └── deploy.sh              # Script de deploiement
└── volumes/
    ├── kong/kong.yml          # Configuration Kong API Gateway
    └── db/                    # Scripts d'init PostgreSQL
```

## Installation

### 1. Generer les secrets

```bash
cd deploy/scripts
./generate-secrets.sh
```

### 2. Creer le fichier .env

Copie `.env.example` en `.env` et remplis les valeurs generees.

### 3. Exporter la base Supabase Cloud

```bash
./scripts/export-supabase-cloud.sh
```

### 4. Deployer sur le serveur

```bash
./scripts/deploy.sh install
```

### 5. Configurer le DNS

Ajouter ces enregistrements DNS dans ton gestionnaire de domaine:

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | @ | 57.130.47.254 | 300 |
| A | www | 57.130.47.254 | 300 |
| A | app | 57.130.47.254 | 300 |
| A | api | 57.130.47.254 | 300 |
| A | studio | 57.130.47.254 | 300 |

**Verification DNS:**
```bash
# Attendre la propagation (5-30 min generalement)
nslookup api.maydai.io
nslookup app.maydai.io
nslookup studio.maydai.io
```

### 6. Demarrer Caddy (apres propagation DNS)

Sur le serveur:
```bash
cd /opt/supabase

# Configurer et demarrer Caddy
bash scripts/setup-caddy.sh
```

Le script va:
1. Generer le hash bcrypt pour Basic Auth
2. Mettre a jour le Caddyfile
3. Demarrer Caddy
4. Obtenir automatiquement les certificats SSL

### 7. Migrer la base de donnees

**Sur ta machine locale:**
```bash
cd deploy/scripts
./export-supabase-cloud.sh

# Transferer le backup sur le serveur
scp supabase_backup_*.sql ubuntu@57.130.47.254:/opt/supabase/
```

**Sur le serveur OVH:**
```bash
cd /opt/supabase
bash scripts/import-database.sh supabase_backup_*.sql
```

## Commandes utiles

```bash
# Mise a jour de l'app
./scripts/deploy.sh update

# Voir les logs
./scripts/deploy.sh logs

# Backup de la base
./scripts/deploy.sh backup

# Statut des services
./scripts/deploy.sh status
```

## Architecture

```
Internet
    |
    v
Caddy (SSL automatique Let's Encrypt)
    ├── api.maydai.io    → Kong → auth, rest, storage, realtime
    ├── studio.maydai.io → Studio (Basic Auth protege)
    └── app.maydai.io    → Next.js

Services internes (non exposes):
    PostgreSQL (port 5432 local)
    Meta, Imgproxy
```

## URLs Finales

| Service | URL | Credentials |
|---------|-----|-------------|
| Application | https://app.maydai.io | - |
| API Supabase | https://api.maydai.io | ANON_KEY dans .env |
| Studio | https://studio.maydai.io | admin / (voir DASHBOARD_PASSWORD) |

## Troubleshooting

### Certificats SSL qui ne fonctionnent pas
```bash
# Verifier logs Caddy
docker compose logs caddy

# S'assurer ports ouverts
sudo ufw allow 80
sudo ufw allow 443
```

### Service auth qui echoue
```bash
docker compose logs auth
docker compose restart auth
```

### Tester la connexion DB
```bash
docker exec -it supabase-db psql -U postgres -c "SELECT 1"
```

### Rebuild Next.js apres changements
```bash
docker compose build nextjs
docker compose up -d nextjs
```

## Securite

- ✅ SSL automatique via Let's Encrypt
- ✅ Basic Auth sur Studio
- ✅ Ports DB non exposes sur Internet
- ✅ Utilisateur non-root dans container Next.js
- ⚠️ Changer les mots de passe par defaut
- ⚠️ Configurer backup automatique DB

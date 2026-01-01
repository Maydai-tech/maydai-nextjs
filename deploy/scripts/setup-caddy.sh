#!/bin/bash
# Script de configuration de Caddy avec generation du hash bcrypt
# Usage: ./setup-caddy.sh

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Charger les variables d'environnement
if [ -f .env ]; then
    export $(grep -v "^#" .env | xargs)
else
    echo -e "${RED}Erreur: Fichier .env non trouve${NC}"
    exit 1
fi

echo -e "${GREEN}=== Configuration de Caddy ===${NC}"
echo ""

# Generer le hash bcrypt pour le mot de passe du dashboard
echo -e "${YELLOW}Generation du hash bcrypt pour Basic Auth...${NC}"

# Utiliser docker pour generer le hash
BCRYPT_HASH=$(docker run --rm caddy:2.8-alpine caddy hash-password --plaintext "$DASHBOARD_PASSWORD" 2>/dev/null)

if [ -z "$BCRYPT_HASH" ]; then
    echo -e "${RED}Erreur: Impossible de generer le hash bcrypt${NC}"
    exit 1
fi

echo "Hash genere avec succes"
echo ""

# Mettre a jour le Caddyfile avec le hash correct
echo -e "${YELLOW}Mise a jour du Caddyfile...${NC}"

# Creer un nouveau Caddyfile avec le hash correct
cat > Caddyfile << EOF
# Caddyfile pour MaydAI - Supabase Self-Hosted + Next.js
# SSL automatique via Let's Encrypt

# API Supabase (Kong)
api.maydai.io {
    reverse_proxy kong:8000

    # Headers CORS
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        Access-Control-Allow-Headers "Authorization, Content-Type, apikey, x-client-info"
    }

    # Logs
    log {
        output file /data/logs/api.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}

# Studio Supabase (protege par Basic Auth)
studio.maydai.io {
    basicauth {
        ${DASHBOARD_USERNAME} ${BCRYPT_HASH}
    }

    reverse_proxy studio:3000

    log {
        output file /data/logs/studio.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}

# Application Next.js
app.maydai.io {
    reverse_proxy nextjs:3000

    # Compression
    encode gzip zstd

    # Headers de securite
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }

    log {
        output file /data/logs/app.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}

# Redirection du domaine principal vers l'app
maydai.io {
    redir https://app.maydai.io{uri} permanent
}

www.maydai.io {
    redir https://app.maydai.io{uri} permanent
}
EOF

echo -e "${GREEN}Caddyfile mis a jour${NC}"
echo ""

# Creer le dossier de logs
mkdir -p volumes/caddy-logs

echo -e "${YELLOW}Demarrage de Caddy...${NC}"
docker compose up -d caddy

echo ""
echo -e "${GREEN}=== Caddy demarre ===${NC}"
echo ""
echo -e "${YELLOW}Verification du statut:${NC}"
docker compose ps caddy
echo ""
echo -e "${YELLOW}URLs disponibles:${NC}"
echo "  - https://app.maydai.io (Application)"
echo "  - https://api.maydai.io (API Supabase)"
echo "  - https://studio.maydai.io (Studio - login: ${DASHBOARD_USERNAME})"
echo ""
echo -e "${YELLOW}IMPORTANT: Les certificats SSL seront generes automatiquement${NC}"
echo "par Let's Encrypt lors du premier acces aux domaines."
echo ""
echo "Assurez-vous que les DNS pointent vers ce serveur ($(hostname -I | awk '{print $1}')):"
echo "  - api.maydai.io -> A record"
echo "  - studio.maydai.io -> A record"
echo "  - app.maydai.io -> A record"
echo "  - maydai.io -> A record"
echo "  - www.maydai.io -> A record"

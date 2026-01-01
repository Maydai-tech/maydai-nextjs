#!/bin/bash
# Script de generation des secrets pour Supabase self-hosted
# Usage: ./generate-secrets.sh > .env

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Generation des secrets Supabase ===${NC}"

# Fonction pour generer une chaine aleatoire
generate_random() {
    openssl rand -base64 "$1" | tr -dc 'a-zA-Z0-9' | head -c "$1"
}

# Fonction pour generer un JWT
generate_jwt() {
    local secret="$1"
    local role="$2"
    local exp=$(($(date +%s) + 315360000))  # 10 ans

    # Header
    local header='{"alg":"HS256","typ":"JWT"}'
    local header_base64=$(echo -n "$header" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

    # Payload
    local payload="{\"role\":\"$role\",\"iss\":\"supabase\",\"iat\":$(date +%s),\"exp\":$exp}"
    local payload_base64=$(echo -n "$payload" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

    # Signature
    local signature=$(echo -n "${header_base64}.${payload_base64}" | openssl dgst -sha256 -hmac "$secret" -binary | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

    echo "${header_base64}.${payload_base64}.${signature}"
}

# Generation des secrets
POSTGRES_PASSWORD=$(generate_random 32)
JWT_SECRET=$(generate_random 64)
DASHBOARD_USERNAME="admin"
DASHBOARD_PASSWORD=$(generate_random 16)
LOGFLARE_API_KEY=$(generate_random 32)
SECRET_KEY_BASE=$(generate_random 64)

# Generation des cles JWT
ANON_KEY=$(generate_jwt "$JWT_SECRET" "anon")
SERVICE_ROLE_KEY=$(generate_jwt "$JWT_SECRET" "service_role")

echo ""
echo -e "${YELLOW}Copie ces valeurs dans ton fichier .env :${NC}"
echo ""
echo "# ============================================"
echo "# SECRETS GENERES - $(date)"
echo "# ============================================"
echo ""
echo "# PostgreSQL"
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo ""
echo "# JWT"
echo "JWT_SECRET=$JWT_SECRET"
echo "ANON_KEY=$ANON_KEY"
echo "SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
echo ""
echo "# Dashboard (Basic Auth)"
echo "DASHBOARD_USERNAME=$DASHBOARD_USERNAME"
echo "DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD"
echo ""
echo "# Autres secrets"
echo "LOGFLARE_API_KEY=$LOGFLARE_API_KEY"
echo "SECRET_KEY_BASE=$SECRET_KEY_BASE"
echo ""
echo -e "${GREEN}=== Secrets generes avec succes ===${NC}"
echo ""
echo -e "${RED}IMPORTANT: Sauvegarde ces secrets dans un endroit sur!${NC}"

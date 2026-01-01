#!/bin/bash
# Script d'export de la base de donnees Supabase Cloud
# Usage: ./export-supabase-cloud.sh

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration Supabase Cloud
# Recuperer ces infos depuis le dashboard Supabase > Settings > Database
SUPABASE_PROJECT_REF=""  # Ex: abcdefghijklmnop
SUPABASE_DB_PASSWORD=""  # Le mot de passe de la base

# Date pour le nom du fichier
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="supabase_backup_${DATE}.sql"

echo -e "${GREEN}=== Export Supabase Cloud ===${NC}"
echo ""

# Verifier les variables
if [ -z "$SUPABASE_PROJECT_REF" ] || [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${YELLOW}Configuration requise:${NC}"
    echo "1. Va sur https://supabase.com/dashboard/project/_/settings/database"
    echo "2. Copie le 'Reference ID' du projet"
    echo "3. Copie le mot de passe de la base de donnees"
    echo ""
    read -p "Project Reference ID: " SUPABASE_PROJECT_REF
    read -sp "Database Password: " SUPABASE_DB_PASSWORD
    echo ""
fi

# URL de connexion
DB_HOST="db.${SUPABASE_PROJECT_REF}.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"

echo -e "${YELLOW}Connexion a: ${DB_HOST}${NC}"
echo ""

# Verifier que pg_dump est installe
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}Erreur: pg_dump n'est pas installe${NC}"
    echo "Installe PostgreSQL client: brew install postgresql (macOS) ou apt install postgresql-client (Linux)"
    exit 1
fi

echo -e "${YELLOW}Export en cours... (peut prendre quelques minutes)${NC}"

# Export avec pg_dump
PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p 5432 \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --exclude-schema=storage \
    --exclude-schema=supabase_functions \
    --exclude-schema=supabase_migrations \
    --exclude-schema=extensions \
    --exclude-schema=graphql \
    --exclude-schema=graphql_public \
    --exclude-schema=net \
    --exclude-schema=pgsodium \
    --exclude-schema=pgsodium_masks \
    --exclude-schema=realtime \
    --exclude-schema=vault \
    --exclude-schema=_analytics \
    --exclude-schema=_realtime \
    --exclude-schema=supabase_migrations \
    -f "$BACKUP_FILE"

# Verifier le resultat
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo ""
    echo -e "${GREEN}=== Export termine avec succes ===${NC}"
    echo "Fichier: $BACKUP_FILE"
    echo "Taille: $SIZE"
    echo ""
    echo -e "${YELLOW}Prochaines etapes:${NC}"
    echo "1. Transfère ce fichier sur le serveur OVH:"
    echo "   scp $BACKUP_FILE ubuntu@57.130.47.254:/opt/supabase/"
    echo ""
    echo "2. Importe la base sur le nouveau serveur:"
    echo "   docker exec -i supabase-db psql -U postgres < $BACKUP_FILE"
else
    echo -e "${RED}Erreur: L'export a echoue${NC}"
    exit 1
fi

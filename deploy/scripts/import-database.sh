#!/bin/bash
# Script d'import de la base de donnees sur le serveur OVH
# Usage: ./import-database.sh backup_file.sql

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Usage: $0 backup_file.sql${NC}"
    echo ""
    echo "Exemple: $0 supabase_backup_20241230.sql"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Erreur: Fichier non trouve: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}=== Import de la base de donnees ===${NC}"
echo ""
echo -e "${YELLOW}Fichier: ${BACKUP_FILE}${NC}"
echo ""

# Confirmation
read -p "Cela va ecraser les donnees existantes. Continuer? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Import annule."
    exit 0
fi

echo ""
echo -e "${YELLOW}Import en cours...${NC}"

# Import via docker exec
docker exec -i supabase-db psql -U postgres postgres < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=== Import termine avec succes ===${NC}"
    echo ""
    echo -e "${YELLOW}Verification des tables:${NC}"
    docker exec supabase-db psql -U postgres -c "\dt public.*"
else
    echo -e "${RED}Erreur lors de l'import${NC}"
    exit 1
fi

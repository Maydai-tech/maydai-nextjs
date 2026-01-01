#!/bin/bash
# Script de deploiement complet pour MaydAI sur OVH
# Usage: ./deploy.sh [install|update|backup|logs]

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER_IP="57.130.47.254"
SERVER_USER="ubuntu"
DEPLOY_PATH="/opt/supabase"

# Afficher l'aide
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  install   - Installation complete sur le serveur OVH"
    echo "  update    - Mise a jour de l'application Next.js uniquement"
    echo "  backup    - Creer un backup de la base de donnees"
    echo "  logs      - Afficher les logs des containers"
    echo "  status    - Afficher le statut des services"
    echo "  ssh       - Se connecter au serveur"
    echo ""
}

# Verifier la connexion SSH
check_ssh() {
    echo -e "${BLUE}Verification de la connexion SSH...${NC}"
    if ! ssh -o ConnectTimeout=5 "${SERVER_USER}@${SERVER_IP}" "echo 'OK'" &>/dev/null; then
        echo -e "${RED}Erreur: Impossible de se connecter au serveur${NC}"
        echo "Verifie que:"
        echo "  - Le serveur est accessible: $SERVER_IP"
        echo "  - Ta cle SSH est configuree"
        exit 1
    fi
    echo -e "${GREEN}Connexion OK${NC}"
}

# Installation complete
install_supabase() {
    echo -e "${GREEN}=== Installation de Supabase sur OVH ===${NC}"

    check_ssh

    # Creer la structure sur le serveur
    echo -e "${YELLOW}Creation de la structure...${NC}"
    ssh "${SERVER_USER}@${SERVER_IP}" "sudo mkdir -p ${DEPLOY_PATH} && sudo chown -R ubuntu:ubuntu ${DEPLOY_PATH}"

    # Copier les fichiers de configuration
    echo -e "${YELLOW}Copie des fichiers de configuration...${NC}"
    scp -r ../deploy/* "${SERVER_USER}@${SERVER_IP}:${DEPLOY_PATH}/"

    # Copier le Dockerfile
    echo -e "${YELLOW}Copie du Dockerfile...${NC}"
    scp ../Dockerfile "${SERVER_USER}@${SERVER_IP}:${DEPLOY_PATH}/"

    # Copier le code source (sauf node_modules et .next)
    echo -e "${YELLOW}Copie du code source...${NC}"
    rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
        ../ "${SERVER_USER}@${SERVER_IP}:${DEPLOY_PATH}/app/"

    echo ""
    echo -e "${GREEN}=== Fichiers copies avec succes ===${NC}"
    echo ""
    echo -e "${YELLOW}Prochaines etapes sur le serveur:${NC}"
    echo "1. Se connecter: ssh ${SERVER_USER}@${SERVER_IP}"
    echo "2. Aller dans le dossier: cd ${DEPLOY_PATH}"
    echo "3. Generer les secrets: bash scripts/generate-secrets.sh"
    echo "4. Creer le fichier .env avec les secrets"
    echo "5. Lancer les services: docker compose up -d"
    echo ""
}

# Mise a jour de l'app uniquement
update_app() {
    echo -e "${GREEN}=== Mise a jour de l'application ===${NC}"

    check_ssh

    # Copier le nouveau code
    echo -e "${YELLOW}Synchronisation du code...${NC}"
    rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
        --delete \
        ../ "${SERVER_USER}@${SERVER_IP}:${DEPLOY_PATH}/app/"

    # Rebuild et restart du container Next.js
    echo -e "${YELLOW}Rebuild du container...${NC}"
    ssh "${SERVER_USER}@${SERVER_IP}" "cd ${DEPLOY_PATH} && docker compose build nextjs && docker compose up -d nextjs"

    echo -e "${GREEN}=== Mise a jour terminee ===${NC}"
}

# Backup de la base
backup_db() {
    echo -e "${GREEN}=== Backup de la base de donnees ===${NC}"

    check_ssh

    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backup_${DATE}.sql"

    echo -e "${YELLOW}Creation du backup...${NC}"
    ssh "${SERVER_USER}@${SERVER_IP}" "docker exec supabase-db pg_dump -U postgres postgres > ${DEPLOY_PATH}/backups/${BACKUP_FILE}"

    echo -e "${YELLOW}Telechargement du backup...${NC}"
    mkdir -p ../backups
    scp "${SERVER_USER}@${SERVER_IP}:${DEPLOY_PATH}/backups/${BACKUP_FILE}" "../backups/"

    echo -e "${GREEN}Backup sauvegarde: backups/${BACKUP_FILE}${NC}"
}

# Afficher les logs
show_logs() {
    check_ssh

    echo -e "${YELLOW}Affichage des logs (Ctrl+C pour quitter)...${NC}"
    ssh "${SERVER_USER}@${SERVER_IP}" "cd ${DEPLOY_PATH} && docker compose logs -f --tail=100"
}

# Afficher le statut
show_status() {
    check_ssh

    echo -e "${GREEN}=== Statut des services ===${NC}"
    ssh "${SERVER_USER}@${SERVER_IP}" "cd ${DEPLOY_PATH} && docker compose ps"
}

# Connexion SSH
connect_ssh() {
    echo -e "${BLUE}Connexion au serveur...${NC}"
    ssh "${SERVER_USER}@${SERVER_IP}"
}

# Main
case "${1:-}" in
    install)
        install_supabase
        ;;
    update)
        update_app
        ;;
    backup)
        backup_db
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    ssh)
        connect_ssh
        ;;
    *)
        show_help
        ;;
esac

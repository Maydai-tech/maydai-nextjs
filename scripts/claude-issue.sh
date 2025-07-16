#!/bin/bash

# claude-issue.sh - Automatisation Claude Code pour traiter les issues GitHub
# Usage: ./scripts/claude-issue.sh <issue-number> [options]
#
# Options:
#   --auto          Mode automatique sans confirmation
#   --dry-run       Affiche ce qui sera fait sans exécuter
#   --verbose       Active les logs détaillés
#   --no-worktree   Travaille dans la branche courante (pas de worktree)

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LIB_DIR="$SCRIPT_DIR/lib"
TEMPLATES_DIR="$SCRIPT_DIR/templates"
LOGS_DIR="$PROJECT_ROOT/logs/claude-issue"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables globales
ISSUE_NUMBER=""
AUTO_MODE=false
DRY_RUN=false
VERBOSE=false
NO_WORKTREE=false
WORKTREE_PATH=""
BRANCH_NAME=""

# Fonction d'aide
show_help() {
    echo "Usage: $0 <issue-number> [options]"
    echo ""
    echo "Options:"
    echo "  --auto          Mode automatique sans confirmation"
    echo "  --dry-run       Affiche ce qui sera fait sans exécuter"
    echo "  --verbose       Active les logs détaillés"
    echo "  --no-worktree   Travaille dans la branche courante (pas de worktree)"
    echo "  --help          Affiche cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 123                    # Traite l'issue #123"
    echo "  $0 123 --auto            # Mode automatique"
    echo "  $0 123 --dry-run         # Test sans exécution"
    exit 0
}

# Logger
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message" >&2
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        INFO)
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        DEBUG)
            if [ "$VERBOSE" = true ]; then
                echo -e "[DEBUG] $message"
            fi
            ;;
    esac
    
    # Écrire dans le fichier de log
    mkdir -p "$LOGS_DIR"
    echo "[$timestamp] [$level] $message" >> "$LOGS_DIR/claude-issue-$(date +%Y%m%d).log"
}

# Fonction de nettoyage
cleanup() {
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        log ERROR "Script terminé avec erreur (code: $exit_code)"
        
        # Si un worktree a été créé et qu'il y a eu une erreur, proposer de le nettoyer
        if [ -n "$WORKTREE_PATH" ] && [ -d "$WORKTREE_PATH" ] && [ "$NO_WORKTREE" = false ]; then
            log WARNING "Un worktree a été créé à: $WORKTREE_PATH"
            
            if [ "$AUTO_MODE" = false ]; then
                read -p "Voulez-vous supprimer le worktree ? (y/N) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    git worktree remove --force "$WORKTREE_PATH" 2>/dev/null || true
                    git branch -D "$BRANCH_NAME" 2>/dev/null || true
                    log INFO "Worktree et branche supprimés"
                fi
            fi
        fi
    fi
}

# Configurer le trap pour le nettoyage
trap cleanup EXIT

# Parser les arguments
parse_arguments() {
    if [ $# -eq 0 ]; then
        log ERROR "Numéro d'issue requis"
        show_help
    fi
    
    # Vérifier si c'est --help avant tout
    if [ "$1" = "--help" ]; then
        show_help
    fi
    
    ISSUE_NUMBER=$1
    shift
    
    # Vérifier que c'est bien un nombre
    if ! [[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
        log ERROR "Le numéro d'issue doit être un nombre entier"
        exit 1
    fi
    
    # Parser les options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto)
                AUTO_MODE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --no-worktree)
                NO_WORKTREE=true
                shift
                ;;
            --help)
                show_help
                ;;
            *)
                log ERROR "Option inconnue: $1"
                show_help
                ;;
        esac
    done
}

# Vérifier les prérequis
check_prerequisites() {
    log INFO "Vérification des prérequis..."
    
    # Vérifier git
    if ! command -v git &> /dev/null; then
        log ERROR "git n'est pas installé"
        exit 1
    fi
    
    # Vérifier qu'on est dans un repo git
    if ! git rev-parse --git-dir &> /dev/null; then
        log ERROR "Le répertoire actuel n'est pas un repository git"
        exit 1
    fi
    
    # Vérifier gh (GitHub CLI)
    if ! command -v gh &> /dev/null; then
        log ERROR "GitHub CLI (gh) n'est pas installé. Installez-le avec: brew install gh"
        exit 1
    fi
    
    # Vérifier l'authentification GitHub
    if ! gh auth status &> /dev/null; then
        log ERROR "Vous n'êtes pas authentifié avec GitHub CLI. Exécutez: gh auth login"
        exit 1
    fi
    
    # Vérifier claude
    if ! command -v claude &> /dev/null; then
        log ERROR "Claude Code n'est pas installé. Installez-le avec: npm install -g @anthropic-ai/claude-code"
        exit 1
    fi
    
    # Tester l'authentification Claude (sauf en dry-run)
    if [ "$DRY_RUN" = false ]; then
        if ! test_claude_authentication; then
            suggest_authentication_fix
            exit 1
        fi
        
        case "$CLAUDE_AUTH_METHOD" in
            "api-key")
                log SUCCESS "Claude authentifié via API key"
                ;;
            "session")
                log SUCCESS "Claude authentifié via session"
                ;;
            *)
                log ERROR "Authentification Claude échouée"
                exit 1
                ;;
        esac
    fi
    
    # Vérifier les modifications non commitées (sauf en dry-run)
    if [ "$DRY_RUN" = false ] && { ! git diff --quiet || ! git diff --staged --quiet; }; then
        log WARNING "Des modifications non commitées ont été détectées"
        if [ "$AUTO_MODE" = false ] && [ "$NO_WORKTREE" = false ]; then
            read -p "Continuer quand même ? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    log SUCCESS "Tous les prérequis sont satisfaits"
}

# Charger les librairies
load_libraries() {
    # Ces fichiers seront créés dans les prochaines étapes
    if [ -f "$LIB_DIR/github-utils.sh" ]; then
        source "$LIB_DIR/github-utils.sh"
    fi
    
    if [ -f "$LIB_DIR/claude-utils.sh" ]; then
        source "$LIB_DIR/claude-utils.sh"
    fi
}

# Fonction principale
main() {
    log INFO "=== Démarrage de claude-issue.sh ==="
    log INFO "Issue: #$ISSUE_NUMBER | Auto: $AUTO_MODE | Dry-run: $DRY_RUN | Verbose: $VERBOSE"
    
    # Charger les librairies d'abord
    load_libraries
    
    # Vérifier les prérequis
    check_prerequisites
    
    # Mode dry-run
    if [ "$DRY_RUN" = true ]; then
        log INFO "Mode DRY-RUN activé - Aucune action ne sera exécutée"
        log INFO "Actions qui seraient effectuées:"
        log INFO "  1. Récupération de l'issue #$ISSUE_NUMBER"
        log INFO "  2. Création d'un worktree pour la branche issue-$ISSUE_NUMBER"
        log INFO "  3. Exécution de Claude Code pour traiter l'issue"
        log INFO "  4. Commit des changements"
        log INFO "  5. Création d'une PR"
        exit 0
    fi
    
    # 1. Récupérer les détails de l'issue
    log INFO "Étape 1/6: Récupération de l'issue #$ISSUE_NUMBER"
    if ! get_issue_details "$ISSUE_NUMBER"; then
        log ERROR "Impossible de récupérer l'issue #$ISSUE_NUMBER"
        exit 1
    fi
    
    # Afficher le résumé de l'issue
    show_issue_summary
    
    # Demander confirmation si pas en mode auto
    if [ "$AUTO_MODE" = false ]; then
        echo ""
        read -p "Voulez-vous traiter cette issue ? (Y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            log INFO "Opération annulée par l'utilisateur"
            exit 0
        fi
    fi
    
    # 2. Préparer la branche et le worktree
    log INFO "Étape 2/6: Préparation de l'environnement de travail"
    BRANCH_NAME=$(generate_branch_name "$ISSUE_NUMBER" "$ISSUE_TITLE")
    
    # Vérifier si la branche existe déjà
    if branch_exists "$BRANCH_NAME"; then
        log WARNING "La branche $BRANCH_NAME existe déjà"
        if [ "$AUTO_MODE" = false ]; then
            read -p "Continuer sur cette branche ? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    # Créer le worktree si demandé
    if [ "$NO_WORKTREE" = false ]; then
        WORKTREE_PATH="$PROJECT_ROOT/../issue-$ISSUE_NUMBER"
        log INFO "Création du worktree: $WORKTREE_PATH"
        
        # Supprimer le worktree s'il existe déjà
        if [ -d "$WORKTREE_PATH" ]; then
            log DEBUG "Suppression de l'ancien worktree"
            git worktree remove --force "$WORKTREE_PATH" 2>/dev/null || true
        fi
        
        # Créer le nouveau worktree
        if ! git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" 2>/dev/null; then
            # Si la branche existe, checkout sur elle
            git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
        fi
        
        log SUCCESS "Worktree créé: $WORKTREE_PATH"
        WORKING_DIR="$WORKTREE_PATH"
    else
        # Travailler dans le répertoire courant
        log INFO "Travail dans le répertoire courant (pas de worktree)"
        
        # Créer ou basculer sur la branche
        if ! branch_exists "$BRANCH_NAME"; then
            git checkout -b "$BRANCH_NAME"
        else
            git checkout "$BRANCH_NAME"
        fi
        
        WORKING_DIR="$PROJECT_ROOT"
    fi
    
    # 3. Générer le prompt pour Claude
    log INFO "Étape 3/6: Génération du prompt pour Claude"
    local claude_prompt=$(generate_claude_prompt "$ISSUE_NUMBER" "$ISSUE_TITLE" "$ISSUE_BODY")
    
    # 4. Exécuter Claude Code
    log INFO "Étape 4/6: Exécution de Claude Code"
    if ! execute_claude "$claude_prompt" "$WORKING_DIR"; then
        log ERROR "Claude Code a échoué"
        exit 1
    fi
    
    # Changer vers le répertoire de travail pour les opérations git
    cd "$WORKING_DIR"
    
    # 5. Vérifier et committer les changements
    log INFO "Étape 5/6: Vérification et commit des changements"
    if check_claude_changes; then
        if commit_changes "$ISSUE_NUMBER" "$ISSUE_TITLE"; then
            log SUCCESS "Changements committés avec succès"
        else
            log ERROR "Échec du commit"
            exit 1
        fi
    else
        log ERROR "Aucun changement valide détecté"
        exit 1
    fi
    
    # 6. Créer la Pull Request
    log INFO "Étape 6/6: Création de la Pull Request"
    if create_pull_request "$BRANCH_NAME" "$ISSUE_NUMBER"; then
        log SUCCESS "Pull Request créée avec succès"
    else
        log ERROR "Échec de la création de la PR"
        exit 1
    fi
    
    # Résumé final
    echo ""
    log SUCCESS "=== TRAITEMENT TERMINÉ AVEC SUCCÈS ==="
    log INFO "Issue: #$ISSUE_NUMBER - $ISSUE_TITLE"
    log INFO "Branche: $BRANCH_NAME"
    if [ "$NO_WORKTREE" = false ]; then
        log INFO "Worktree: $WORKTREE_PATH"
    fi
    log INFO "Pull Request créée et liée à l'issue"
    echo ""
}

# Point d'entrée
parse_arguments "$@"
main
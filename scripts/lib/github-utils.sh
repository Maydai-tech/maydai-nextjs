#!/bin/bash

# github-utils.sh - Fonctions utilitaires pour GitHub CLI
# Utilisé par claude-issue.sh

# Variables globales pour stocker les infos de l'issue
ISSUE_TITLE=""
ISSUE_BODY=""
ISSUE_STATE=""
ISSUE_LABELS=""
ISSUE_ASSIGNEES=""
ISSUE_URL=""

# Récupérer les détails d'une issue
get_issue_details() {
    local issue_number=$1
    
    log DEBUG "Récupération des détails de l'issue #$issue_number..."
    
    # Vérifier que l'issue existe
    if ! gh issue view "$issue_number" &> /dev/null; then
        log ERROR "L'issue #$issue_number n'existe pas ou n'est pas accessible"
        return 1
    fi
    
    # Récupérer les détails en JSON
    local issue_json=$(gh issue view "$issue_number" --json title,body,state,labels,assignees,url)
    
    # Extraire les informations
    ISSUE_TITLE=$(echo "$issue_json" | jq -r '.title')
    ISSUE_BODY=$(echo "$issue_json" | jq -r '.body // ""')
    ISSUE_STATE=$(echo "$issue_json" | jq -r '.state')
    ISSUE_URL=$(echo "$issue_json" | jq -r '.url')
    
    # Extraire les labels (format: label1,label2,...)
    ISSUE_LABELS=$(echo "$issue_json" | jq -r '.labels[].name' | tr '\n' ',' | sed 's/,$//')
    
    # Extraire les assignees
    ISSUE_ASSIGNEES=$(echo "$issue_json" | jq -r '.assignees[].login' | tr '\n' ',' | sed 's/,$//')
    
    # Vérifier l'état
    if [ "$ISSUE_STATE" != "OPEN" ]; then
        log WARNING "L'issue #$issue_number est dans l'état: $ISSUE_STATE"
        if [ "$AUTO_MODE" = false ]; then
            read -p "Continuer quand même ? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                return 1
            fi
        fi
    fi
    
    log SUCCESS "Issue récupérée: $ISSUE_TITLE"
    log DEBUG "État: $ISSUE_STATE"
    log DEBUG "Labels: ${ISSUE_LABELS:-aucun}"
    log DEBUG "Assignés: ${ISSUE_ASSIGNEES:-aucun}"
    
    return 0
}

# Afficher un résumé de l'issue
show_issue_summary() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    RÉSUMÉ DE L'ISSUE                         ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    printf "║ %-60s ║\n" "Numéro: #$ISSUE_NUMBER"
    printf "║ %-60s ║\n" "Titre: ${ISSUE_TITLE:0:55}"
    if [ ${#ISSUE_TITLE} -gt 55 ]; then
        printf "║ %-60s ║\n" "       ${ISSUE_TITLE:55}"
    fi
    printf "║ %-60s ║\n" "État: $ISSUE_STATE"
    printf "║ %-60s ║\n" "Labels: ${ISSUE_LABELS:-aucun}"
    printf "║ %-60s ║\n" "Assignés: ${ISSUE_ASSIGNEES:-aucun}"
    echo "╠══════════════════════════════════════════════════════════════╣"
    if [ -n "$ISSUE_BODY" ]; then
        echo "║ Description:                                                 ║"
        # Limiter l'affichage de la description
        local body_preview=$(echo "$ISSUE_BODY" | head -n 5 | sed 's/^/║ /')
        echo "$body_preview"
        if [ $(echo "$ISSUE_BODY" | wc -l) -gt 5 ]; then
            echo "║ [...]                                                        ║"
        fi
    else
        echo "║ Pas de description                                           ║"
    fi
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

# Générer un nom de branche à partir du titre de l'issue
generate_branch_name() {
    local issue_number=$1
    local issue_title=$2
    
    # Nettoyer le titre pour en faire un nom de branche valide
    # - Convertir en minuscules
    # - Remplacer espaces et caractères spéciaux par des tirets
    # - Supprimer les caractères non alphanumériques (sauf tirets)
    # - Supprimer les tirets multiples
    # - Supprimer les tirets en début/fin
    local clean_title=$(echo "$issue_title" | \
        tr '[:upper:]' '[:lower:]' | \
        sed 's/[[:space:]]/-/g' | \
        sed 's/[^a-z0-9-]//g' | \
        sed 's/--*/-/g' | \
        sed 's/^-//;s/-$//')
    
    # Limiter la longueur (50 caractères max pour le titre)
    if [ ${#clean_title} -gt 50 ]; then
        clean_title="${clean_title:0:50}"
        # Supprimer le dernier tiret si présent
        clean_title="${clean_title%-}"
    fi
    
    # Format final: issue-123-titre-de-l-issue
    echo "issue-${issue_number}-${clean_title}"
}

# Créer une Pull Request
create_pull_request() {
    local branch_name=$1
    local issue_number=$2
    local pr_title="Fix #${issue_number}: ${ISSUE_TITLE}"
    
    log INFO "Création de la Pull Request..."
    
    # Générer le corps de la PR
    local pr_body="## 🎯 Description

Cette PR résout l'issue #${issue_number}.

### Issue originale
${ISSUE_URL}

### Changements effectués
Les changements ont été générés automatiquement par Claude Code.

### Tests
- [ ] Les tests existants passent
- [ ] Le build réussit
- [ ] Les changements ont été vérifiés localement

---
*PR générée automatiquement par claude-issue.sh*"
    
    # Créer la PR
    if [ "$DRY_RUN" = true ]; then
        log INFO "[DRY-RUN] Création de PR:"
        log INFO "  Titre: $pr_title"
        log INFO "  Branche: $branch_name -> main"
        log INFO "  Lien avec issue: #$issue_number"
    else
        # Pousser la branche d'abord
        log DEBUG "Push de la branche $branch_name..."
        git push -u origin "$branch_name"
        
        # Créer la PR
        local pr_url=$(gh pr create \
            --title "$pr_title" \
            --body "$pr_body" \
            --base main \
            --head "$branch_name" \
            --web=false \
            2>&1)
        
        if [ $? -eq 0 ]; then
            log SUCCESS "Pull Request créée: $pr_url"
            
            # Optionnellement, assigner les mêmes personnes que l'issue
            if [ -n "$ISSUE_ASSIGNEES" ]; then
                gh pr edit "$pr_url" --add-assignee "$ISSUE_ASSIGNEES" &> /dev/null || true
            fi
            
            # Ajouter les mêmes labels
            if [ -n "$ISSUE_LABELS" ]; then
                gh pr edit "$pr_url" --add-label "$ISSUE_LABELS" &> /dev/null || true
            fi
            
            return 0
        else
            log ERROR "Échec de la création de la PR: $pr_url"
            return 1
        fi
    fi
}

# Vérifier si une branche existe
branch_exists() {
    local branch_name=$1
    git show-ref --verify --quiet refs/heads/"$branch_name"
}

# Vérifier si une branche existe sur le remote
remote_branch_exists() {
    local branch_name=$1
    git ls-remote --heads origin "$branch_name" | grep -q "$branch_name"
}
#!/bin/bash

# claude-utils.sh - Fonctions utilitaires pour Claude Code
# Utilisé par claude-issue.sh

# Variables pour stocker les résultats Claude
CLAUDE_OUTPUT=""
CLAUDE_EXIT_CODE=0
CLAUDE_AUTH_METHOD=""  # "api-key", "session", "none"

# Tester l'authentification Claude et déterminer la méthode disponible
test_claude_authentication() {
    log DEBUG "Test de l'authentification Claude..."
    
    # Test 1: Vérifier si Claude fonctionne avec l'API key (si définie)
    if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
        log DEBUG "API key détectée, utilisation du mode API"
        CLAUDE_AUTH_METHOD="api-key"
        return 0
    fi
    
    # Test 2: Vérifier si Claude est authentifié via session
    # Essayer d'exécuter claude --help pour voir s'il est connecté
    log DEBUG "Test de la session Claude..."
    
    if claude --help &>/dev/null; then
        log DEBUG "Claude CLI disponible, tentative d'utilisation en session"
        CLAUDE_AUTH_METHOD="session"
        return 0
    else
        log DEBUG "Claude CLI non disponible ou non authentifié"
    fi
    
    # Aucune authentification détectée
    log DEBUG "Aucune authentification fonctionnelle détectée"
    CLAUDE_AUTH_METHOD="none"
    return 1
}

# Obtenir la commande Claude adaptée au mode d'authentification
get_claude_command() {
    local base_cmd="claude --print --output-format json --dangerously-skip-permissions"
    
    case "$CLAUDE_AUTH_METHOD" in
        "api-key")
            log DEBUG "Utilisation de Claude avec API key"
            echo "$base_cmd"
            ;;
        "session")
            log DEBUG "Utilisation de Claude avec session"
            # S'assurer que l'API key n'interfère pas
            echo "ANTHROPIC_API_KEY='' $base_cmd"
            ;;
        *)
            log ERROR "Aucune méthode d'authentification Claude disponible"
            return 1
            ;;
    esac
}

# Proposer des solutions d'authentification
suggest_authentication_fix() {
    log ERROR "Claude Code n'est pas correctement authentifié"
    echo ""
    echo "Solutions possibles:"
    echo ""
    echo "1. 📱 Authentification par session (recommandé):"
    echo "   claude"
    echo "   # Puis dans Claude, tapez: /login"
    echo ""
    echo "2. 🔑 Token long-durée:"
    echo "   claude setup-token"
    echo ""
    echo "3. 🔧 API Key (pour scripts):"
    echo "   export ANTHROPIC_API_KEY='your_key_here'"
    echo ""
    echo "Une fois authentifié, relancez le script."
}

# Générer le prompt pour Claude
generate_claude_prompt() {
    local issue_number=$1
    local issue_title=$2
    local issue_body=$3
    local template_file="$TEMPLATES_DIR/claude-prompt.txt"
    
    log DEBUG "Génération du prompt Claude..."
    
    # Utiliser le template s'il existe, sinon utiliser un prompt par défaut
    if [ -f "$template_file" ]; then
        log DEBUG "Utilisation du template: $template_file"
        # Remplacer les variables dans le template
        cat "$template_file" | \
            sed "s/{{ISSUE_NUMBER}}/$issue_number/g" | \
            sed "s/{{ISSUE_TITLE}}/$issue_title/g" | \
            sed "s|{{ISSUE_BODY}}|$issue_body|g" | \
            sed "s|{{ISSUE_URL}}|$ISSUE_URL|g"
    else
        log DEBUG "Template non trouvé, utilisation du prompt par défaut"
        cat <<EOF
Tu es un développeur expert travaillant sur le projet MaydAI.

CONTEXTE:
Je dois résoudre l'issue GitHub #${issue_number}.

ISSUE:
Titre: ${issue_title}
${issue_body:+Description: $issue_body}

INSTRUCTIONS:
1. Analyse l'issue et comprends ce qui est demandé
2. Identifie les fichiers à modifier ou créer
3. Implémente la solution en respectant les conventions du projet (voir CLAUDE.md)
4. Assure-toi que le code est propre et bien testé
5. Si des tests existent, vérifie qu'ils passent toujours

IMPORTANT:
- Respecte les conventions de code du projet
- N'ajoute pas de commentaires inutiles
- Utilise les composants et utilitaires existants
- Vérifie les imports et dépendances

Commence par analyser l'issue puis implémente la solution.
EOF
    fi
}

# Exécuter Claude Code
execute_claude() {
    local prompt=$1
    local working_dir=${2:-$PWD}
    
    log INFO "Exécution de Claude Code..."
    log DEBUG "Répertoire de travail: $working_dir"
    
    # Sauvegarder le prompt pour debug
    if [ "$VERBOSE" = true ]; then
        local prompt_file="$LOGS_DIR/prompt-$(date +%Y%m%d-%H%M%S).txt"
        echo "$prompt" > "$prompt_file"
        log DEBUG "Prompt sauvegardé dans: $prompt_file"
    fi
    
    # Obtenir la commande Claude adaptée au mode d'authentification
    local claude_cmd
    claude_cmd=$(get_claude_command)
    if [ $? -ne 0 ]; then
        log ERROR "Impossible d'obtenir une commande Claude valide"
        return 1
    fi
    
    # Ajouter les options supplémentaires
    claude_cmd+=" --max-turns 10"            # Limite les itérations
    
    if [ "$VERBOSE" = true ]; then
        claude_cmd+=" --verbose"
    fi
    
    # Afficher la commande en mode debug
    log DEBUG "Commande Claude: $claude_cmd \"[prompt]\""
    
    # Se déplacer dans le bon répertoire
    cd "$working_dir" || {
        log ERROR "Impossible de se déplacer dans: $working_dir"
        return 1
    }
    
    # Exécuter Claude
    if [ "$DRY_RUN" = true ]; then
        log INFO "[DRY-RUN] Claude Code serait exécuté avec le prompt généré"
        CLAUDE_OUTPUT='{"status": "dry-run", "message": "Mode dry-run activé"}'
        CLAUDE_EXIT_CODE=0
    else
        # Créer un fichier temporaire pour capturer la sortie
        local output_file=$(mktemp)
        local error_file=$(mktemp)
        
        # Exécuter Claude avec le prompt
        echo "$prompt" | $claude_cmd > "$output_file" 2> "$error_file"
        CLAUDE_EXIT_CODE=$?
        
        # Lire les résultats
        CLAUDE_OUTPUT=$(cat "$output_file")
        local claude_error=$(cat "$error_file")
        
        # Nettoyer les fichiers temporaires
        rm -f "$output_file" "$error_file"
        
        # Gérer les erreurs
        if [ $CLAUDE_EXIT_CODE -ne 0 ]; then
            log ERROR "Claude Code a échoué avec le code: $CLAUDE_EXIT_CODE"
            if [ -n "$claude_error" ]; then
                log ERROR "Erreur: $claude_error"
            fi
            return $CLAUDE_EXIT_CODE
        fi
        
        # Sauvegarder la sortie pour debug
        if [ "$VERBOSE" = true ]; then
            local output_log="$LOGS_DIR/claude-output-$(date +%Y%m%d-%H%M%S).json"
            echo "$CLAUDE_OUTPUT" > "$output_log"
            log DEBUG "Sortie Claude sauvegardée dans: $output_log"
        fi
    fi
    
    log SUCCESS "Claude Code exécuté avec succès"
    return 0
}

# Parser la sortie JSON de Claude
parse_claude_output() {
    local output=$1
    
    # Vérifier si c'est du JSON valide
    if ! echo "$output" | jq . &> /dev/null; then
        log WARNING "La sortie de Claude n'est pas du JSON valide"
        return 1
    fi
    
    # Extraire des informations utiles (à adapter selon le format de sortie réel)
    # Pour l'instant, on affiche juste un résumé
    log DEBUG "Analyse de la sortie Claude..."
    
    # Exemple de parsing (à adapter)
    local status=$(echo "$output" | jq -r '.status // "unknown"')
    local message=$(echo "$output" | jq -r '.message // ""')
    
    if [ "$status" = "success" ] || [ "$status" = "completed" ]; then
        log SUCCESS "Claude a terminé avec succès"
        if [ -n "$message" ]; then
            log INFO "Message: $message"
        fi
        return 0
    else
        log WARNING "Statut Claude: $status"
        if [ -n "$message" ]; then
            log INFO "Message: $message"
        fi
        return 1
    fi
}

# Vérifier les changements effectués par Claude
check_claude_changes() {
    log INFO "Vérification des changements effectués..."
    
    # Afficher le statut git
    local changes=$(git status --porcelain)
    
    if [ -z "$changes" ]; then
        log WARNING "Aucun changement détecté après l'exécution de Claude"
        return 1
    fi
    
    log SUCCESS "Changements détectés:"
    echo "$changes" | while IFS= read -r line; do
        log INFO "  $line"
    done
    
    # Afficher un diff sommaire
    if [ "$VERBOSE" = true ]; then
        log DEBUG "Diff des changements:"
        git diff --stat
    fi
    
    return 0
}

# Créer un commit avec les changements
commit_changes() {
    local issue_number=$1
    local issue_title=$2
    
    log INFO "Création du commit..."
    
    # Vérifier qu'il y a des changements
    if ! git diff --quiet || ! git diff --staged --quiet; then
        # Ajouter tous les changements
        git add -A
        
        # Message de commit
        local commit_message="fix: Résolution de l'issue #${issue_number}

${issue_title}

Issue: #${issue_number}
Généré automatiquement par claude-issue.sh"
        
        if [ "$DRY_RUN" = true ]; then
            log INFO "[DRY-RUN] Commit qui serait créé:"
            log INFO "  Message: fix: Résolution de l'issue #${issue_number}"
            log INFO "  Fichiers modifiés:"
            git status --porcelain | while IFS= read -r line; do
                log INFO "    $line"
            done
        else
            # Créer le commit
            git commit -m "$commit_message"
            
            if [ $? -eq 0 ]; then
                log SUCCESS "Commit créé avec succès"
                git log -1 --oneline
            else
                log ERROR "Échec de la création du commit"
                return 1
            fi
        fi
    else
        log WARNING "Aucun changement à committer"
        return 1
    fi
    
    return 0
}
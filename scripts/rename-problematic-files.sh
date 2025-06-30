#!/bin/bash

# Script pour renommer automatiquement les fichiers avec caractères problématiques
# Usage: ./scripts/rename-problematic-files.sh

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Fonction pour normaliser un nom de fichier
normalize_filename() {
    echo "$1" | \
        # Remplacer les espaces par des tirets
        sed 's/ /-/g' | \
        # Remplacer les caractères accentués
        sed 'y/éèêëàâäôöûüçñáíóúý/eeeaaaoouucnaiou/' | \
        # Remplacer les caractères spéciaux par des tirets
        sed 's/[^a-zA-Z0-9._-]/-/g' | \
        # Supprimer les tirets multiples
        sed 's/--*/-/g' | \
        # Supprimer les tirets en début/fin
        sed 's/^-\|-$//g' | \
        # Convertir en minuscules
        tr '[:upper:]' '[:lower:]'
}

echo "🔧 RENOMMAGE AUTOMATIQUE DES FICHIERS PROBLÉMATIQUES"
echo "====================================================="

info "Recherche des fichiers avec caractères problématiques..."

# Trouver tous les fichiers problématiques (exclure node_modules, .git, .next)
problematic_files=$(find . -path "./node_modules" -prune -o -path "./.next" -prune -o -path "./.git" -prune -o \
    \( -name "* *" -o -name "*é*" -o -name "*è*" -o -name "*à*" -o -name "*ç*" -o -name "*ñ*" -o -name "*ü*" -o -name "*É*" -o -name "*È*" -o -name "*À*" -o -name "*Ç*" \) -print)

if [ -z "$problematic_files" ]; then
    success "Aucun fichier problématique trouvé !"
    exit 0
fi

echo ""
info "Fichiers problématiques trouvés :"
echo "$problematic_files"

echo ""
warning "ATTENTION: Ce script va renommer ces fichiers automatiquement."
warning "Assurez-vous d'avoir sauvegardé votre travail et committé vos changements."
echo ""
read -p "Continuer ? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Annulé."
    exit 1
fi

# Tableau pour stocker les renommages effectués
declare -a renames=()

# Renommer chaque fichier
while IFS= read -r file; do
    if [ -n "$file" ]; then
        # Obtenir le répertoire et le nom de fichier
        dir=$(dirname "$file")
        filename=$(basename "$file")
        
        # Normaliser le nom de fichier
        new_filename=$(normalize_filename "$filename")
        
        # Chemin complet du nouveau fichier
        new_file="$dir/$new_filename"
        
        if [ "$file" != "$new_file" ]; then
            info "Renommage: $file -> $new_file"
            
            # Vérifier si le fichier de destination existe déjà
            if [ -e "$new_file" ]; then
                warning "Le fichier $new_file existe déjà, ajout d'un suffixe..."
                counter=1
                extension="${new_filename##*.}"
                basename="${new_filename%.*}"
                while [ -e "$dir/${basename}-${counter}.${extension}" ]; do
                    counter=$((counter + 1))
                done
                new_file="$dir/${basename}-${counter}.${extension}"
                new_filename="${basename}-${counter}.${extension}"
            fi
            
            # Effectuer le renommage
            mv "$file" "$new_file"
            renames+=("$file|$new_file")
            success "Renommé: $(basename "$file") -> $new_filename"
        fi
    fi
done <<< "$problematic_files"

echo ""
if [ ${#renames[@]} -gt 0 ]; then
    success "${#renames[@]} fichier(s) renommé(s) avec succès !"
    
    echo ""
    info "IMPORTANT: Vérifiez maintenant les références à ces fichiers dans le code :"
    echo ""
    
    for rename in "${renames[@]}"; do
        old_file=$(echo "$rename" | cut -d'|' -f1)
        new_file=$(echo "$rename" | cut -d'|' -f2)
        old_name=$(basename "$old_file")
        new_name=$(basename "$new_file")
        
        echo "Recherche des références à '$old_name'..."
        refs=$(grep -r "$old_name" components/ app/ --include="*.jsx" --include="*.tsx" --include="*.js" --include="*.ts" 2>/dev/null || true)
        if [ -n "$refs" ]; then
            warning "Références trouvées - à mettre à jour manuellement :"
            echo "$refs"
            echo ""
        fi
    done
    
    echo ""
    warning "N'oubliez pas de :"
    echo "1. Mettre à jour les références dans le code"
    echo "2. Tester l'application: npm run dev"
    echo "3. Faire un commit: git add . && git commit -m 'fix: Renommage fichiers avec caractères spéciaux'"
    
else
    info "Aucun renommage nécessaire."
fi
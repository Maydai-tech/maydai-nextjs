#!/bin/bash

# Script de vérification pré-merge pour la branche thomas
# Usage: ./scripts/check-thomas-merge.sh

set -e

echo "🔍 VÉRIFICATION PRÉ-MERGE BRANCHE THOMAS"
echo "========================================"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les erreurs
error() {
    echo -e "${RED}❌ ERREUR: $1${NC}"
    exit 1
}

# Fonction pour afficher les warnings
warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

# Fonction pour afficher les succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher les infos
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo ""
info "Étape 1: Récupération des dernières modifications..."
git fetch origin thomas || error "Impossible de récupérer la branche thomas"

echo ""
info "Étape 2: Vérification des noms de fichiers problématiques..."

# Vérifier les fichiers avec espaces ou caractères spéciaux
problematic_files=$(find . -path "./node_modules" -prune -o -path "./.next" -prune -o -path "./.git" -prune -o \
    \( -name "* *" -o -name "*é*" -o -name "*è*" -o -name "*à*" -o -name "*ç*" -o -name "*ñ*" -o -name "*ü*" \) -print)

if [ -n "$problematic_files" ]; then
    warning "Fichiers avec caractères problématiques trouvés:"
    echo "$problematic_files"
    echo ""
    echo "Ces fichiers doivent être renommés avant le merge !"
else
    success "Aucun fichier avec caractères problématiques"
fi

echo ""
info "Étape 3: Vérification des nouveaux fichiers ajoutés..."

# Comparer thomas avec dev
new_files=$(git diff origin/dev..origin/thomas --name-status | grep "^A" | cut -f2 || true)

if [ -n "$new_files" ]; then
    info "Nouveaux fichiers ajoutés depuis thomas:"
    echo "$new_files"
    
    # Vérifier si des images sont ajoutées
    new_images=$(echo "$new_files" | grep -E "\.(png|jpg|jpeg|svg|webp|gif)$" || true)
    if [ -n "$new_images" ]; then
        warning "Nouvelles images détectées - vérifiez leur optimisation:"
        echo "$new_images"
    fi
else
    info "Aucun nouveau fichier ajouté"
fi

echo ""
info "Étape 4: Vérification des références d'images dans le code..."

# Chercher les références d'images dans les composants
image_refs=$(grep -r "\.png\|\.jpg\|\.svg\|\.webp\|\.jpeg\|\.gif" components/ app/ --include="*.jsx" --include="*.tsx" --include="*.js" --include="*.ts" 2>/dev/null | grep -v node_modules || true)

if [ -n "$image_refs" ]; then
    info "Références d'images trouvées dans le code:"
    echo "$image_refs" | head -10
    if [ $(echo "$image_refs" | wc -l) -gt 10 ]; then
        echo "... (et $(( $(echo "$image_refs" | wc -l) - 10 )) autres)"
    fi
    
    # Vérifier les chemins avec espaces
    bad_refs=$(echo "$image_refs" | grep -E "[ éèàçñü]" || true)
    if [ -n "$bad_refs" ]; then
        warning "Références avec caractères problématiques:"
        echo "$bad_refs"
    fi
else
    info "Aucune référence d'image trouvée"
fi

echo ""
info "Étape 5: Test de build..."

if npm run build > /tmp/build.log 2>&1; then
    success "Build Next.js réussi"
else
    error "Échec du build - voir /tmp/build.log pour les détails"
fi

echo ""
info "Étape 6: Test de lint..."

if npm run lint > /tmp/lint.log 2>&1; then
    success "Lint réussi"
else
    warning "Erreurs de lint détectées - voir /tmp/lint.log"
fi

echo ""
info "Étape 7: Test des tests unitaires..."

if npm test > /tmp/test.log 2>&1; then
    success "Tests unitaires réussis"
else
    warning "Échec des tests - voir /tmp/test.log"
fi

echo ""
echo "========================================"
success "VÉRIFICATION TERMINÉE"
echo ""
echo "📋 CHECKLIST MANUELLE À COMPLÉTER:"
echo "- [ ] Vérifier le contenu des nouvelles pages"
echo "- [ ] Tester l'application manuellement"
echo "- [ ] Vérifier l'accessibilité"
echo "- [ ] Contrôler l'orthographe et la grammaire"
echo ""
echo "Si tout est OK, vous pouvez procéder au merge :"
echo "git checkout thomas && git merge dev && git push origin thomas"
echo "git checkout dev && git merge thomas"
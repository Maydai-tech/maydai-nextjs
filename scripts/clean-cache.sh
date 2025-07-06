#!/bin/bash

echo "🧹 Nettoyage du cache Next.js et des dépendances..."

# Supprimer le dossier .next
if [ -d ".next" ]; then
    echo "Suppression du dossier .next..."
    rm -rf .next
fi

# Supprimer le cache des node_modules
if [ -d "node_modules/.cache" ]; then
    echo "Suppression du cache node_modules..."
    rm -rf node_modules/.cache
fi

# Supprimer le cache de Tailwind CSS si il existe
if [ -d ".tailwindcss-cache" ]; then
    echo "Suppression du cache Tailwind CSS..."
    rm -rf .tailwindcss-cache
fi

# Supprimer les autres caches potentiels
if [ -d ".swc" ]; then
    echo "Suppression du cache SWC..."
    rm -rf .swc
fi

echo "✅ Nettoyage terminé ! Vous pouvez maintenant lancer npm run dev"
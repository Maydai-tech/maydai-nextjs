#!/bin/bash

# Script de déploiement vers Vercel avec les variables d'environnement
# Usage: ./scripts/deploy-to-vercel.sh

echo "🚀 Déploiement vers Vercel avec configuration de production..."

# Vérifier que .env.local existe
if [ ! -f ".env.local" ]; then
    echo "❌ Fichier .env.local non trouvé"
    echo "💡 Crée le fichier .env.local avec tes variables de production"
    echo "💡 Voir docs/PRODUCTION_CONFIG.md pour la configuration"
    exit 1
fi

# Tester la configuration
echo "🔍 Test de la configuration..."
node scripts/test-production-config.js

if [ $? -ne 0 ]; then
    echo "❌ Configuration invalide, arrêt du déploiement"
    exit 1
fi

echo "✅ Configuration validée"

# Vérifier que Vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI non installé"
    echo "💡 Installe avec: npm i -g vercel"
    exit 1
fi

# Vérifier que l'utilisateur est connecté à Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Non connecté à Vercel"
    echo "💡 Connecte-toi avec: vercel login"
    exit 1
fi

echo "📦 Déploiement en cours..."

# Déployer
vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Déploiement réussi !"
    echo "💡 N'oublie pas de configurer les variables d'environnement dans Vercel"
    echo "💡 Voir docs/PRODUCTION_CONFIG.md pour la configuration des variables"
else
    echo "❌ Erreur lors du déploiement"
    exit 1
fi

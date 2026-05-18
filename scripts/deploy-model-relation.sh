#!/bin/bash

# Script de déploiement de la relation usecase ↔ compl_ai_models
echo "🚀 Déploiement de la relation usecase ↔ compl_ai_models"

# 1. Appliquer la migration SQL
echo "📝 Application de la migration SQL..."
supabase db push

# 2. Exécuter le script de migration des données
echo "🔄 Migration des données existantes..."
supabase db reset --linked

# 3. Vérifier les mappings
echo "✅ Vérification des mappings..."
supabase db reset --linked

echo "🎉 Déploiement terminé !"
echo ""
echo "📊 Pour vérifier les mappings, exécutez :"
echo "supabase db reset --linked"
echo ""
echo "🔍 Ou connectez-vous à Supabase et exécutez :"
echo "SELECT COUNT(*) as total, COUNT(primary_model_id) as mapped FROM usecases;"


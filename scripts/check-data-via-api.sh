#!/bin/bash

# Script pour vérifier les données COMPL-AI via l'API REST Supabase
# Usage: ./scripts/check-data-via-api.sh

echo "🔍 Checking COMPL-AI data via REST API..."
echo ""

# Variables d'environnement
SUPABASE_URL="https://kzdolxpjysirikcpusrv.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6ZG9seHBqeXNpcmlrY3B1c3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzI0OTksImV4cCI6MjA2MDgwODQ5OX0.47DS18wnPjClHoSXY2S6ey3SpmBU_CmPjM3D_-o76LE"

echo "📊 Getting evaluations for gpt-4-1106-preview..."

# Requête pour récupérer les données de gpt-4-1106-preview
curl -X GET \
  "${SUPABASE_URL}/rest/v1/compl_ai_evaluations?select=id,score,evaluation_date,compl_ai_models!inner(model_name),compl_ai_principles!inner(name,code)&compl_ai_models.model_name=eq.gpt-4-1106-preview" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -s | jq '.'

echo ""
echo "🎯 Getting diversity category details..."

# Requête spécifique pour la catégorie diversity
curl -X GET \
  "${SUPABASE_URL}/rest/v1/compl_ai_evaluations?select=id,score,raw_data,compl_ai_models!inner(model_name),compl_ai_principles!inner(name,code)&compl_ai_models.model_name=eq.gpt-4-1106-preview&compl_ai_principles.code=eq.diversity_non_discrimination_fairness" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -s | jq '.[] | {
    score: .score,
    principle: .compl_ai_principles.name,
    benchmark_details: .raw_data.benchmark_details
  }'

echo ""
echo "💡 Look for:"
echo "   - Representation Bias: should be N/A or -1, not 0.98"
echo "   - BBQ: should be 0.98"
echo ""
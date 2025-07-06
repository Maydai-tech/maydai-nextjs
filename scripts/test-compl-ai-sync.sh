#!/bin/bash

echo "🧪 Test de l'edge function COMPL-AI après nettoyage..."

# Appel de l'edge function
response=$(curl -s -X POST https://kzdolxpjysirikcpusrv.supabase.co/functions/v1/compl-ai-sync \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6ZG9seHBqeXNpcmlrY3B1c3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzI0OTksImV4cCI6MjA2MDgwODQ5OX0.47DS18wnPjClHoSXY2S6ey3SpmBU_CmPjM3D_-o76LE" \
  -H "Content-Type: application/json" \
  --max-time 120)

echo "📊 Réponse de l'edge function :"
echo "$response" | jq '.'

# Vérifier le succès
success=$(echo "$response" | jq -r '.success')
if [ "$success" = "true" ]; then
    echo "✅ Edge function fonctionne parfaitement après nettoyage !"
    
    models_synced=$(echo "$response" | jq -r '.models_synced')
    evaluations_created=$(echo "$response" | jq -r '.evaluations_created')
    execution_time=$(echo "$response" | jq -r '.execution_time_ms')
    
    echo "📈 Statistiques :"
    echo "   • Modèles synchronisés: $models_synced"
    echo "   • Évaluations créées: $evaluations_created"
    echo "   • Temps d'exécution: ${execution_time}ms"
else
    echo "❌ Erreur dans l'edge function !"
    echo "$response" | jq -r '.error // .errors[]?'
fi
#!/bin/bash

# Script pour découvrir les endpoints COMPL-AI disponibles
# Usage: ./scripts/discover-compl-ai-endpoints.sh

set -e

echo "🔍 Discovering COMPL-AI endpoints..."
echo ""

# Créer le dossier de sortie
OUTPUT_DIR="scripts/compl-ai-responses"
mkdir -p "$OUTPUT_DIR"

# Timestamp pour les fichiers
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Fonction pour tester un endpoint
test_endpoint() {
    local endpoint="$1"
    local description="$2"
    
    echo "🔍 Testing: $endpoint ($description)"
    
    local output_file="$OUTPUT_DIR/endpoint_${endpoint//\//_}_${TIMESTAMP}.json"
    
    # Essayer avec des paramètres vides d'abord
    curl -X GET \
        "https://latticeflow-compl-ai-board.hf.space$endpoint" \
        -o "$output_file" \
        -w "   GET Status: %{http_code} | Time: %{time_total}s\n" \
        -s
    
    # Vérifier la réponse
    if [[ -f "$output_file" ]]; then
        local size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null || echo "0")
        if [[ $size -gt 10 ]]; then
            echo "   ✅ GET Response saved"
            # Afficher les premières lignes
            head -c 200 "$output_file" | tr -d '\0' | head -3
        else
            echo "   ❌ Empty GET response"
        fi
    fi
    
    # Essayer avec POST et paramètres génériques
    local post_output_file="$OUTPUT_DIR/endpoint_${endpoint//\//_}_POST_${TIMESTAMP}.json"
    
    curl -X POST \
        -H "Content-Type: application/json" \
        -d '{"data": []}' \
        "https://latticeflow-compl-ai-board.hf.space$endpoint" \
        -o "$post_output_file" \
        -w "   POST Status: %{http_code} | Time: %{time_total}s\n" \
        -s
    
    if [[ -f "$post_output_file" ]]; then
        local size=$(stat -f%z "$post_output_file" 2>/dev/null || stat -c%s "$post_output_file" 2>/dev/null || echo "0")
        if [[ $size -gt 10 ]]; then
            echo "   ✅ POST Response saved"
        else
            echo "   ❌ Empty POST response"
        fi
    fi
    
    echo ""
}

# Tester l'endpoint racine
echo "🌐 Testing base URL..."
curl -X GET \
    "https://latticeflow-compl-ai-board.hf.space/" \
    -o "$OUTPUT_DIR/base_${TIMESTAMP}.html" \
    -w "Base URL Status: %{http_code} | Time: %{time_total}s\n" \
    -s

echo ""

# Tester les endpoints connus
test_endpoint "/" "Root endpoint"
test_endpoint "/api" "API info"
test_endpoint "/info" "Info endpoint"
test_endpoint "/config" "Config endpoint"

# Tester les endpoints partiels connus
test_endpoint "/partial" "Partial endpoint"
test_endpoint "/partial_2" "Partial 2 endpoint"
test_endpoint "/partial_5" "Partial 5 endpoint"
test_endpoint "/partial_9" "Partial 9 endpoint"
test_endpoint "/partial_11" "Partial 11 endpoint"

# Tester d'autres endpoints possibles
test_endpoint "/predict" "Predict endpoint"
test_endpoint "/run" "Run endpoint"
test_endpoint "/call" "Call endpoint"
test_endpoint "/submit" "Submit endpoint"

echo "🎉 Discovery completed!"
echo ""
echo "📋 Check the files in: $OUTPUT_DIR"
echo "   - Look for successful responses (non-empty files)"
echo "   - Check HTML content for available endpoints"
echo ""

# Analyser le contenu HTML de base si disponible
BASE_FILE="$OUTPUT_DIR/base_${TIMESTAMP}.html"
if [[ -f "$BASE_FILE" ]]; then
    echo "📄 Analyzing base HTML content..."
    
    # Chercher des endpoints dans le HTML
    if command -v grep &> /dev/null; then
        echo "🔍 Potential endpoints found in HTML:"
        grep -o 'href="[^"]*"' "$BASE_FILE" 2>/dev/null | sort -u | head -20 || echo "   No href links found"
        
        echo ""
        echo "🔍 Potential API paths found:"
        grep -o '/[a-zA-Z_][a-zA-Z0-9_]*' "$BASE_FILE" 2>/dev/null | sort -u | head -20 || echo "   No API paths found"
    fi
fi

echo ""
echo "💡 Next steps:"
echo "   1. Check successful responses for API structure"
echo "   2. Look for documentation or endpoint lists"
echo "   3. Try to access the Gradio interface directly"
echo "   4. Check if authentication is required"
#!/bin/bash

# Script pour tester les endpoints Gradio COMPL-AI
# Usage: ./scripts/test-gradio-api.sh

set -e

echo "🔍 Testing Gradio API endpoints..."
echo ""

# Créer le dossier de sortie
OUTPUT_DIR="scripts/compl-ai-responses"
mkdir -p "$OUTPUT_DIR"

# Timestamp pour les fichiers
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# D'abord, récupérer la configuration complète
echo "📋 Getting Gradio config..."
curl -X GET \
    "https://latticeflow-compl-ai-board.hf.space/config" \
    -o "$OUTPUT_DIR/gradio_config_${TIMESTAMP}.json" \
    -s

# Analyser la config pour trouver les endpoints
echo "🔍 Analyzing Gradio config..."
if command -v jq &> /dev/null && [[ -f "$OUTPUT_DIR/gradio_config_${TIMESTAMP}.json" ]]; then
    echo "📊 Found endpoints in config:"
    jq -r '.dependencies // [] | .[] | select(.type? == "backend") | .url' "$OUTPUT_DIR/gradio_config_${TIMESTAMP}.json" 2>/dev/null || echo "No backend URLs found"
    
    echo ""
    echo "📊 Available functions:"
    jq -r '.dependencies // [] | .[] | select(.fn_index?) | "Function " + (.fn_index | tostring) + ": " + (.api_name // "unnamed")' "$OUTPUT_DIR/gradio_config_${TIMESTAMP}.json" 2>/dev/null || echo "No functions found"
fi

echo ""

# Fonction pour tester un endpoint Gradio
test_gradio_endpoint() {
    local fn_index="$1"
    local category_name="$2"
    local params="$3"
    
    echo "🔍 Testing Gradio function $fn_index ($category_name)"
    
    local output_file="$OUTPUT_DIR/gradio_${category_name}_${TIMESTAMP}.json"
    
    # Format Gradio API
    local gradio_payload='{
        "data": '"$params"',
        "fn_index": '"$fn_index"',
        "session_hash": "test_session"
    }'
    
    echo "   Payload: $gradio_payload"
    
    # Tester l'endpoint Gradio
    curl -X POST \
        -H "Content-Type: application/json" \
        -d "$gradio_payload" \
        "https://latticeflow-compl-ai-board.hf.space/gradio_api/run/predict" \
        -o "$output_file" \
        -w "   Status: %{http_code} | Time: %{time_total}s | Size: %{size_download} bytes\n" \
        -s
    
    # Vérifier la réponse
    if [[ -f "$output_file" ]]; then
        local size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null || echo "0")
        if [[ $size -gt 10 ]]; then
            echo "   ✅ Saved to: $output_file"
            
            # Afficher un aperçu de la réponse
            if command -v jq &> /dev/null; then
                echo "   📊 Response preview:"
                jq -r '.data // [] | if type == "array" then .[0] else . end | if type == "object" then .headers // empty else empty end' "$output_file" 2>/dev/null | head -1 || echo "   (No headers found)"
            fi
        else
            echo "   ❌ Empty or invalid response"
        fi
    else
        echo "   ❌ Failed to save response"
    fi
    
    echo ""
}

# Tester les endpoints connus avec différents indices de fonction
# Basé sur votre configuration, essayons différents indices

echo "🧪 Testing various function indices..."
echo ""

# Test avec différents indices de fonction (0-20)
for i in {0..20}; do
    echo "🔍 Testing function index $i"
    
    output_file="$OUTPUT_DIR/gradio_function_${i}_${TIMESTAMP}.json"
    
    # Test avec des paramètres simples
    simple_payload='{
        "data": [["test"]],
        "fn_index": '"$i"',
        "session_hash": "test_session"
    }'
    
    curl -X POST \
        -H "Content-Type: application/json" \
        -d "$simple_payload" \
        "https://latticeflow-compl-ai-board.hf.space/gradio_api/run/predict" \
        -o "$output_file" \
        -w "   Status: %{http_code} | Time: %{time_total}s\n" \
        -s
    
    # Vérifier si on a une réponse valide
    if [[ -f "$output_file" ]]; then
        size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null || echo "0")
        if [[ $size -gt 50 ]]; then
            echo "   ✅ Function $i responded"
            
            # Vérifier le contenu
            if command -v jq &> /dev/null; then
                has_data=$(jq -r '.data // empty' "$output_file" 2>/dev/null | head -1)
                if [[ -n "$has_data" ]]; then
                    echo "   📊 Has data response"
                fi
            fi
        else
            echo "   ❌ Function $i no response"
            rm -f "$output_file"
        fi
    fi
done

echo ""
echo "🎉 Function index discovery completed!"
echo ""

# Maintenant tester avec les vrais paramètres pour les fonctions qui ont répondu
echo "🔬 Testing successful functions with real parameters..."
echo ""

# Chercher les fichiers qui ont des réponses valides
for file in "$OUTPUT_DIR"/gradio_function_*_${TIMESTAMP}.json; do
    if [[ -f "$file" ]]; then
        fn_index=$(basename "$file" | sed 's/gradio_function_\([0-9]*\)_.*/\1/')
        
        echo "🧪 Testing function $fn_index with diversity parameters..."
        
        # Tester avec les paramètres de diversité
        test_gradio_endpoint "$fn_index" "diversity_test" '[
            ["Representation Bias: RedditBias", "Prejudiced Answers: BBQ", "Biased Completions: BOLD"],
            ["Income Fairness: DecodingTrust", "Recommendation Consistency: FaiRLLM"]
        ]'
    fi
done

echo ""
echo "📋 Summary of discoveries:"
echo "   - Check $OUTPUT_DIR for all responses"
echo "   - Look for files with 'has data response' messages"
echo "   - Compare function indices with your code configuration"
echo ""
echo "💡 Next steps:"
echo "   1. Identify working function indices"
echo "   2. Map them to your category configuration"
echo "   3. Update your Supabase function with correct indices"
#!/bin/bash

# Script pour tester l'API COMPL-AI et stocker les réponses
# Usage: ./scripts/test-compl-ai-api.sh

set -e

# Créer le dossier de sortie
OUTPUT_DIR="scripts/compl-ai-responses"
mkdir -p "$OUTPUT_DIR"

# Timestamp pour les fichiers
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🚀 Testing COMPL-AI API endpoints..."
echo "📁 Results will be saved in: $OUTPUT_DIR"
echo ""

# Fonction pour tester un endpoint
test_endpoint() {
    local category_name="$1"
    local endpoint="$2"
    local params="$3"
    
    echo "🔍 Testing: $category_name"
    echo "   Endpoint: $endpoint"
    
    local output_file="$OUTPUT_DIR/${category_name}_${TIMESTAMP}.json"
    
    # Faire l'appel API avec curl
    curl -X POST \
        -H "Content-Type: application/json" \
        -d "$params" \
        "https://latticeflow-compl-ai-board.hf.space/call$endpoint" \
        -o "$output_file" \
        -w "   Status: %{http_code} | Time: %{time_total}s | Size: %{size_download} bytes\n" \
        -s
    
    # Vérifier si le fichier contient des données valides
    if [[ -f "$output_file" ]]; then
        local size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null || echo "0")
        if [[ $size -gt 10 ]]; then
            echo "   ✅ Saved to: $output_file"
            
            # Extraire les headers si possible
            if command -v jq &> /dev/null; then
                local headers=$(jq -r '.data[0].headers // empty' "$output_file" 2>/dev/null || echo "")
                if [[ -n "$headers" && "$headers" != "null" ]]; then
                    echo "   📊 Headers found: $(echo "$headers" | jq -r 'length // 0') columns"
                fi
            fi
        else
            echo "   ❌ Empty or invalid response"
        fi
    else
        echo "   ❌ Failed to save response"
    fi
    
    echo ""
}

# Test 1: Technical Robustness and Safety
test_endpoint "technical_robustness_safety" "/partial" '{
    "data": [
        ["MMLU: Robustness", "BoolQ Contrast Set", "IMDB Contrast Set", "Monotonicity Checks", "Self-Check Consistency"],
        ["Goal Hijacking and Prompt Leakage", "Rule Following"]
    ]
}'

# Test 2: Privacy & Data Governance
test_endpoint "privacy_data_governance" "/partial_2" '{
    "data": [
        ["Toxicity of the Dataset", "Bias of the Dataset"],
        ["Copyrighted Material Memorization"],
        ["PII Extraction by Association"]
    ]
}'

# Test 3: Transparency
test_endpoint "transparency" "/partial_5" '{
    "data": [
        ["General Knowledge: MMLU", "Reasoning: AI2 Reasoning Challenge", "Common Sense Reasoning: HellaSwag", "Truthfulness: TruthfulQA MC2", "Coding: HumanEval"],
        ["Logit Calibration: BIG-Bench", "Self-Assessment: TriviaQA"],
        ["Denying Human Presence"],
        ["Watermark Reliability & Robustness"]
    ]
}'

# Test 4: Diversity, Non-discrimination & Fairness (celle qui nous intéresse)
test_endpoint "diversity_non_discrimination_fairness" "/partial_9" '{
    "data": [
        ["Representation Bias: RedditBias", "Prejudiced Answers: BBQ", "Biased Completions: BOLD"],
        ["Income Fairness: DecodingTrust", "Recommendation Consistency: FaiRLLM"]
    ]
}'

# Test 5: Social & Environmental Well-being
test_endpoint "social_environmental_wellbeing" "/partial_11" '{
    "data": [
        ["Toxic Completions of Benign Text: RealToxicityPrompts", "Following Harmful Instructions: AdvBench"]
    ]
}'

echo "🎉 All tests completed!"
echo ""
echo "📋 Summary:"
echo "   - Results saved in: $OUTPUT_DIR"
echo "   - Files pattern: *_${TIMESTAMP}.json"
echo ""

# Créer un fichier de résumé si jq est disponible
if command -v jq &> /dev/null; then
    echo "📊 Creating summary report..."
    SUMMARY_FILE="$OUTPUT_DIR/summary_${TIMESTAMP}.txt"
    
    {
        echo "COMPL-AI API Test Summary"
        echo "=========================="
        echo "Timestamp: $(date)"
        echo "Test run: $TIMESTAMP"
        echo ""
        
        for file in "$OUTPUT_DIR"/*_${TIMESTAMP}.json; do
            if [[ -f "$file" ]]; then
                local filename=$(basename "$file")
                local category=$(echo "$filename" | sed "s/_${TIMESTAMP}.json//")
                
                echo "Category: $category"
                echo "File: $filename"
                
                # Extraire les informations de structure
                local headers_count=$(jq -r '.data[0].headers // [] | length' "$file" 2>/dev/null || echo "0")
                local rows_count=$(jq -r '.data[0].data // [] | length' "$file" 2>/dev/null || echo "0")
                
                echo "Structure: $headers_count columns, $rows_count rows"
                
                # Afficher les headers
                if [[ $headers_count -gt 0 ]]; then
                    echo "Headers:"
                    jq -r '.data[0].headers // [] | map("  - " + .) | join("\n")' "$file" 2>/dev/null || echo "  (Could not extract headers)"
                fi
                
                echo ""
            fi
        done
        
        echo "End of summary"
    } > "$SUMMARY_FILE"
    
    echo "   ✅ Summary saved to: $SUMMARY_FILE"
fi

echo ""
echo "🔍 To analyze the results:"
echo "   - Check individual JSON files for raw API responses"
echo "   - Look for header order and data structure"
echo "   - Compare with expected benchmark mapping"
echo ""
echo "📖 Example commands:"
echo "   cat $OUTPUT_DIR/diversity_non_discrimination_fairness_${TIMESTAMP}.json | jq '.data[0].headers'"
echo "   cat $OUTPUT_DIR/diversity_non_discrimination_fairness_${TIMESTAMP}.json | jq '.data[0].data[0]'"
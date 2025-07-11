#!/bin/bash

# Script pour tester correctement l'API COMPL-AI
# Usage: ./scripts/test-compl-ai-correct.sh

set -e

echo "🔍 Testing COMPL-AI with correct Gradio API..."
echo ""

# Créer le dossier de sortie
OUTPUT_DIR="scripts/compl-ai-responses"
mkdir -p "$OUTPUT_DIR"

# Timestamp pour les fichiers
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Fonction pour tester un endpoint Gradio
test_compl_ai() {
    local fn_index="$1"
    local category_name="$2"
    local params="$3"
    
    echo "🔍 Testing: $category_name (function $fn_index)"
    
    local output_file="$OUTPUT_DIR/compl_ai_${category_name}_${TIMESTAMP}.json"
    
    # Format Gradio API correct
    local gradio_payload='{
        "data": '"$params"',
        "fn_index": '"$fn_index"',
        "session_hash": "compl_ai_test"
    }'
    
    echo "   Parameters: $(echo "$params" | jq -c .)"
    
    # Appeler l'API Gradio correctement
    curl -X POST \
        -H "Content-Type: application/json" \
        -d "$gradio_payload" \
        "https://latticeflow-compl-ai-board.hf.space/gradio_api/run/predict" \
        -o "$output_file" \
        -w "   Status: %{http_code} | Time: %{time_total}s | Size: %{size_download} bytes\n" \
        -s
    
    # Analyser la réponse
    if [[ -f "$output_file" ]]; then
        local size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null || echo "0")
        if [[ $size -gt 100 ]]; then
            echo "   ✅ Response saved to: $output_file"
            
            # Analyser le contenu de la réponse
            if command -v jq &> /dev/null; then
                # Vérifier si c'est une erreur
                local error_check=$(jq -r '.error // empty' "$output_file" 2>/dev/null)
                if [[ -n "$error_check" ]]; then
                    echo "   ❌ API Error: $error_check"
                else
                    # Vérifier les données
                    local has_data=$(jq -r '.data // empty' "$output_file" 2>/dev/null)
                    if [[ -n "$has_data" && "$has_data" != "null" ]]; then
                        echo "   📊 Data received!"
                        
                        # Analyser la structure des données
                        local data_type=$(jq -r '.data | type' "$output_file" 2>/dev/null)
                        echo "   📋 Data type: $data_type"
                        
                        if [[ "$data_type" == "array" ]]; then
                            local first_item=$(jq -r '.data[0] | type' "$output_file" 2>/dev/null)
                            echo "   📋 First item type: $first_item"
                            
                            # Si c'est un objet, chercher les headers
                            if [[ "$first_item" == "object" ]]; then
                                local headers=$(jq -r '.data[0].headers // empty' "$output_file" 2>/dev/null)
                                if [[ -n "$headers" && "$headers" != "null" ]]; then
                                    local header_count=$(jq -r '.data[0].headers | length' "$output_file" 2>/dev/null)
                                    echo "   🎯 Headers found: $header_count columns"
                                    
                                    # Afficher les premiers headers
                                    echo "   📝 Sample headers:"
                                    jq -r '.data[0].headers[0:5][]' "$output_file" 2>/dev/null | sed 's/^/      - /' || echo "      (Could not extract headers)"
                                    
                                    # Vérifier les données
                                    local row_count=$(jq -r '.data[0].data | length // 0' "$output_file" 2>/dev/null)
                                    echo "   📊 Rows: $row_count"
                                    
                                    if [[ $row_count -gt 0 ]]; then
                                        echo "   🎯 SUCCESS: Valid table data received!"
                                        
                                        # Chercher gpt-4-1106-preview dans les données
                                        local gpt4_found=$(jq -r '.data[0].data[] | select(.[0] and (.[0] | tostring | test("gpt-4-1106-preview"; "i"))) | .[0]' "$output_file" 2>/dev/null | head -1)
                                        if [[ -n "$gpt4_found" ]]; then
                                            echo "   🔍 Found gpt-4-1106-preview: $gpt4_found"
                                        fi
                                    fi
                                fi
                            fi
                        fi
                    else
                        echo "   ⚠️  No data in response"
                    fi
                fi
            fi
        else
            echo "   ❌ Empty or small response"
        fi
    else
        echo "   ❌ Failed to save response"
    fi
    
    echo ""
}

echo "🧪 Testing all COMPL-AI categories with correct API..."
echo ""

# Test 1: Technical Robustness and Safety (fn_index: 0, api_name: "partial")
test_compl_ai 0 "technical_robustness_safety" '[
    ["MMLU: Robustness", "BoolQ Contrast Set", "IMDB Contrast Set", "Monotonicity Checks", "Self-Check Consistency"],
    ["Goal Hijacking and Prompt Leakage", "Rule Following"]
]'

# Test 2: Privacy & Data Governance (fn_index: 2, api_name: "partial_2")
test_compl_ai 2 "privacy_data_governance" '[
    ["Toxicity of the Dataset", "Bias of the Dataset"],
    ["Copyrighted Material Memorization"],
    ["PII Extraction by Association"]
]'

# Test 3: Transparency (fn_index: 5, api_name: "partial_5")
test_compl_ai 5 "transparency" '[
    ["General Knowledge: MMLU", "Reasoning: AI2 Reasoning Challenge", "Common Sense Reasoning: HellaSwag", "Truthfulness: TruthfulQA MC2", "Coding: HumanEval"],
    ["Logit Calibration: BIG-Bench", "Self-Assessment: TriviaQA"],
    ["Denying Human Presence"],
    ["Watermark Reliability & Robustness"]
]'

# Test 4: Diversity, Non-discrimination & Fairness (fn_index: 9, api_name: "partial_9")
test_compl_ai 9 "diversity_non_discrimination_fairness" '[
    ["Representation Bias: RedditBias", "Prejudiced Answers: BBQ", "Biased Completions: BOLD"],
    ["Income Fairness: DecodingTrust", "Recommendation Consistency: FaiRLLM"]
]'

# Test 5: Social & Environmental Well-being (fn_index: 11, api_name: "partial_11")
test_compl_ai 11 "social_environmental_wellbeing" '[
    ["Toxic Completions of Benign Text: RealToxicityPrompts", "Following Harmful Instructions: AdvBench"]
]'

echo "🎉 All COMPL-AI tests completed!"
echo ""
echo "📊 Results summary:"
echo "   - Check files in: $OUTPUT_DIR"
echo "   - Look for 'SUCCESS: Valid table data received!' messages"
echo "   - Files with table data contain the actual scores"
echo ""
echo "🔍 To analyze a specific category (e.g., diversity):"
echo "   cat $OUTPUT_DIR/compl_ai_diversity_non_discrimination_fairness_${TIMESTAMP}.json | jq '.data[0].headers'"
echo "   cat $OUTPUT_DIR/compl_ai_diversity_non_discrimination_fairness_${TIMESTAMP}.json | jq '.data[0].data[0]'"
echo ""
echo "🎯 To find gpt-4-1106-preview data:"
echo "   cat $OUTPUT_DIR/compl_ai_diversity_non_discrimination_fairness_${TIMESTAMP}.json | jq '.data[0].data[] | select(.[0] and (.[0] | tostring | test(\"gpt-4-1106-preview\"; \"i\")))'"
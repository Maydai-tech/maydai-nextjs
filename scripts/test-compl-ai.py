#!/usr/bin/env python3

import json
import os
from gradio_client import Client
from datetime import datetime

def main():
    print("🔍 Testing COMPL-AI with Gradio Client...")
    print("")
    
    # Créer le dossier de sortie
    output_dir = "scripts/compl-ai-responses"
    os.makedirs(output_dir, exist_ok=True)
    
    # Timestamp pour les fichiers
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Configuration des catégories (copié depuis votre Supabase function)
    categories = {
        "technical_robustness_safety": {
            "endpoint": "/partial",
            "params": [
                ["MMLU: Robustness", "BoolQ Contrast Set", "IMDB Contrast Set", "Monotonicity Checks", "Self-Check Consistency"],
                ["Goal Hijacking and Prompt Leakage", "Rule Following"]
            ]
        },
        "privacy_data_governance": {
            "endpoint": "/partial_2",
            "params": [
                ["Toxicity of the Dataset", "Bias of the Dataset"],
                ["Copyrighted Material Memorization"],
                ["PII Extraction by Association"]
            ]
        },
        "transparency": {
            "endpoint": "/partial_5",
            "params": [
                ["General Knowledge: MMLU", "Reasoning: AI2 Reasoning Challenge", "Common Sense Reasoning: HellaSwag", "Truthfulness: TruthfulQA MC2", "Coding: HumanEval"],
                ["Logit Calibration: BIG-Bench", "Self-Assessment: TriviaQA"],
                ["Denying Human Presence"],
                ["Watermark Reliability & Robustness"]
            ]
        },
        "diversity_non_discrimination_fairness": {
            "endpoint": "/partial_9",
            "params": [
                ["Representation Bias: RedditBias", "Prejudiced Answers: BBQ", "Biased Completions: BOLD"],
                ["Income Fairness: DecodingTrust", "Recommendation Consistency: FaiRLLM"]
            ]
        },
        "social_environmental_wellbeing": {
            "endpoint": "/partial_11",
            "params": [
                ["Toxic Completions of Benign Text: RealToxicityPrompts", "Following Harmful Instructions: AdvBench"]
            ]
        }
    }
    
    # Se connecter au client Gradio
    try:
        print("🔗 Connecting to COMPL-AI Gradio app...")
        client = Client("latticeflow/compl-ai-board")
        print("✅ Connected successfully!")
        print("")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return
    
    # Tester chaque catégorie
    for category_name, config in categories.items():
        print(f"🔍 Testing: {category_name}")
        print(f"   Endpoint: {config['endpoint']}")
        print(f"   Parameters: {config['params']}")
        
        try:
            # Appeler l'endpoint avec les paramètres
            result = client.predict(*config['params'], api_name=config['endpoint'])
            
            # Sauvegarder la réponse
            output_file = f"{output_dir}/compl_ai_{category_name}_{timestamp}.json"
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            
            print(f"   ✅ Response saved to: {output_file}")
            
            # Analyser la réponse
            if isinstance(result, list) and len(result) > 0:
                first_item = result[0]
                if isinstance(first_item, dict):
                    if 'headers' in first_item and 'data' in first_item:
                        headers = first_item['headers']
                        data = first_item['data']
                        print(f"   📊 Table format - Headers: {len(headers)}, Rows: {len(data)}")
                        print(f"   📝 Sample headers: {headers[:5]}")
                        
                        # Chercher gpt-4-1106-preview
                        gpt4_rows = []
                        for row in data:
                            if len(row) > 0 and row[0] and 'gpt-4-1106-preview' in str(row[0]).lower():
                                gpt4_rows.append(row)
                        
                        if gpt4_rows:
                            print(f"   🎯 Found {len(gpt4_rows)} rows for gpt-4-1106-preview")
                            for i, row in enumerate(gpt4_rows):
                                print(f"      Row {i+1}: {row[0]} -> {len(row)} columns")
                        else:
                            print("   ℹ️  No gpt-4-1106-preview found in this category")
                        
                        print("   🎯 SUCCESS: Valid table data received!")
                    else:
                        print(f"   ⚠️  Unexpected object format: {list(first_item.keys())}")
                else:
                    print(f"   ⚠️  Unexpected response format: {type(first_item)}")
            else:
                print(f"   ⚠️  Unexpected response: {type(result)}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
            
        print("")
    
    print("🎉 All COMPL-AI tests completed!")
    print("")
    print("📊 Results summary:")
    print(f"   - Check files in: {output_dir}")
    print("   - Look for 'SUCCESS: Valid table data received!' messages")
    print("   - Files with table data contain the actual scores")
    print("")
    print("🔍 To analyze the diversity data:")
    print(f"   python3 -c \"")
    print(f"import json")
    print(f"with open('{output_dir}/compl_ai_diversity_non_discrimination_fairness_{timestamp}.json') as f:")
    print(f"    data = json.load(f)")
    print(f"    headers = data[0]['headers']")
    print(f"    print('Headers:', headers)")
    print(f"    for row in data[0]['data']:")
    print(f"        if 'gpt-4-1106-preview' in str(row[0]).lower():")
    print(f"            print('GPT-4 row:', row)")
    print(f"\"")

if __name__ == "__main__":
    main()
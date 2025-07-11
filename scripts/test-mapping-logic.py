#!/usr/bin/env python3

import json
import os

def test_mapping_logic():
    """
    Teste la logique de mapping avec les vraies données de l'API
    """
    print("🧪 Testing mapping logic with real COMPL-AI data...")
    print("")
    
    # Charger les données de diversity (où se trouve le problème)
    data_file = "scripts/compl-ai-responses/compl_ai_diversity_non_discrimination_fairness_20250710_180431.json"
    
    if not os.path.exists(data_file):
        print("❌ Data file not found. Run test-compl-ai.py first.")
        return
    
    with open(data_file, 'r') as f:
        data = json.load(f)
    
    headers = data['headers']
    rows = data['data']
    
    print("📊 Headers from API:")
    for i, header in enumerate(headers):
        print(f"   {i}: {header}")
    print("")
    
    # Configuration benchmark (copié du code Supabase)
    benchmark_mapping = [
        {"name": "Representation Bias: RedditBias", "key": "reddit_bias_score", "category": "bias"},
        {"name": "Prejudiced Answers: BBQ", "key": "bbq_prejudice_score", "category": "bias"},
        {"name": "Biased Completions: BOLD", "key": "bold_completions_score", "category": "bias"},
        {"name": "Income Fairness: DecodingTrust", "key": "income_fairness_score", "category": "fairness"},
        {"name": "Recommendation Consistency: FaiRLLM", "key": "recommendation_consistency_score", "category": "fairness"}
    ]
    
    # Trouver l'index de la colonne Model
    model_index = -1
    for i, header in enumerate(headers):
        if 'model' in header.lower():
            model_index = i
            break
    
    print(f"🎯 Model column index: {model_index}")
    print("")
    
    # Créer le mapping des benchmarks
    benchmark_indices = {}
    
    print("🔍 Mapping benchmarks to headers:")
    for benchmark in benchmark_mapping:
        benchmark_name = benchmark["name"]
        
        # Chercher correspondance exacte
        header_index = -1
        for i, header in enumerate(headers):
            if header == benchmark_name:
                header_index = i
                break
        
        if header_index != -1:
            benchmark_indices[benchmark_name] = header_index
            print(f"   ✅ {benchmark_name} -> column {header_index} ({headers[header_index]})")
        else:
            print(f"   ❌ {benchmark_name} -> NOT FOUND")
    
    print("")
    
    # Trouver et analyser gpt-4-1106-preview
    print("🔍 Analyzing gpt-4-1106-preview:")
    
    gpt4_row = None
    for row in rows:
        if len(row) > model_index and 'gpt-4-1106-preview' in str(row[model_index]).lower():
            gpt4_row = row
            break
    
    if not gpt4_row:
        print("   ❌ gpt-4-1106-preview not found!")
        return
    
    print(f"   Row data: {gpt4_row}")
    print("")
    
    print("📋 Score mapping for gpt-4-1106-preview:")
    scores = []
    detailed_scores = []
    
    for benchmark in benchmark_mapping:
        benchmark_name = benchmark["name"]
        if benchmark_name in benchmark_indices:
            column_index = benchmark_indices[benchmark_name]
            value = gpt4_row[column_index]
            
            print(f"   {benchmark_name}:")
            print(f"      Column {column_index}: {value} (type: {type(value).__name__})")
            
            if value == "N/A" or value == "" or (isinstance(value, str) and value.lower() == "n/a"):
                print(f"      -> N/A (skipped)")
                detailed_scores.append({
                    "name": benchmark_name,
                    "key": benchmark["key"],
                    "category": benchmark["category"],
                    "score": -1,  # Indicateur N/A
                    "position": len(detailed_scores)
                })
            elif isinstance(value, (int, float)) and 0 <= value <= 1:
                scores.append(value)
                detailed_scores.append({
                    "name": benchmark_name,
                    "key": benchmark["key"],
                    "category": benchmark["category"],
                    "score": value,
                    "position": len(detailed_scores)
                })
                print(f"      -> Valid score: {value}")
            else:
                print(f"      -> Invalid value: {value}")
        else:
            print(f"   {benchmark_name}: NOT MAPPED")
    
    print("")
    print("📊 Final results:")
    print(f"   Valid scores: {scores}")
    print(f"   Average score: {sum(scores) / len(scores) if scores else 'N/A'}")
    print("")
    
    print("🎯 Expected for gpt-4-1106-preview:")
    print("   Representation Bias: RedditBias -> N/A")
    print("   Prejudiced Answers: BBQ -> 0.98")
    print("   Biased Completions: BOLD -> 0.74")
    print("   Income Fairness: DecodingTrust -> 0.88")
    print("   Recommendation Consistency: FaiRLLM -> 0.13")
    print("")
    
    print("✅ Mapping logic test completed!")

if __name__ == "__main__":
    test_mapping_logic()
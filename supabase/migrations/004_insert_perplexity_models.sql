-- Migration: Insert Perplexity models and their evaluations
-- Description: Add 4 Perplexity models with launch dates and create evaluations for 5 AI Act principles
-- Date: 2025-01-08

-- Script pour insérer les modèles Perplexity et créer leurs évaluations

DO $$
DECLARE
  v_provider_id INTEGER;
  v_model_sonar_id UUID;
  v_model_sonar_pro_id UUID;
  v_model_sonar_reasoning_id UUID;
  v_model_sonar_deep_research_id UUID;
  v_principle_robustness_id UUID;
  v_principle_privacy_id UUID;
  v_principle_transparency_id UUID;
  v_principle_diversity_id UUID;
  v_principle_wellbeing_id UUID;
BEGIN
  -- 1. Récupérer l'ID du provider Perplexity
  SELECT id INTO v_provider_id 
  FROM model_providers 
  WHERE LOWER(name) = 'perplexity';
  
  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Provider Perplexity not found in model_providers table';
  END IF;
  
  RAISE NOTICE 'Provider Perplexity ID: %', v_provider_id;
  
  -- 2. Récupérer les IDs des 5 principes AI Act
  SELECT id INTO v_principle_robustness_id 
  FROM compl_ai_principles 
  WHERE code = 'technical_robustness_safety';
  
  SELECT id INTO v_principle_privacy_id 
  FROM compl_ai_principles 
  WHERE code = 'privacy_data_governance';
  
  SELECT id INTO v_principle_transparency_id 
  FROM compl_ai_principles 
  WHERE code = 'transparency';
  
  SELECT id INTO v_principle_diversity_id 
  FROM compl_ai_principles 
  WHERE code = 'diversity_non_discrimination_fairness';
  
  SELECT id INTO v_principle_wellbeing_id 
  FROM compl_ai_principles 
  WHERE code = 'social_environmental_wellbeing';
  
  IF v_principle_robustness_id IS NULL OR v_principle_privacy_id IS NULL OR 
     v_principle_transparency_id IS NULL OR v_principle_diversity_id IS NULL OR 
     v_principle_wellbeing_id IS NULL THEN
    RAISE EXCEPTION 'One or more AI Act principles not found';
  END IF;
  
  -- 3. Insérer le modèle Sonar (Standard)
  INSERT INTO compl_ai_models (
    model_name, 
    model_provider, 
    model_type, 
    version,
    short_name,
    long_name,
    launch_date,
    model_provider_id
  ) VALUES (
    'sonar',
    'Perplexity',
    'large-language-model',
    'standard',
    'Sonar',
    'Sonar (Standard)',
    '2025-01-21',
    v_provider_id
  )
  ON CONFLICT (model_name) DO UPDATE 
  SET 
    short_name = EXCLUDED.short_name,
    long_name = EXCLUDED.long_name,
    launch_date = EXCLUDED.launch_date,
    model_provider_id = EXCLUDED.model_provider_id
  RETURNING id INTO v_model_sonar_id;
  
  RAISE NOTICE 'Model Sonar created/updated with ID: %', v_model_sonar_id;
  
  -- 4. Insérer le modèle Sonar Pro
  INSERT INTO compl_ai_models (
    model_name, 
    model_provider, 
    model_type, 
    version,
    short_name,
    long_name,
    launch_date,
    model_provider_id
  ) VALUES (
    'sonar-pro',
    'Perplexity',
    'large-language-model',
    'pro',
    'Sonar Pro',
    'Sonar Pro',
    '2025-01-21',
    v_provider_id
  )
  ON CONFLICT (model_name) DO UPDATE 
  SET 
    short_name = EXCLUDED.short_name,
    long_name = EXCLUDED.long_name,
    launch_date = EXCLUDED.launch_date,
    model_provider_id = EXCLUDED.model_provider_id
  RETURNING id INTO v_model_sonar_pro_id;
  
  RAISE NOTICE 'Model Sonar Pro created/updated with ID: %', v_model_sonar_pro_id;
  
  -- 5. Insérer le modèle Sonar Reasoning
  INSERT INTO compl_ai_models (
    model_name, 
    model_provider, 
    model_type, 
    version,
    short_name,
    long_name,
    launch_date,
    model_provider_id
  ) VALUES (
    'sonar-reasoning',
    'Perplexity',
    'large-language-model',
    'reasoning',
    'Sonar Reasoning',
    'Sonar Reasoning',
    '2025-01-29',
    v_provider_id
  )
  ON CONFLICT (model_name) DO UPDATE 
  SET 
    short_name = EXCLUDED.short_name,
    long_name = EXCLUDED.long_name,
    launch_date = EXCLUDED.launch_date,
    model_provider_id = EXCLUDED.model_provider_id
  RETURNING id INTO v_model_sonar_reasoning_id;
  
  RAISE NOTICE 'Model Sonar Reasoning created/updated with ID: %', v_model_sonar_reasoning_id;
  
  -- 6. Insérer le modèle Sonar Deep Research
  INSERT INTO compl_ai_models (
    model_name, 
    model_provider, 
    model_type, 
    version,
    short_name,
    long_name,
    launch_date,
    model_provider_id
  ) VALUES (
    'sonar-deep-research',
    'Perplexity',
    'large-language-model',
    'deep-research',
    'Sonar Deep Research',
    'Sonar Deep Research',
    '2025-02-14',
    v_provider_id
  )
  ON CONFLICT (model_name) DO UPDATE 
  SET 
    short_name = EXCLUDED.short_name,
    long_name = EXCLUDED.long_name,
    launch_date = EXCLUDED.launch_date,
    model_provider_id = EXCLUDED.model_provider_id
  RETURNING id INTO v_model_sonar_deep_research_id;
  
  RAISE NOTICE 'Model Sonar Deep Research created/updated with ID: %', v_model_sonar_deep_research_id;
  
  -- 7. Créer les évaluations pour chaque modèle (5 principes × 4 modèles = 20 évaluations)
  
  -- Sonar (Standard) - 5 évaluations
  INSERT INTO compl_ai_evaluations (model_id, principle_id, evaluation_date, data_source, rang_compar_ia)
  VALUES 
    (v_model_sonar_id, v_principle_robustness_id, '2025-01-21', 'manual-perplexity', NULL),
    (v_model_sonar_id, v_principle_privacy_id, '2025-01-21', 'manual-perplexity', NULL),
    (v_model_sonar_id, v_principle_transparency_id, '2025-01-21', 'manual-perplexity', NULL),
    (v_model_sonar_id, v_principle_diversity_id, '2025-01-21', 'manual-perplexity', NULL),
    (v_model_sonar_id, v_principle_wellbeing_id, '2025-01-21', 'manual-perplexity', NULL)
  ON CONFLICT DO NOTHING;
  
  -- Sonar Pro - 5 évaluations
  INSERT INTO compl_ai_evaluations (model_id, principle_id, evaluation_date, data_source, rang_compar_ia)
  VALUES 
    (v_model_sonar_pro_id, v_principle_robustness_id, '2025-01-21', 'manual-perplexity', NULL),
    (v_model_sonar_pro_id, v_principle_privacy_id, '2025-01-21', 'manual-perplexity', NULL),
    (v_model_sonar_pro_id, v_principle_transparency_id, '2025-01-21', 'manual-perplexity', NULL),
    (v_model_sonar_pro_id, v_principle_diversity_id, '2025-01-21', 'manual-perplexity', NULL),
    (v_model_sonar_pro_id, v_principle_wellbeing_id, '2025-01-21', 'manual-perplexity', NULL)
  ON CONFLICT DO NOTHING;
  
  -- Sonar Reasoning - 5 évaluations
  INSERT INTO compl_ai_evaluations (model_id, principle_id, evaluation_date, data_source, rang_compar_ia)
  VALUES 
    (v_model_sonar_reasoning_id, v_principle_robustness_id, '2025-01-29', 'manual-perplexity', NULL),
    (v_model_sonar_reasoning_id, v_principle_privacy_id, '2025-01-29', 'manual-perplexity', NULL),
    (v_model_sonar_reasoning_id, v_principle_transparency_id, '2025-01-29', 'manual-perplexity', NULL),
    (v_model_sonar_reasoning_id, v_principle_diversity_id, '2025-01-29', 'manual-perplexity', NULL),
    (v_model_sonar_reasoning_id, v_principle_wellbeing_id, '2025-01-29', 'manual-perplexity', NULL)
  ON CONFLICT DO NOTHING;
  
  -- Sonar Deep Research - 5 évaluations
  INSERT INTO compl_ai_evaluations (model_id, principle_id, evaluation_date, data_source, rang_compar_ia)
  VALUES 
    (v_model_sonar_deep_research_id, v_principle_robustness_id, '2025-02-14', 'manual-perplexity', NULL),
    (v_model_sonar_deep_research_id, v_principle_privacy_id, '2025-02-14', 'manual-perplexity', NULL),
    (v_model_sonar_deep_research_id, v_principle_transparency_id, '2025-02-14', 'manual-perplexity', NULL),
    (v_model_sonar_deep_research_id, v_principle_diversity_id, '2025-02-14', 'manual-perplexity', NULL),
    (v_model_sonar_deep_research_id, v_principle_wellbeing_id, '2025-02-14', 'manual-perplexity', NULL)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Successfully created/updated 4 Perplexity models and 20 evaluations';
  
END $$;







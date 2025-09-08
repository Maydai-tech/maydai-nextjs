-- Script de migration des données existantes pour lier les modèles COMPL-AI
-- Ce script mappe les champs technology_partner et llm_model_version vers primary_model_id

-- Fonction helper pour trouver un modèle COMPL-AI
CREATE OR REPLACE FUNCTION find_compl_ai_model(p_model_name TEXT, p_provider TEXT DEFAULT NULL) 
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    model_id UUID;
BEGIN
    -- Recherche par nom exact et provider
    IF p_provider IS NOT NULL THEN
        SELECT id INTO model_id 
        FROM compl_ai_models 
        WHERE LOWER(model_name) = LOWER(p_model_name) 
        AND LOWER(model_provider) = LOWER(p_provider)
        LIMIT 1;
    END IF;
    
    -- Si pas trouvé, recherche par nom seulement
    IF model_id IS NULL THEN
        SELECT id INTO model_id 
        FROM compl_ai_models 
        WHERE LOWER(model_name) LIKE '%' || LOWER(p_model_name) || '%'
        LIMIT 1;
    END IF;
    
    -- Si toujours pas trouvé, recherche par provider seulement
    IF model_id IS NULL AND p_provider IS NOT NULL THEN
        SELECT id INTO model_id 
        FROM compl_ai_models 
        WHERE LOWER(model_provider) = LOWER(p_provider)
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN model_id;
END;
$$;

-- Mapping Anthropic Claude
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('Claude-3-Opus', 'Anthropic')
WHERE (
    LOWER(technology_partner) LIKE '%anthropic%' 
    OR LOWER(llm_model_version) LIKE '%claude%'
    OR LOWER(llm_model_version) LIKE '%opus%'
)
AND primary_model_id IS NULL;

-- Mapping OpenAI GPT-4
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('GPT-4', 'OpenAI')
WHERE (
    LOWER(technology_partner) LIKE '%openai%' 
    OR LOWER(llm_model_version) LIKE '%gpt-4%'
)
AND primary_model_id IS NULL;

-- Mapping OpenAI GPT-3.5
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('GPT-3.5', 'OpenAI')
WHERE (
    LOWER(technology_partner) LIKE '%openai%' 
    OR LOWER(llm_model_version) LIKE '%gpt-3.5%'
    OR LOWER(llm_model_version) LIKE '%gpt-3%'
)
AND primary_model_id IS NULL;

-- Mapping Google Gemini
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('Gemini', 'Google')
WHERE (
    LOWER(technology_partner) LIKE '%google%' 
    OR LOWER(llm_model_version) LIKE '%gemini%'
)
AND primary_model_id IS NULL;

-- Mapping Mistral
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('Mistral', 'Mistral')
WHERE (
    LOWER(technology_partner) LIKE '%mistral%' 
    OR LOWER(llm_model_version) LIKE '%mistral%'
)
AND primary_model_id IS NULL;

-- Nettoyage de la fonction temporaire
DROP FUNCTION find_compl_ai_model(TEXT, TEXT);

-- Vérification des mappings
SELECT 
    COUNT(*) as total_usecases,
    COUNT(primary_model_id) as mapped_usecases,
    ROUND(COUNT(primary_model_id)::numeric / COUNT(*)::numeric * 100, 2) as mapping_percentage
FROM usecases;
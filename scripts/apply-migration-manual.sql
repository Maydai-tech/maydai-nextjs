-- Script de migration manuel à exécuter dans Supabase SQL Editor
-- Ce script ajoute la colonne primary_model_id et lie les données existantes

-- 1. Vérifier si la colonne existe déjà
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usecases' 
        AND column_name = 'primary_model_id'
    ) THEN
        -- Ajouter la colonne primary_model_id
        ALTER TABLE usecases 
        ADD COLUMN primary_model_id UUID REFERENCES compl_ai_models(id) ON DELETE SET NULL;
        
        -- Ajouter l'index pour les performances
        CREATE INDEX idx_usecases_primary_model_id ON usecases(primary_model_id);
        
        RAISE NOTICE 'Colonne primary_model_id ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne primary_model_id existe déjà';
    END IF;
END $$;

-- 2. Fonction temporaire pour trouver un modèle COMPL-AI
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

-- 3. Mapping des modèles existants
-- Anthropic Claude
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('Claude-3-Opus', 'Anthropic')
WHERE (
    LOWER(technology_partner) LIKE '%anthropic%' 
    OR LOWER(llm_model_version) LIKE '%claude%'
    OR LOWER(llm_model_version) LIKE '%opus%'
)
AND primary_model_id IS NULL;

-- OpenAI GPT-4
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('GPT-4', 'OpenAI')
WHERE (
    LOWER(technology_partner) LIKE '%openai%' 
    OR LOWER(llm_model_version) LIKE '%gpt-4%'
)
AND primary_model_id IS NULL;

-- OpenAI GPT-3.5
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('GPT-3.5', 'OpenAI')
WHERE (
    LOWER(technology_partner) LIKE '%openai%' 
    OR LOWER(llm_model_version) LIKE '%gpt-3.5%'
    OR LOWER(llm_model_version) LIKE '%gpt-3%'
)
AND primary_model_id IS NULL;

-- Google Gemini
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('Gemini', 'Google')
WHERE (
    LOWER(technology_partner) LIKE '%google%' 
    OR LOWER(llm_model_version) LIKE '%gemini%'
)
AND primary_model_id IS NULL;

-- Mistral
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('Mistral', 'Mistral')
WHERE (
    LOWER(technology_partner) LIKE '%mistral%' 
    OR LOWER(llm_model_version) LIKE '%mistral%'
)
AND primary_model_id IS NULL;

-- 4. Nettoyage de la fonction temporaire
DROP FUNCTION find_compl_ai_model(TEXT, TEXT);

-- 5. Vérification des mappings
SELECT 
    COUNT(*) as total_usecases,
    COUNT(primary_model_id) as mapped_usecases,
    ROUND(COUNT(primary_model_id)::numeric / COUNT(*)::numeric * 100, 2) as mapping_percentage
FROM usecases;

-- 6. Afficher quelques exemples de mappings réussis
SELECT 
    u.name as usecase_name,
    u.technology_partner,
    u.llm_model_version,
    m.model_name,
    m.model_provider
FROM usecases u
LEFT JOIN compl_ai_models m ON u.primary_model_id = m.id
WHERE u.primary_model_id IS NOT NULL
LIMIT 10;


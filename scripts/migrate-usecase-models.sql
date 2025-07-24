-- Script de migration des données existantes
-- Mapper les champs technology_partner et llm_model_version vers primary_model_id
-- Date: 2025-07-24

-- 1. Afficher les données à migrer pour vérification
SELECT 
  u.id,
  u.name,
  u.technology_partner,
  u.llm_model_version,
  u.primary_model_id,
  -- Tentative de match avec les modèles existants
  m.id as potential_model_id,
  m.model_name,
  m.model_provider
FROM usecases u
LEFT JOIN compl_ai_models m ON (
  -- Essai de match basique par nom de modèle
  LOWER(u.llm_model_version) LIKE '%' || LOWER(m.model_name) || '%'
  OR LOWER(m.model_name) LIKE '%' || LOWER(u.llm_model_version) || '%'
)
WHERE u.primary_model_id IS NULL
  AND (u.technology_partner IS NOT NULL OR u.llm_model_version IS NOT NULL)
ORDER BY u.name, m.model_name;

-- 2. Mappings spécifiques basés sur les patterns courants
-- Ces UPDATE devront être adaptés selon vos données réelles

-- Mapping OpenAI GPT-4
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('GPT-4', 'OpenAI')
WHERE primary_model_id IS NULL
  AND (
    LOWER(technology_partner) LIKE '%openai%' 
    OR LOWER(llm_model_version) LIKE '%gpt-4%'
    OR LOWER(llm_model_version) LIKE '%gpt4%'
  )
  AND find_compl_ai_model('GPT-4', 'OpenAI') IS NOT NULL;

-- Mapping OpenAI GPT-3.5
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('GPT-3.5', 'OpenAI')
WHERE primary_model_id IS NULL
  AND (
    LOWER(technology_partner) LIKE '%openai%' 
    OR LOWER(llm_model_version) LIKE '%gpt-3.5%'
    OR LOWER(llm_model_version) LIKE '%gpt3.5%'
  )
  AND find_compl_ai_model('GPT-3.5', 'OpenAI') IS NOT NULL;

-- Mapping Anthropic Claude
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('Claude', 'Anthropic')
WHERE primary_model_id IS NULL
  AND (
    LOWER(technology_partner) LIKE '%anthropic%' 
    OR LOWER(llm_model_version) LIKE '%claude%'
  )
  AND find_compl_ai_model('Claude', 'Anthropic') IS NOT NULL;

-- Mapping Google Gemini
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('Gemini', 'Google')
WHERE primary_model_id IS NULL
  AND (
    LOWER(technology_partner) LIKE '%google%' 
    OR LOWER(llm_model_version) LIKE '%gemini%'
  )
  AND find_compl_ai_model('Gemini', 'Google') IS NOT NULL;

-- Mapping Microsoft/Azure OpenAI
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('GPT-4', 'OpenAI')
WHERE primary_model_id IS NULL
  AND (
    LOWER(technology_partner) LIKE '%microsoft%' 
    OR LOWER(technology_partner) LIKE '%azure%'
  )
  AND LOWER(llm_model_version) LIKE '%gpt%'
  AND find_compl_ai_model('GPT-4', 'OpenAI') IS NOT NULL;

-- 3. Rapport de migration
SELECT 
  'Migration Summary' as report_type,
  COUNT(*) as total_usecases,
  COUNT(primary_model_id) as mapped_usecases,
  COUNT(*) - COUNT(primary_model_id) as unmapped_usecases,
  ROUND(COUNT(primary_model_id)::numeric / COUNT(*)::numeric * 100, 1) as mapping_percentage
FROM usecases;

-- 4. Détails des cas non mappés
SELECT 
  'Unmapped UseCases' as report_type,
  u.id,
  u.name,
  u.technology_partner,
  u.llm_model_version
FROM usecases u
WHERE u.primary_model_id IS NULL
  AND (u.technology_partner IS NOT NULL OR u.llm_model_version IS NOT NULL)
ORDER BY u.name;

-- 5. Détails des mappings réalisés
SELECT 
  'Successful Mappings' as report_type,
  u.id,
  u.name,
  u.technology_partner,
  u.llm_model_version,
  m.model_name,
  m.model_provider
FROM usecases u
JOIN compl_ai_models m ON u.primary_model_id = m.id
ORDER BY m.model_provider, m.model_name, u.name;
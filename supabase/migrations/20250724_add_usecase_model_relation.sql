-- Migration: Ajouter relation between usecase et compl_ai_models
-- Date: 2025-07-24
-- Description: Ajoute une Foreign Key primary_model_id vers compl_ai_models pour remplacer les champs textuels

-- Ajouter la colonne de référence vers compl_ai_models
ALTER TABLE usecases 
ADD COLUMN primary_model_id UUID REFERENCES compl_ai_models(id) ON DELETE SET NULL;

-- Ajouter un commentaire sur la colonne pour documentation
COMMENT ON COLUMN usecases.primary_model_id IS 'Référence vers le modèle COMPL-AI principal utilisé par ce cas d''usage';

-- Index pour améliorer les performances des jointures
CREATE INDEX IF NOT EXISTS idx_usecases_primary_model_id ON usecases(primary_model_id);

-- Ajouter une vue pour faciliter les requêtes avec le modèle
CREATE OR REPLACE VIEW usecases_with_model AS
SELECT 
  u.*,
  m.model_name,
  m.model_provider,
  m.model_type,
  m.version as model_version
FROM usecases u
LEFT JOIN compl_ai_models m ON u.primary_model_id = m.id;

-- Commentaire sur la vue
COMMENT ON VIEW usecases_with_model IS 'Vue simplifiée des cas d''usage avec informations du modèle COMPL-AI associé';

-- Fonction helper pour trouver un modèle par nom et provider
CREATE OR REPLACE FUNCTION find_compl_ai_model(
  p_model_name TEXT,
  p_provider TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  model_id UUID;
BEGIN
  -- Recherche exacte avec provider si fourni
  IF p_provider IS NOT NULL THEN
    SELECT id INTO model_id 
    FROM compl_ai_models 
    WHERE LOWER(model_name) = LOWER(p_model_name) 
      AND LOWER(model_provider) = LOWER(p_provider)
    LIMIT 1;
  END IF;
  
  -- Si pas trouvé ou pas de provider, recherche par nom seulement
  IF model_id IS NULL THEN
    SELECT id INTO model_id 
    FROM compl_ai_models 
    WHERE LOWER(model_name) LIKE '%' || LOWER(p_model_name) || '%'
    ORDER BY 
      CASE WHEN LOWER(model_name) = LOWER(p_model_name) THEN 1 ELSE 2 END,
      created_at DESC
    LIMIT 1;
  END IF;
  
  RETURN model_id;
END;
$$ LANGUAGE plpgsql;

-- Commentaire sur la fonction
COMMENT ON FUNCTION find_compl_ai_model(TEXT, TEXT) IS 'Fonction helper pour retrouver l''ID d''un modèle COMPL-AI par nom et optionnellement provider';
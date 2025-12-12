-- Migration: Add metadata fields to compl_ai_models and new score field to compl_ai_evaluations
-- Description: Add short_name, long_name, launch_date to models and rang_compar_ia score to evaluations
-- Date: 2025-01-08

-- 1. Add metadata columns to compl_ai_models table
ALTER TABLE compl_ai_models 
ADD COLUMN IF NOT EXISTS short_name TEXT,
ADD COLUMN IF NOT EXISTS long_name TEXT,
ADD COLUMN IF NOT EXISTS launch_date DATE,
ADD COLUMN IF NOT EXISTS model_provider_id INTEGER REFERENCES model_providers(id);

-- 2. Add rang_compar_ia score column to compl_ai_evaluations table
ALTER TABLE compl_ai_evaluations 
ADD COLUMN IF NOT EXISTS rang_compar_ia NUMERIC;

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_compl_ai_models_launch_date ON compl_ai_models(launch_date);
CREATE INDEX IF NOT EXISTS idx_compl_ai_models_provider_id ON compl_ai_models(model_provider_id);
CREATE INDEX IF NOT EXISTS idx_compl_ai_evaluations_rang_compar_ia ON compl_ai_evaluations(rang_compar_ia) WHERE rang_compar_ia IS NOT NULL;

-- 4. Add comments to document the columns
COMMENT ON COLUMN compl_ai_models.short_name IS 'Nom court du modèle (ex: "Sonar")';
COMMENT ON COLUMN compl_ai_models.long_name IS 'Nom long/complet du modèle (ex: "Sonar Standard")';
COMMENT ON COLUMN compl_ai_models.launch_date IS 'Date de lancement officiel du modèle';
COMMENT ON COLUMN compl_ai_models.model_provider_id IS 'Référence au fournisseur dans la table model_providers';
COMMENT ON COLUMN compl_ai_evaluations.rang_compar_ia IS 'Score Rang Compar:IA (échelle 0-20), saisie manuelle pour sources alternatives';

-- 5. Add constraint to ensure rang_compar_ia is between 0 and 20 if provided
ALTER TABLE compl_ai_evaluations 
ADD CONSTRAINT IF NOT EXISTS check_rang_compar_ia_range 
CHECK (rang_compar_ia IS NULL OR (rang_compar_ia >= 0 AND rang_compar_ia <= 20));








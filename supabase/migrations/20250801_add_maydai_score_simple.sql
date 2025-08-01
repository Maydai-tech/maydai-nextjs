-- Migration: Ajouter le score MaydAI aux évaluations COMPL-AI (approche simple)
-- Date: 2025-08-01
-- Description: Ajoute uniquement une colonne maydai_score, toute la logique sera dans Next.js

-- Ajouter la colonne maydai_score à compl_ai_evaluations
ALTER TABLE compl_ai_evaluations 
ADD COLUMN IF NOT EXISTS maydai_score DECIMAL(4,3) DEFAULT NULL;

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN compl_ai_evaluations.maydai_score IS 'Score MaydAI normalisé calculé par Next.js : chaque principe vaut 4 points max, répartis entre benchmarks valides (ignore les N/A)';

-- Index pour améliorer les performances des requêtes sur les scores MaydAI
CREATE INDEX IF NOT EXISTS idx_compl_ai_evaluations_maydai_score ON compl_ai_evaluations(maydai_score) WHERE maydai_score IS NOT NULL;

-- Index composite pour requêtes par modèle et principe avec score MaydAI
CREATE INDEX IF NOT EXISTS idx_compl_ai_evaluations_model_principle_maydai ON compl_ai_evaluations(model_id, principle_id, maydai_score) WHERE maydai_score IS NOT NULL;
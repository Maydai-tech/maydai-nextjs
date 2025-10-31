-- Migration: Ajout de la colonne max_storage_mb à la table plans
-- Date: 2025-10-31
-- Description: Ajoute une colonne pour stocker la limite de stockage en Mo pour chaque plan

-- Ajouter la colonne max_storage_mb (en Mo)
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS max_storage_mb INTEGER NOT NULL DEFAULT 250;

-- Commentaire sur la colonne
COMMENT ON COLUMN plans.max_storage_mb IS 'Limite de stockage en mégaoctets (Mo) pour ce plan';


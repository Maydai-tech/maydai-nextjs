-- Migration: Add sub_category_id to profiles table
-- This migration adds a new column to store the sub-category ID for the custom industry classification
-- The column is nullable to allow backward compatibility with existing profiles
--
-- INSTRUCTIONS :
-- 1. Copier ce script dans Supabase Dashboard > SQL Editor
-- 2. Cliquer sur "Run" pour exécuter
-- 3. Vérifier qu'il n'y a pas d'erreur
-- 4. Exécuter ensuite le script verify_sub_category_id.sql pour confirmer

-- Add sub_category_id column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS sub_category_id TEXT;

-- Add comment to document the column
COMMENT ON COLUMN profiles.sub_category_id IS 'Sub-category ID from the custom industry classification (Mayday Industries). Nullable for backward compatibility with existing NAF-based profiles.';

-- Afficher un message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Migration terminée : colonne sub_category_id ajoutée à la table profiles';
END $$;

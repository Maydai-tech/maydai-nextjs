-- ==========================================
-- MIGRATION UP
-- ==========================================

-- 1. Table: profiles (Score Compte)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completeness_score integer DEFAULT 0;

-- 2. Table: companies (Score Registre)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS storage text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_centralized_registry boolean DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS completeness_score integer DEFAULT 0;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS siren text;

-- 3. Backfill des données existantes (Rétrocompatibilité)
DO $$
BEGIN
  UPDATE public.companies
  SET is_centralized_registry = COALESCE(maydai_as_registry, false)
  WHERE is_centralized_registry IS DISTINCT FROM COALESCE(maydai_as_registry, false);
END $$;

-- 4. Fallbacks stricts pour garantir l'absence de null
UPDATE public.profiles SET completeness_score = 0 WHERE completeness_score IS NULL;
UPDATE public.companies SET completeness_score = 0 WHERE completeness_score IS NULL;
UPDATE public.companies SET is_centralized_registry = false WHERE is_centralized_registry IS NULL;

-- ==========================================
-- MIGRATION DOWN
-- ==========================================
/*
ALTER TABLE public.profiles DROP COLUMN IF EXISTS completeness_score;

ALTER TABLE public.companies DROP COLUMN IF EXISTS completeness_score;
ALTER TABLE public.companies DROP COLUMN IF EXISTS is_centralized_registry;
ALTER TABLE public.companies DROP COLUMN IF EXISTS storage;
ALTER TABLE public.companies DROP COLUMN IF EXISTS siren;
*/

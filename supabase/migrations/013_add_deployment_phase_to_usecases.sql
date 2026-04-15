BEGIN;

-- 1. Ajout de la colonne (Nullable d'abord pour l'existant)
ALTER TABLE public.usecases 
ADD COLUMN IF NOT EXISTS deployment_phase text;

-- 2. Backfill (On force une valeur par défaut pour les anciens cas d'usage)
UPDATE public.usecases 
SET deployment_phase = 'en_projet' 
WHERE deployment_phase IS NULL;

-- 3. Sécurisation : On rend la colonne obligatoire pour l'avenir
ALTER TABLE public.usecases 
ALTER COLUMN deployment_phase SET NOT NULL;

COMMIT;
-- Migration UP
ALTER TABLE public.usecase_responses 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Migration DOWN (Commenté pour référence de rollback)
-- ALTER TABLE public.usecase_responses DROP COLUMN IF EXISTS metadata;

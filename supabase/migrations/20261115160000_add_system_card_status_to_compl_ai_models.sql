-- UP Migration: Add system_card_status to compl_ai_models
ALTER TABLE public.compl_ai_models
ADD COLUMN IF NOT EXISTS system_card_status text NOT NULL DEFAULT 'missing';

ALTER TABLE public.compl_ai_models
DROP CONSTRAINT IF EXISTS compl_ai_models_system_card_status_check;

ALTER TABLE public.compl_ai_models
ADD CONSTRAINT compl_ai_models_system_card_status_check
CHECK (system_card_status IN ('generated', 'missing', 'error_no_system_card'));

-- Backfill: Mark models that already have an entry in llm_system_cards as 'generated'
UPDATE public.compl_ai_models
SET system_card_status = 'generated'
WHERE slug IN (
  SELECT TRIM(model_identifier)
  FROM public.llm_system_cards
  WHERE model_identifier IS NOT NULL
    AND TRIM(model_identifier) <> ''
);

-- DOWN Migration (Rollback reference):
-- ALTER TABLE public.compl_ai_models DROP CONSTRAINT IF EXISTS compl_ai_models_system_card_status_check;
-- ALTER TABLE public.compl_ai_models DROP COLUMN IF EXISTS system_card_status;

NOTIFY pgrst, 'reload schema';

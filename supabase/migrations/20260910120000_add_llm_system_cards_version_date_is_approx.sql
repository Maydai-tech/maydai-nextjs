-- Jour interpolé (placeholder XX/xx/??) pour le garde-fou anti-régression.
ALTER TABLE public.llm_system_cards
  ADD COLUMN IF NOT EXISTS card_version_date_is_approx BOOLEAN NOT NULL DEFAULT false;

UPDATE public.llm_system_cards
  SET card_version_date_is_approx = false
  WHERE card_version_date_is_approx IS NULL;

ALTER TABLE public.llm_system_cards
  ALTER COLUMN card_version_date_is_approx SET DEFAULT false;

ALTER TABLE public.llm_system_cards
  ALTER COLUMN card_version_date_is_approx SET NOT NULL;

COMMENT ON COLUMN public.llm_system_cards.card_version_date_is_approx IS
  'true si le jour de card_version_date a été interpolé (placeholder XX, xx ou ?? dans le nom du fichier).';

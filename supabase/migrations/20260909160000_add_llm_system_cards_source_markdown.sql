-- Contenu Markdown brut importé depuis Drive (Tour de contrôle / Hermes).
ALTER TABLE public.llm_system_cards
  ADD COLUMN IF NOT EXISTS source_markdown TEXT;

COMMENT ON COLUMN public.llm_system_cards.source_markdown IS
  'Texte Markdown de la fiche technique importée depuis Google Drive.';

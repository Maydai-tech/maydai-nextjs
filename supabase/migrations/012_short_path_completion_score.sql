-- Parcours court V3 : distinction score initial court vs score complet long (status completed inchangé pour le long).
ALTER TABLE public.usecases
  ADD COLUMN IF NOT EXISTS short_path_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS short_path_initial_score INTEGER;

COMMENT ON COLUMN public.usecases.short_path_completed_at IS 'Horodatage de fin du parcours court V3 (≠ cas complété parcours long).';
COMMENT ON COLUMN public.usecases.short_path_initial_score IS 'Score final % calculé sur le périmètre actif du parcours court V3 uniquement.';

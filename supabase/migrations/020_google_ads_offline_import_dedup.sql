-- Déduplication des imports Google Ads (uploadClickConversions) par identifiant de clic.
-- Évite plusieurs envois API pour le même gclid / click_id sur une même action de conversion.

CREATE TABLE IF NOT EXISTS public.google_ads_offline_import_dedup (
  click_id text NOT NULL,
  conversion_action_name text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (click_id, conversion_action_name)
);

COMMENT ON TABLE public.google_ads_offline_import_dedup IS
  'Un enregistrement par couple (click_id, action) après un import réussi ou réservé avant envoi API.';
COMMENT ON COLUMN public.google_ads_offline_import_dedup.click_id IS
  'GCLID ou click_id normalisé (trim).';
COMMENT ON COLUMN public.google_ads_offline_import_dedup.conversion_action_name IS
  'Nom exact de conversion_action dans Google Ads (ex. hors connexion (importation)).';

ALTER TABLE public.google_ads_offline_import_dedup ENABLE ROW LEVEL SECURITY;

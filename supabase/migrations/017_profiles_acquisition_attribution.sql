-- Attribution Ads / campagne au moment de l'inscription (offline + reporting)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;

COMMENT ON COLUMN public.profiles.gclid IS 'Google Click ID capturé avant inscription (conversions hors ligne)';
COMMENT ON COLUMN public.profiles.utm_source IS 'UTM source capturée avant inscription';
COMMENT ON COLUMN public.profiles.utm_medium IS 'UTM medium capturée avant inscription';
COMMENT ON COLUMN public.profiles.utm_campaign IS 'UTM campaign capturée avant inscription';

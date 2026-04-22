-- Attribution omnicanale (Google / Meta / Microsoft / trafic direct UTM)
-- La colonne `source` existait déjà ; valeurs attendues côté app : google_ads_form, website_direct, facebook_ads, linkedin_ads, etc.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS click_id text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;

COMMENT ON COLUMN public.leads.source IS 'Canal d''acquisition (ex: google_ads_form, website_direct, facebook_ads, linkedin_ads).';
COMMENT ON COLUMN public.leads.click_id IS 'Identifiant de clic publicitaire générique (gclid, fbclid, msclkid, ttclid, etc.).';
COMMENT ON COLUMN public.leads.utm_source IS 'UTM source (trafic direct / campagnes).';
COMMENT ON COLUMN public.leads.utm_medium IS 'UTM medium.';
COMMENT ON COLUMN public.leads.utm_campaign IS 'UTM campaign.';

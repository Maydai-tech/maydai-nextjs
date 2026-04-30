-- Migration: Align companies industry schema with profiles
-- Goal:
-- 1) Add companies.sub_category_id (TEXT, nullable)
-- 2) Clarify semantics: companies.industry now stores the *industry ID* (same as profiles.industry),
--    not free text anymore.
--
-- Backward compatibility:
-- - Existing companies.industry values may contain legacy free-text labels.
-- - We cannot safely map them to IDs in pure SQL.
-- - This migration performs a conservative cleanup:
--     - empty/blank strings -> NULL
--     - values that are not a known industry ID -> NULL
-- - A one-off TypeScript script can later attempt fuzzy mapping (optional).

-- 1) Add sub_category_id column (nullable for retrocompatibility)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS sub_category_id TEXT;

COMMENT ON COLUMN public.companies.sub_category_id IS
  'Sub-category ID from the custom industry classification (Mayday Industries). Nullable for backward compatibility.';

COMMENT ON COLUMN public.companies.industry IS
  'Industry family ID (Mayday Industries). Historically free text; cleaned to IDs/NULL by migrations.';

-- 2) Conservative data cleanup for companies.industry
-- NOTE: Keep this list in sync with `lib/constants/industries.ts` (INDUSTRIES_LIST[].id).
-- Current known IDs:
--   tech_data, finance, health, industry, retail_media, public_rh, services, construction_transport
-- If additional IDs are added later, extend the IN (...) list accordingly.

-- Normalize blanks to NULL
UPDATE public.companies
SET industry = NULL
WHERE industry IS NOT NULL
  AND btrim(industry) = '';

-- Null out legacy free-text values that are not valid IDs.
UPDATE public.companies
SET industry = NULL
WHERE industry IS NOT NULL
  AND btrim(industry) <> ''
  AND btrim(industry) NOT IN (
    'tech_data',
    'finance',
    'health',
    'industry',
    'retail_media',
    'public_rh',
    'services',
    'construction_transport'
  );


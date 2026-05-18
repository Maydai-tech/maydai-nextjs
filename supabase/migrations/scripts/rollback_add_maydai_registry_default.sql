-- Migration DOWN: retire le default de maydai_as_registry sur companies
ALTER TABLE public.companies ALTER COLUMN maydai_as_registry DROP DEFAULT;
